import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { sendPortalTransferNotification } from '@/lib/email-templates';

const transferSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
  notifyUsers: z.boolean().default(true)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: portalId } = await params;
    const body = await request.json();
    const { newOwnerId, notifyUsers } = transferSchema.parse(body);

    // Check if portal exists
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!portal) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Check if new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true
      }
    });

    if (!newOwner) {
      return NextResponse.json({ error: 'New owner not found' }, { status: 404 });
    }

    if (newOwner.status === 'disabled') {
      return NextResponse.json(
        { error: 'Cannot transfer portal to disabled user' },
        { status: 400 }
      );
    }

    // Check if it's the same owner
    if (portal.userId === newOwnerId) {
      return NextResponse.json(
        { error: 'Portal is already owned by this user' },
        { status: 400 }
      );
    }

    // Check new owner's plan limits
    const newOwnerSubscription = await prisma.subscription.findFirst({
      where: {
        userId: newOwnerId,
        status: 'active'
      },
      include: {
        plan: true
      }
    });

    // Count new owner's current portals
    const currentPortalCount = await prisma.uploadPortal.count({
      where: { userId: newOwnerId }
    });

    // Check if new owner can accept another portal
    const maxPortals = newOwnerSubscription?.plan?.maxPortals || 1; // Default to free plan limit
    if (currentPortalCount >= maxPortals) {
      return NextResponse.json(
        { error: `New owner has reached their portal limit (${maxPortals})` },
        { status: 400 }
      );
    }

    // Perform the transfer
    const updatedPortal = await prisma.uploadPortal.update({
      where: { id: portalId },
      data: {
        userId: newOwnerId,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // Send notifications if requested
    if (notifyUsers) {
      try {
        // Notify old owner
        await sendPortalTransferNotification({
          to: portal.user.email,
          name: portal.user.name || 'User',
          portalName: portal.name,
          newOwnerName: newOwner.name || newOwner.email,
          isOldOwner: true
        });

        // Notify new owner
        await sendPortalTransferNotification({
          to: newOwner.email,
          name: newOwner.name || 'User',
          portalName: portal.name,
          oldOwnerName: portal.user.name || portal.user.email,
          isOldOwner: false
        });
      } catch (emailError) {
        console.error('Failed to send transfer notifications:', emailError);
        // Don't fail the transfer if email fails
      }
    }

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'PORTAL_TRANSFERRED',
    //   resource: 'portal',
    //   resourceId: portalId,
    //   details: {
    //     portalName: portal.name,
    //     oldOwnerId: portal.userId,
    //     oldOwnerEmail: portal.user.email,
    //     newOwnerId,
    //     newOwnerEmail: newOwner.email,
    //     notificationsSent: notifyUsers
    //   }
    // });

    return NextResponse.json({
      success: true,
      portal: updatedPortal,
      message: `Portal transferred to ${newOwner.name || newOwner.email} successfully`
    });

  } catch (error) {
    console.error('Error transferring portal:', error);
    return NextResponse.json(
      { error: 'Failed to transfer portal' },
      { status: 500 }
    );
  }
}