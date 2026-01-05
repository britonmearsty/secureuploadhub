import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get user activity data
    const [
      recentUploads,
      recentPortals,
      uploadStats,
      portalStats,
      sessions
    ] = await Promise.all([
      // Recent file uploads
      prisma.fileUpload.findMany({
        where: { userId: id },
        select: {
          id: true,
          fileName: false, // Privacy: Hide file names from admin view
          fileSize: true,
          createdAt: true,
          status: true,
          clientName: true,
          clientEmail: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      // Recent portals created
      prisma.uploadPortal.findMany({
        where: { userId: id },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          isActive: true,
          _count: {
            select: {
              uploads: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Upload statistics
      prisma.fileUpload.groupBy({
        by: ['status'],
        where: { userId: id },
        _count: {
          status: true
        }
      }),

      // Portal statistics
      prisma.uploadPortal.aggregate({
        where: { userId: id },
        _count: {
          id: true
        }
      }),

      // Recent sessions (login history)
      prisma.session.findMany({
        where: { userId: id },
        select: {
          sessionToken: true,
          createdAt: true,
          expires: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate total storage used
    const storageStats = await prisma.fileUpload.aggregate({
      where: { 
        userId: id,
        status: 'completed'
      },
      _sum: {
        fileSize: true
      },
      _count: {
        id: true
      }
    });

    const activity = {
      recentUploads,
      recentPortals,
      sessions,
      stats: {
        uploads: {
          total: uploadStats.reduce((acc, stat) => acc + stat._count.status, 0),
          byStatus: uploadStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {} as Record<string, number>),
          totalSize: storageStats._sum.fileSize || 0,
          completedUploads: storageStats._count.id || 0
        },
        portals: {
          total: portalStats._count.id || 0
        }
      }
    };

    return NextResponse.json({ activity });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}