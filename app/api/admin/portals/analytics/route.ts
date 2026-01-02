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

      // Upload trends by day
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as uploads,
          COUNT(DISTINCT portal_id) as active_portals
        FROM "FileUpload"
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

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

    // Get file type distribution
    const fileTypeStats = await prisma.$queryRaw`
      SELECT 
        mime_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM "FileUpload"
      WHERE created_at >= ${startDate}
      GROUP BY mime_type
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get storage usage by portal
    const storageStats = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.slug,
        COUNT(f.id) as upload_count,
        COALESCE(SUM(f.file_size), 0) as total_size
      FROM "UploadPortal" p
      LEFT JOIN "FileUpload" f ON p.id = f.portal_id AND f.status = 'completed'
      GROUP BY p.id, p.name, p.slug
      ORDER BY total_size DESC
      LIMIT 10
    `;

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