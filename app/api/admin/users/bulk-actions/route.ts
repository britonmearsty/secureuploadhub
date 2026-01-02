import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['changeRole', 'changeStatus', 'delete']),
  userIds: z.array(z.string()).min(1).max(100), // Limit to 100 users at once
  data: z.object({
    role: z.enum(['user', 'admin']).optional(),
    status: z.enum(['active', 'disabled']).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userIds, data } = bulkActionSchema.parse(body);

    // Prevent actions on self
    if (session.user.id && userIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'Cannot perform bulk actions on your own account' },
        { status: 400 }
      );
    }

    let results: any = {};

    switch (action) {
      case 'changeRole':
        if (!data?.role) {
          return NextResponse.json(
            { error: 'Role is required for role change action' },
            { status: 400 }
          );
        }

        const roleUpdateResult = await prisma.user.updateMany({
          where: {
            id: { in: userIds }
          },
          data: {
            role: data.role
          }
        });

        results = {
          action: 'changeRole',
          affected: roleUpdateResult.count,
          newRole: data.role
        };
        break;

      case 'changeStatus':
        if (!data?.status) {
          return NextResponse.json(
            { error: 'Status is required for status change action' },
            { status: 400 }
          );
        }

        // If disabling users, also invalidate their sessions
        if (data.status === 'disabled') {
          await prisma.session.deleteMany({
            where: {
              userId: { in: userIds }
            }
          });
        }

        const statusUpdateResult = await prisma.user.updateMany({
          where: {
            id: { in: userIds }
          },
          data: {
            status: data.status
          }
        });

        results = {
          action: 'changeStatus',
          affected: statusUpdateResult.count,
          newStatus: data.status
        };
        break;

      case 'delete':
        // Get user data before deletion for audit
        const usersToDelete = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            _count: {
              select: {
                uploadPortals: true,
                fileUploads: true
              }
            }
          }
        });

        // Perform bulk deletion with cleanup
        await prisma.$transaction(async (tx) => {
          // Delete related data for all users
          await tx.fileUpload.deleteMany({
            where: { userId: { in: userIds } }
          });

          await tx.uploadPortal.deleteMany({
            where: { userId: { in: userIds } }
          });

          await tx.subscription.deleteMany({
            where: { userId: { in: userIds } }
          });

          await tx.payment.deleteMany({
            where: { userId: { in: userIds } }
          });

          await tx.syncSettings.deleteMany({
            where: { userId: { in: userIds } }
          });

          await tx.account.deleteMany({
            where: { userId: { in: userIds } }
          });

          await tx.session.deleteMany({
            where: { userId: { in: userIds } }
          });

          // Finally delete the users
          await tx.user.deleteMany({
            where: { id: { in: userIds } }
          });
        });

        results = {
          action: 'delete',
          affected: usersToDelete.length,
          deletedUsers: usersToDelete.map(u => ({
            id: u.id,
            email: u.email,
            portalsDeleted: u._count.uploadPortals,
            uploadsDeleted: u._count.fileUploads
          }))
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // TODO: Add audit log entries for bulk actions
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: `BULK_${action.toUpperCase()}`,
    //   resource: 'user',
    //   resourceId: 'bulk',
    //   details: { userIds, ...results }
    // });

    return NextResponse.json({
      success: true,
      results,
      message: `Bulk ${action} completed successfully`
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}