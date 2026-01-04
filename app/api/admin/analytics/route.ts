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
          failed: 0,
          pending: 0,
          recent: 0,
          totalStorage: 0,
          averagePerUser: 0,
          averageFileSize: 0
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
        failedUploads,
        pendingUploads,
        recentUploads,
        totalStorageUsed,
        averageFileSize
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
        prisma.fileUpload.count({ where: { status: 'failed' } }),
        prisma.fileUpload.count({ where: { status: 'pending' } }),
        prisma.fileUpload.count({ where: { createdAt: { gte: startDate } } }),
        prisma.fileUpload.aggregate({
          where: { status: 'completed' },
          _sum: { fileSize: true }
        }),
        prisma.fileUpload.aggregate({
          where: { status: 'completed' },
          _avg: { fileSize: true }
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
      analytics.overview.uploads.failed = failedUploads.status === 'fulfilled' ? failedUploads.value : 0;
      analytics.overview.uploads.pending = pendingUploads.status === 'fulfilled' ? pendingUploads.value : 0;
      analytics.overview.uploads.recent = recentUploads.status === 'fulfilled' ? recentUploads.value : 0;
      analytics.overview.uploads.totalStorage = totalStorageUsed.status === 'fulfilled' ? (totalStorageUsed.value._sum.fileSize || 0) : 0;
      analytics.overview.uploads.averageFileSize = averageFileSize.status === 'fulfilled' ? (averageFileSize.value._avg.fileSize || 0) : 0;

      // Try to get billing metrics (might not exist)
      try {
        // Check if billing tables exist first
        const billingTablesExist = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'Subscription'
          ) as subscription_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'Payment'
          ) as payment_exists
        `.then((result: any) => result[0]);

        if (billingTablesExist.subscription_exists && billingTablesExist.payment_exists) {
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
        }
      } catch (billingError) {
        console.log('Billing data not available:', billingError);
        // Keep default billing values (all zeros)
      }

      // Generate all dates in the period for complete trend data
      const generateDateRange = (start: Date, end: Date) => {
        const dates: Date[] = [];
        const current = new Date(start);
        current.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
        return dates;
      };

      const endDate = new Date();
      const allDates = generateDateRange(startDate, endDate);

      // Helper function to format date as ISO string
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      // Get user growth trend data
      try {
        // Try PostgreSQL syntax first, fallback to generic SQL
        let userGrowthTrend;
        try {
          userGrowthTrend = await prisma.$queryRaw<Array<{ date: Date; count: number }>>`
            SELECT 
              DATE_TRUNC('day', "createdAt")::date as date,
              COUNT(*)::int as count
            FROM "User"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY date ASC
          `;
        } catch (pgError) {
          // Fallback for other databases
          userGrowthTrend = await prisma.$queryRaw<Array<{ date: Date; count: number }>>`
            SELECT 
              DATE("createdAt") as date,
              COUNT(*) as count
            FROM "User"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
          `;
        }

        // Create a map of existing data
        const userGrowthMap = new Map(
          userGrowthTrend.map(item => [formatDate(item.date), item.count])
        );

        // Fill in all dates with actual data or 0
        analytics.trends.userGrowth = allDates.map(date => ({
          date: formatDate(date),
          count: userGrowthMap.get(formatDate(date)) || 0
        }));
      } catch (trendError) {
        console.log('User growth trend not available:', trendError);
        // Fill with zeros if query fails
        analytics.trends.userGrowth = allDates.map(date => ({
          date: formatDate(date),
          count: 0
        }));
      }

      // Get upload trend data
      try {
        let uploadTrend;
        try {
          uploadTrend = await prisma.$queryRaw<Array<{ date: Date; uploads: number; storage: bigint }>>`
            SELECT 
              DATE_TRUNC('day', "createdAt")::date as date,
              COUNT(*)::int as uploads,
              COALESCE(SUM("fileSize"), 0)::bigint as storage
            FROM "FileUpload"
            WHERE "createdAt" >= ${startDate} AND status = 'completed'
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY date ASC
          `;
        } catch (pgError) {
          // Fallback for other databases
          uploadTrend = await prisma.$queryRaw<Array<{ date: Date; uploads: number; storage: bigint }>>`
            SELECT 
              DATE("createdAt") as date,
              COUNT(*) as uploads,
              COALESCE(SUM("fileSize"), 0) as storage
            FROM "FileUpload"
            WHERE "createdAt" >= ${startDate} AND status = 'completed'
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
          `;
        }

        // Create a map of existing data
        const uploadTrendMap = new Map(
          uploadTrend.map(item => [
            formatDate(item.date),
            {
              uploads: item.uploads,
              storage: Number(item.storage)
            }
          ])
        );

        // Fill in all dates with actual data or 0
        analytics.trends.uploads = allDates.map(date => {
          const data = uploadTrendMap.get(formatDate(date));
          return {
            date: formatDate(date),
            uploads: data?.uploads || 0,
            storage: data?.storage || 0
          };
        });
      } catch (uploadTrendError) {
        console.log('Upload trend not available:', uploadTrendError);
        // Fill with zeros if query fails
        analytics.trends.uploads = allDates.map(date => ({
          date: formatDate(date),
          uploads: 0,
          storage: 0
        }));
      }

      // Get revenue trend data
      try {
        // Check if payment table exists first
        const paymentTableExists = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'Payment'
          ) as exists
        `.then((result: any) => result[0]?.exists);

        if (paymentTableExists) {
          let revenueTrend;
          try {
            revenueTrend = await prisma.$queryRaw<Array<{ date: Date; payments: number; revenue: number }>>`
              SELECT 
                DATE_TRUNC('day', "createdAt")::date as date,
                COUNT(*)::int as payments,
                COALESCE(SUM("amount"), 0)::float as revenue
              FROM "Payment"
              WHERE "createdAt" >= ${startDate} AND status = 'completed'
              GROUP BY DATE_TRUNC('day', "createdAt")
              ORDER BY date ASC
            `;
          } catch (pgError) {
            // Fallback for other databases
            revenueTrend = await prisma.$queryRaw<Array<{ date: Date; payments: number; revenue: number }>>`
              SELECT 
                DATE("createdAt") as date,
                COUNT(*) as payments,
                COALESCE(SUM("amount"), 0) as revenue
              FROM "Payment"
              WHERE "createdAt" >= ${startDate} AND status = 'completed'
              GROUP BY DATE("createdAt")
              ORDER BY date ASC
            `;
          }

          // Create a map of existing data
          const revenueTrendMap = new Map(
            revenueTrend.map(item => [
              formatDate(item.date),
              {
                payments: item.payments,
                revenue: Number(item.revenue) || 0
              }
            ])
          );

          // Fill in all dates with actual data or 0
          analytics.trends.revenue = allDates.map(date => {
            const data = revenueTrendMap.get(formatDate(date));
            return {
              date: formatDate(date),
              payments: data?.payments || 0,
              revenue: data?.revenue || 0
            };
          });
        } else {
          // Fill with zeros if payment table doesn't exist
          analytics.trends.revenue = allDates.map(date => ({
            date: formatDate(date),
            payments: 0,
            revenue: 0
          }));
        }
      } catch (revenueTrendError) {
        console.log('Revenue trend not available:', revenueTrendError);
        // Fill with zeros if query fails
        analytics.trends.revenue = allDates.map(date => ({
          date: formatDate(date),
          payments: 0,
          revenue: 0
        }));
      }

      // Try to get top users
      try {
        // Get all users with their counts
        const allUsers = await prisma.user.findMany({
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
          }
        });

        // Sort by portal count first, then upload count
        const sortedUsers = allUsers.sort((a, b) => {
          const portalDiff = b._count.uploadPortals - a._count.uploadPortals;
          if (portalDiff !== 0) return portalDiff;
          return b._count.fileUploads - a._count.fileUploads;
        });

        analytics.topUsers = sortedUsers.slice(0, 10);
      } catch (topUsersError) {
        console.log('Top users not available:', topUsersError);
      }

      // Try to get recent activity
      try {
        // Check if audit log table exists first
        const auditLogExists = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'AuditLog'
          ) as exists
        `.then((result: any) => result[0]?.exists);

        if (auditLogExists) {
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
        } else {
          // Generate some mock recent activity from file uploads
          const recentUploads = await prisma.fileUpload.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              portal: {
                include: {
                  user: {
                    select: { email: true, name: true }
                  }
                }
              }
            }
          });

          analytics.recentActivity = recentUploads.map(upload => ({
            id: upload.id,
            action: 'FILE_UPLOAD',
            resource: `File: ${upload.fileName}`,
            user: upload.portal.user,
            createdAt: upload.createdAt,
            details: { fileName: upload.fileName, fileSize: upload.fileSize }
          }));
        }
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