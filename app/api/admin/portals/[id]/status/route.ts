import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const statusChangeSchema = z.object({
  isActive: z.boolean(),
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

    const { id } = await params;
    const body = await request.json();
    const { isActive } = statusChangeSchema.parse(body);

    // Check if portal exists
    const portal = await prisma.uploadPortal.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, isActive: true }
    });

    if (!portal) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Update portal status
    const updatedPortal = await prisma.uploadPortal.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'PORTAL_STATUS_CHANGED',
    //   resource: 'portal',
    //   resourceId: id,
    //   details: { 
    //     oldStatus: portal.isActive, 
    //     newStatus: isActive,
    //     portalName: portal.name
    //   }
    // });

    return NextResponse.json({
      success: true,
      portal: updatedPortal,
      message: `Portal ${isActive ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error changing portal status:', error);
    return NextResponse.json(
      { error: 'Failed to change portal status' },
      { status: 500 }
    );
  }
}