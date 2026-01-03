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

    // Initialize default values
    let analytics = {
      overview: {
        users: {
          total: 0,
          active: 0,
          new: 0,
          admins: 0,
          disabled: 0,
          conversionRate: 0
        },
        portals: {
          total: 0,
          active: 0,
          new: 0,
          averageUploads: 0
        },
        uploads: {
          total: 0,
          completed: 0,
          recent: 0,
          totalStorage: 0,
          averagePerUser: 0
        },
        billing: {
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          totalRevenue: 0,
          recentRevenue: 0,
          averageRevenuePerUser: 0
        }
      },
      trends: {
        userGrowth: [] as any[],
        uploads: [] as any[],
        revenue: [] as any[],
        period: `${days} days`
      },
      topUsers: [] as Array<{
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
        _count: {
          uploadPortals: number;
          fileUploads: number;
        };
      }>,
      recentActivity: [] as Array<{
        id: string;
        action: string;
        resource: string;
        user: {
          email: string;
          name: string | null;
        } | null;
        createdAt: Date;
        details: any;
      }>
    };

    try {
      // Get basic metrics with error handling
      const [
        totalUsers,
        activeUsers,
        newUsers,
        adminUsers,
        disabledUsers,
        totalPortals,
        activePortals,
        newPortals,
        totalUploads,
        completedUploads,
        recentUploads,
        totalStorageUsed
      ] = await Promise.allSettled([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'active' } }),
        prisma.user.count({ where: { createdAt: { gte: startDate } } }),
        prisma.user.count({ where: { role: 'admin' } }),
        prisma.user.count({ where: { status: 'disabled' } }),
        prisma.uploadPortal.count(),
        prisma.uploadPortal.count({ where: { isActive: true } }),
        prisma.uploadPortal.count({ where: { createdAt: { gte: startDate } } }),
        prisma.fileUpload.count(),
        prisma.fileUpload.count({ where: { status: 'completed' } }),
        prisma.fileUpload.count({ where: { createdAt: { gte: startDate } } }),
        prisma.fileUpload.aggregate({
          where: { status: 'completed' },
          _sum: { fileSize: true }
        })
      ]);

      // Update analytics with successful results
      analytics.overview.users.total = totalUsers.status === 'fulfilled' ? totalUsers.value : 0;
      analytics.overview.users.active = activeUsers.status === 'fulfilled' ? activeUsers.value : 0;
      analytics.overview.users.new = newUsers.status === 'fulfilled' ? newUsers.value : 0;
      analytics.overview.users.admins = adminUsers.status === 'fulfilled' ? adminUsers.value : 0;
      analytics.overview.users.disabled = disabledUsers.status === 'fulfilled' ? disabledUsers.value : 0;
      
      analytics.overview.portals.total = totalPortals.status === 'fulfilled' ? totalPortals.value : 0;
      analytics.overview.portals.active = activePortals.status === 'fulfilled' ? activePortals.value : 0;
      analytics.overview.portals.new = newPortals.status === 'fulfilled' ? newPortals.value : 0;
      
      analytics.overview.uploads.total = totalUploads.status === 'fulfilled' ? totalUploads.value : 0;
      analytics.overview.uploads.completed = completedUploads.status === 'fulfilled' ? completedUploads.value : 0;
      analytics.overview.uploads.recent = recentUploads.status === 'fulfilled' ? recentUploads.value : 0;
      analytics.overview.uploads.totalStorage = totalStorageUsed.status === 'fulfilled' ? (totalStorageUsed.value._sum.fileSize || 0) : 0;

      // Try to get billing metrics (might not exist)
      try {
        const [totalSubscriptions, activeSubscriptions, totalRevenue, recentRevenue] = await Promise.allSettled([
          prisma.subscription.count(),
          prisma.subscription.count({ where: { status: 'active' } }),
          prisma.payment.aggregate({
            where: { status: 'completed' },
            _sum: { amount: true }
          }),
          prisma.payment.aggregate({
            where: { 
              status: 'completed',
              createdAt: { gte: startDate }
            },
            _sum: { amount: true }
          })
        ]);

        analytics.overview.billing.totalSubscriptions = totalSubscriptions.status === 'fulfilled' ? totalSubscriptions.value : 0;
        analytics.overview.billing.activeSubscriptions = activeSubscriptions.status === 'fulfilled' ? activeSubscriptions.value : 0;
        analytics.overview.billing.totalRevenue = totalRevenue.status === 'fulfilled' ? (totalRevenue.value._sum.amount || 0) : 0;
        analytics.overview.billing.recentRevenue = recentRevenue.status === 'fulfilled' ? (recentRevenue.value._sum.amount || 0) : 0;
      } catch (billingError) {
        console.log('Billing data not available:', billingError);
      }

      // Try to get trend data (simplified approach)
      try {
        const userGrowthTrend = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*)::int as count
          FROM "User"
          WHERE "createdAt" >= ${startDate}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date ASC
        `;
        analytics.trends.userGrowth = userGrowthTrend as any[];
      } catch (trendError) {
        console.log('User growth trend not available:', trendError);
      }

      try {
        const uploadTrend = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*)::int as uploads,
            COALESCE(SUM("fileSize"), 0)::bigint as storage
          FROM "FileUpload"
          WHERE "createdAt" >= ${startDate} AND status = 'completed'
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date ASC
        `;
        analytics.trends.uploads = uploadTrend as any[];
      } catch (uploadTrendError) {
        console.log('Upload trend not available:', uploadTrendError);
      }

      // Try to get top users
      try {
        const topUsers = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                uploadPortals: true,
                fileUploads: true
              }
            }
          },
          orderBy: [
            { uploadPortals: { _count: 'desc' } },
            { fileUploads: { _count: 'desc' } }
          ],
          take: 10
        });
        analytics.topUsers = topUsers;
      } catch (topUsersError) {
        console.log('Top users not available:', topUsersError);
      }

      // Try to get recent activity
      try {
        const recentActivity = await prisma.auditLog.findMany({
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        });
        analytics.recentActivity = recentActivity.map(activity => ({
          id: activity.id,
          action: activity.action,
          resource: activity.resource,
          user: activity.user,
          createdAt: activity.createdAt,
          details: activity.details
        }));
      } catch (activityError) {
        console.log('Recent activity not available:', activityError);
      }

      // Calculate derived metrics
      const conversionRate = analytics.overview.users.total > 0 ? 
        (analytics.overview.billing.activeSubscriptions / analytics.overview.users.total) * 100 : 0;
      const averageStoragePerUser = analytics.overview.users.total > 0 ? 
        analytics.overview.uploads.totalStorage / analytics.overview.users.total : 0;
      const averageUploadsPerPortal = analytics.overview.portals.total > 0 ? 
        analytics.overview.uploads.total / analytics.overview.portals.total : 0;

      analytics.overview.users.conversionRate = Math.round(conversionRate * 100) / 100;
      analytics.overview.uploads.averagePerUser = Math.round(averageStoragePerUser);
      analytics.overview.portals.averageUploads = Math.round(averageUploadsPerPortal * 100) / 100;
      analytics.overview.billing.averageRevenuePerUser = analytics.overview.billing.activeSubscriptions > 0 ? 
        Math.round((analytics.overview.billing.totalRevenue / analytics.overview.billing.activeSubscriptions) * 100) / 100 : 0;

    } catch (error) {
      console.error('Error in analytics data collection:', error);
      // Return default analytics even if there are errors
    }

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}