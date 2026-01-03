import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  timezone: z.string().optional().default('UTC'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { period, timezone } = querySchema.parse({
      period: searchParams.get('period'),
      timezone: searchParams.get('timezone'),
    });

    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Initialize default response
    let dashboardData = {
      overview: {
        totalUsers: 0,
        totalPortals: 0,
        totalUploads: 0,
        totalStorageGB: 0,
        activeUsers: 0,
        newUsers: 0,
        newPortals: 0,
        newUploads: 0,
      },
      recentActivity: {
        uploads: [] as Array<{
          id: string;
          fileName: string;
          fileSize: number;
          portalName: string;
          clientName: string;
          createdAt: string;
        }>,
      },
      topPortals: [] as Array<{
        id: string;
        name: string;
        ownerName: string;
        ownerEmail: string;
        uploadCount: number;
        createdAt: string;
      }>,
      trends: {
        userGrowth: [] as any[],
        uploadTrends: [] as any[],
      },
      period,
      generatedAt: new Date().toISOString(),
    };

    try {
      // Get dashboard metrics with error handling
      const [
        totalUsers,
        totalPortals,
        totalUploads,
        totalStorage,
        activeUsers,
        newUsers,
        newPortals,
        newUploads,
      ] = await Promise.allSettled([
        prisma.user.count(),
        prisma.uploadPortal.count(),
        prisma.fileUpload.count(),
        prisma.fileUpload.aggregate({
          _sum: { fileSize: true },
        }),
        
        // Active users (logged in within period)
        prisma.user.count({
          where: {
            sessions: {
              some: {
                createdAt: { gte: startDate },
              },
            },
          },
        }),
        
        // New users in period
        prisma.user.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // New portals in period
        prisma.uploadPortal.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        
        // New uploads in period
        prisma.fileUpload.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
      ]);

      // Update dashboard data with successful results
      dashboardData.overview.totalUsers = totalUsers.status === 'fulfilled' ? totalUsers.value : 0;
      dashboardData.overview.totalPortals = totalPortals.status === 'fulfilled' ? totalPortals.value : 0;
      dashboardData.overview.totalUploads = totalUploads.status === 'fulfilled' ? totalUploads.value : 0;
      dashboardData.overview.totalStorageGB = totalStorage.status === 'fulfilled' ? 
        Math.round((totalStorage.value._sum.fileSize || 0) / (1024 * 1024 * 1024) * 100) / 100 : 0;
      dashboardData.overview.activeUsers = activeUsers.status === 'fulfilled' ? activeUsers.value : 0;
      dashboardData.overview.newUsers = newUsers.status === 'fulfilled' ? newUsers.value : 0;
      dashboardData.overview.newPortals = newPortals.status === 'fulfilled' ? newPortals.value : 0;
      dashboardData.overview.newUploads = newUploads.status === 'fulfilled' ? newUploads.value : 0;

      // Try to get recent uploads
      try {
        const recentUploads = await prisma.fileUpload.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            portal: {
              select: { name: true },
            },
          },
        });

        dashboardData.recentActivity.uploads = recentUploads.map(upload => ({
          id: upload.id,
          fileName: upload.fileName,
          fileSize: upload.fileSize,
          portalName: upload.portal.name,
          clientName: upload.clientName || 'Unknown',
          createdAt: upload.createdAt.toISOString(),
        }));
      } catch (uploadsError) {
        console.log('Recent uploads not available:', uploadsError);
      }

      // Try to get top portals
      try {
        const topPortals = await prisma.uploadPortal.findMany({
          take: 5,
          include: {
            _count: {
              select: { uploads: true },
            },
            user: {
              select: { name: true, email: true },
            },
          },
          orderBy: {
            uploads: {
              _count: 'desc',
            },
          },
        });

        dashboardData.topPortals = topPortals.map(portal => ({
          id: portal.id,
          name: portal.name,
          ownerName: portal.user.name || 'Unknown',
          ownerEmail: portal.user.email,
          uploadCount: portal._count.uploads,
          createdAt: portal.createdAt.toISOString(),
        }));
      } catch (portalsError) {
        console.log('Top portals not available:', portalsError);
      }

      // Try to get trends
      try {
        const userGrowth = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*)::int as count
          FROM "User"
          WHERE "createdAt" >= ${startDate}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date ASC
        `;
        dashboardData.trends.userGrowth = userGrowth as any[];
      } catch (userGrowthError) {
        console.log('User growth trend not available:', userGrowthError);
      }

      try {
        const uploadTrends = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*)::int as count,
            COALESCE(SUM("fileSize"), 0)::bigint as total_size
          FROM "FileUpload"
          WHERE "createdAt" >= ${startDate}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date ASC
        `;
        dashboardData.trends.uploadTrends = uploadTrends as any[];
      } catch (uploadTrendsError) {
        console.log('Upload trends not available:', uploadTrendsError);
      }

    } catch (error) {
      console.error('Error collecting dashboard data:', error);
      // Return default data even if there are errors
    }

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}