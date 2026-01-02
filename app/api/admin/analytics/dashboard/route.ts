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

    // Get dashboard metrics
    const [
      totalUsers,
      totalPortals,
      totalUploads,
      totalStorage,
      activeUsers,
      newUsers,
      newPortals,
      newUploads,
      recentUploads,
      topPortals,
      userGrowth,
      uploadTrends,
    ] = await Promise.all([
      // Total counts
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
      
      // Recent uploads
      prisma.fileUpload.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          portal: {
            select: { name: true },
          },
        },
      }),
      
      // Top portals by upload count
      prisma.uploadPortal.findMany({
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
      }),
      
      // User growth over time
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as count
        FROM "User"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      
      // Upload trends over time
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as count,
          SUM("fileSize") as total_size
        FROM "FileUpload"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
    ]);

    // Calculate storage in GB
    const totalStorageGB = Math.round((totalStorage._sum.fileSize || 0) / (1024 * 1024 * 1024) * 100) / 100;

    // Format response
    const dashboardData = {
      overview: {
        totalUsers,
        totalPortals,
        totalUploads,
        totalStorageGB,
        activeUsers,
        newUsers,
        newPortals,
        newUploads,
      },
      recentActivity: {
        uploads: recentUploads.map(upload => ({
          id: upload.id,
          fileName: upload.fileName,
          fileSize: upload.fileSize,
          portalName: upload.portal.name,
          clientName: upload.clientName,
          createdAt: upload.createdAt,
        })),
      },
      topPortals: topPortals.map(portal => ({
        id: portal.id,
        name: portal.name,
        ownerName: portal.user.name,
        ownerEmail: portal.user.email,
        uploadCount: portal._count.uploads,
        createdAt: portal.createdAt,
      })),
      trends: {
        userGrowth: userGrowth,
        uploadTrends: uploadTrends,
      },
      period,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}