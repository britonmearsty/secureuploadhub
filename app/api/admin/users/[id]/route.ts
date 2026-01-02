import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists and get their data for cleanup
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        uploadPortals: true,
        fileUploads: true,
        subscriptions: true,
        _count: {
          select: {
            uploadPortals: true,
            fileUploads: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Start transaction for complete cleanup
    await prisma.$transaction(async (tx) => {
      // Delete user's file uploads
      await tx.fileUpload.deleteMany({
        where: { userId: id }
      });

      // Delete user's chunked uploads (through portals)
      await tx.chunkedUpload.deleteMany({
        where: { 
          portal: {
            userId: id
          }
        }
      });

      // Delete user's upload portals
      await tx.uploadPortal.deleteMany({
        where: { userId: id }
      });

      // Delete user's subscriptions
      await tx.subscription.deleteMany({
        where: { userId: id }
      });

      // Delete user's payments
      await tx.payment.deleteMany({
        where: { userId: id }
      });

      // Delete user's sync settings
      await tx.syncSettings.deleteMany({
        where: { userId: id }
      });

      // Delete user's accounts (OAuth)
      await tx.account.deleteMany({
        where: { userId: id }
      });

      // Delete user's sessions
      await tx.session.deleteMany({
        where: { userId: id }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id }
      });
    });

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'USER_DELETED',
    //   resource: 'user',
    //   resourceId: id,
    //   details: { 
    //     email: user.email,
    //     portalsDeleted: user._count.uploadPortals,
    //     uploadsDeleted: user._count.fileUploads
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
      deletedData: {
        portals: user._count.uploadPortals,
        uploads: user._count.fileUploads
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            uploadPortals: true,
            fileUploads: true,
            subscriptions: true
          }
        },
        subscriptions: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                name: true,
                price: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}