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
    const period = searchParams.get('period') || '30d';

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

    console.log('Fetching analytics data for period:', period);
    console.log('Date range:', startDate.toISOString(), 'to', now.toISOString());

    // Initialize response with default values
    const dashboardData = {
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
      // Get basic metrics using simple Prisma queries (no raw SQL)
      console.log('Fetching basic metrics...');

      const totalUsers = await prisma.user.count();
      console.log('Total users:', totalUsers);

      const totalPortals = await prisma.uploadPortal.count();
      console.log('Total portals:', totalPortals);

      const totalUploads = await prisma.fileUpload.count();
      console.log('Total uploads:', totalUploads);

      const totalStorage = await prisma.fileUpload.aggregate({
        _sum: { fileSize: true },
      });
      console.log('Total storage:', totalStorage._sum.fileSize);

      const newUsers = await prisma.user.count({
        where: {
          createdAt: { gte: startDate },
        },
      });
      console.log('New users:', newUsers);

      const newPortals = await prisma.uploadPortal.count({
        where: {
          createdAt: { gte: startDate },
        },
      });
      console.log('New portals:', newPortals);

      const newUploads = await prisma.fileUpload.count({
        where: {
          createdAt: { gte: startDate },
        },
      });
      console.log('New uploads:', newUploads);

      // Update dashboard data
      dashboardData.overview.totalUsers = totalUsers;
      dashboardData.overview.totalPortals = totalPortals;
      dashboardData.overview.totalUploads = totalUploads;
      dashboardData.overview.totalStorageGB = Math.round((totalStorage._sum.fileSize || 0) / (1024 * 1024 * 1024) * 100) / 100;
      dashboardData.overview.activeUsers = newUsers; // Simplified: using new users as active users
      dashboardData.overview.newUsers = newUsers;
      dashboardData.overview.newPortals = newPortals;
      dashboardData.overview.newUploads = newUploads;

      // Get recent uploads
      console.log('Fetching recent uploads...');
      const recentUploads = await prisma.fileUpload.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          portal: {
            select: { name: true },
          },
        },
      });
      console.log('Recent uploads count:', recentUploads.length);

      dashboardData.recentActivity.uploads = recentUploads.map(upload => ({
        id: upload.id,
        fileName: '[File Name Hidden]', // Privacy: Hide actual file names from admin view
        fileSize: upload.fileSize,
        portalName: upload.portal.name,
        clientName: upload.clientName || 'Unknown',
        createdAt: upload.createdAt.toISOString(),
      }));

      // Get top portals
      console.log('Fetching top portals...');
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
      console.log('Top portals count:', topPortals.length);

      dashboardData.topPortals = topPortals.map(portal => ({
        id: portal.id,
        name: portal.name,
        ownerName: portal.user.name || 'Unknown',
        ownerEmail: portal.user.email,
        uploadCount: portal._count.uploads,
        createdAt: portal.createdAt.toISOString(),
      }));

      // Generate simple trend data (without raw SQL)
      console.log('Generating trend data...');
      const days = Math.min(parseInt(period.replace('d', '')), 30); // Limit to 30 days for simplicity

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayUsers = await prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        });

        const dayUploads = await prisma.fileUpload.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        });

        dashboardData.trends.userGrowth.push({
          date: date.toISOString().split('T')[0],
          count: dayUsers,
        });

        dashboardData.trends.uploadTrends.push({
          date: date.toISOString().split('T')[0],
          count: dayUploads,
          total_size: 0, // Simplified for now
        });
      }

      console.log('Dashboard data generated successfully');
      console.log('User growth trend points:', dashboardData.trends.userGrowth.length);
      console.log('Upload trend points:', dashboardData.trends.uploadTrends.length);

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