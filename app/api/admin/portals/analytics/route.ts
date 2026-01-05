import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get portal analytics
    const [
      totalPortals,
      activePortals,
      recentPortals,
      uploadTrends,
      topPortals,
      portalsByUser
    ] = await Promise.all([
      // Total portals count
      prisma.uploadPortal.count(),

      // Active portals count
      prisma.uploadPortal.count({
        where: { isActive: true }
      }),

      // Recent portals created
      prisma.uploadPortal.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Upload trends by day - using Prisma groupBy
      prisma.fileUpload.groupBy({
        by: ['createdAt', 'portalId'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }).then(data => {
        // Process the grouped data to get daily trends
        const dailyTrends = new Map<string, { uploads: number; active_portals: Set<string> }>();
        
        data.forEach(item => {
          const dateKey = item.createdAt.toISOString().split('T')[0];
          const existing = dailyTrends.get(dateKey) || { uploads: 0, active_portals: new Set() };
          existing.uploads += item._count.id;
          existing.active_portals.add(item.portalId);
          dailyTrends.set(dateKey, existing);
        });

        // Convert to array format
        return Array.from(dailyTrends.entries()).map(([date, data]) => ({
          date,
          uploads: data.uploads,
          active_portals: data.active_portals.size
        })).sort((a, b) => a.date.localeCompare(b.date));
      }),

      // Top portals by upload count
      prisma.uploadPortal.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          user: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              uploads: true
            }
          }
        },
        orderBy: {
          uploads: {
            _count: 'desc'
          }
        },
        take: 10
      }),

      // Portals by user (distribution)
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              uploadPortals: true
            }
          }
        },
        where: {
          uploadPortals: {
            some: {}
          }
        },
        orderBy: {
          uploadPortals: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    // Get file type distribution using Prisma groupBy
    const fileTypeStats = await prisma.fileUpload.groupBy({
      by: ['mimeType'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      },
      _sum: {
        fileSize: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    }).then(data => 
      data.map(item => ({
        mime_type: item.mimeType,
        count: item._count.id,
        total_size: Number(item._sum.fileSize) || 0
      }))
    );

    // Get storage usage by portal using Prisma with include
    const storageStats = await prisma.uploadPortal.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        uploads: {
          where: {
            status: 'completed'
          },
          select: {
            fileSize: true
          }
        },
        _count: {
          select: {
            uploads: {
              where: {
                status: 'completed'
              }
            }
          }
        }
      },
      take: 10
    }).then(portals => 
      portals.map(portal => ({
        id: portal.id,
        name: portal.name,
        slug: portal.slug,
        upload_count: portal._count.uploads,
        total_size: portal.uploads.reduce((sum, upload) => sum + (Number(upload.fileSize) || 0), 0)
      })).sort((a, b) => b.total_size - a.total_size)
    );

    const analytics = {
      overview: {
        totalPortals,
        activePortals,
        inactivePortals: totalPortals - activePortals,
        recentPortals
      },
      trends: {
        uploadTrends,
        period: `${days} days`
      },
      topPortals: topPortals.map(portal => ({
        ...portal,
        uploadCount: portal._count.uploads
      })),
      userDistribution: portalsByUser.map(user => ({
        ...user,
        portalCount: user._count.uploadPortals
      })),
      fileTypes: fileTypeStats,
      storage: storageStats
    };

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Error fetching portal analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal analytics' },
      { status: 500 }
    );
  }
}