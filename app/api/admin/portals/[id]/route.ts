import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit-log';

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

    const portal = await prisma.uploadPortal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        _count: {
          select: {
            uploads: true,
            chunkedUploads: true
          }
        }
      }
    });

    if (!portal) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Get detailed upload statistics
    const uploadStats = await prisma.fileUpload.groupBy({
      by: ['status'],
      where: { portalId: id },
      _count: { status: true },
      _sum: { fileSize: true }
    });

    const stats = {
      totalUploads: uploadStats.reduce((acc, stat) => acc + stat._count.status, 0),
      byStatus: uploadStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>),
      totalSize: uploadStats.reduce((acc, stat) => acc + (stat._sum.fileSize || 0), 0)
    };

    // Get recent uploads
    const recentUploads = await prisma.fileUpload.findMany({
      where: { portalId: id },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        status: true,
        clientName: true,
        clientEmail: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      portal: {
        ...portal,
        stats,
        recentUploads
      }
    });

  } catch (error) {
    console.error('Error fetching portal details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal details' },
      { status: 500 }
    );
  }
}

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

    // Check if portal exists and get file count
    const portal = await prisma.uploadPortal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        _count: {
          select: {
            uploads: true,
            chunkedUploads: true
          }
        }
      }
    });

    if (!portal) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Delete portal and all associated data
    await prisma.$transaction(async (tx) => {
      // Delete file uploads
      await tx.fileUpload.deleteMany({
        where: { portalId: id }
      });

      // Delete chunked uploads
      await tx.chunkedUpload.deleteMany({
        where: { portalId: id }
      });

      // Delete the portal
      await tx.uploadPortal.delete({
        where: { id }
      });
    });

    // Add audit log entry
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.PORTAL_DELETED,
        resource: 'portal',
        resourceId: id,
        details: {
          portalName: portal.name,
          portalSlug: portal.slug,
          uploadsDeleted: portal._count.uploads,
          ownerEmail: portal.user.email
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Portal and all associated files deleted successfully',
      deletedData: {
        uploads: portal._count.uploads,
        chunkedUploads: portal._count.chunkedUploads
      }
    });

  } catch (error) {
    console.error('Error deleting portal:', error);
    return NextResponse.json(
      { error: 'Failed to delete portal' },
      { status: 500 }
    );
  }
}