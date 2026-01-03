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

    // Get comprehensive platform analytics
    const [
      // User metrics
      totalUsers,
      activeUsers,
      newUsers,
      adminUsers,
      disabledUsers,
      
      // Portal metrics
      totalPortals,
      activePortals,
      newPortals,
      
      // Upload metrics
      totalUploads,
      completedUploads,
      recentUploads,
      totalStorageUsed,
      
      // Billing metrics
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      recentRevenue,
      
      // Activity trends
      userGrowthTrend,
      uploadTrend,
      revenueTrend
    ] = await Promise.all([
      // User metrics
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ 
        where: { 
          createdAt: { gte: startDate } 
        } 
      }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { status: 'disabled' } }),
      
      // Portal metrics
      prisma.uploadPortal.count(),
      prisma.uploadPortal.count({ where: { isActive: true } }),
      prisma.uploadPortal.count({ 
        where: { 
          createdAt: { gte: startDate } 
        } 
      }),
      
      // Upload metrics
      prisma.fileUpload.count(),
      prisma.fileUpload.count({ where: { status: 'completed' } }),
      prisma.fileUpload.count({ 
        where: { 
          createdAt: { gte: startDate } 
        } 
      }),
      prisma.fileUpload.aggregate({
        where: { status: 'completed' },
        _sum: { fileSize: true }
      }),
      
      // Billing metrics
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
      }),
      
      // Growth trends
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as count
        FROM "User"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as uploads,
          SUM("fileSize") as storage
        FROM "FileUpload"
        WHERE "createdAt" >= ${startDate} AND status = 'completed'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as payments,
          SUM(amount) as revenue
        FROM "Payment"
        WHERE "createdAt" >= ${startDate} AND status = 'completed'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `
    ]);

    // Get top users by activity
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

    // Get recent activity
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

    // Calculate conversion rates and other metrics
    const conversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
    const averageStoragePerUser = totalUsers > 0 ? (totalStorageUsed._sum.fileSize || 0) / totalUsers : 0;
    const averageUploadsPerPortal = totalPortals > 0 ? totalUploads / totalPortals : 0;

    const analytics = {
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          admins: adminUsers,
          disabled: disabledUsers,
          conversionRate: Math.round(conversionRate * 100) / 100
        },
        portals: {
          total: totalPortals,
          active: activePortals,
          new: newPortals,
          averageUploads: Math.round(averageUploadsPerPortal * 100) / 100
        },
        uploads: {
          total: totalUploads,
          completed: completedUploads,
          recent: recentUploads,
          totalStorage: totalStorageUsed._sum.fileSize || 0,
          averagePerUser: Math.round(averageStoragePerUser)
        },
        billing: {
          totalSubscriptions,
          activeSubscriptions,
          totalRevenue: totalRevenue._sum.amount || 0,
          recentRevenue: recentRevenue._sum.amount || 0,
          averageRevenuePerUser: activeSubscriptions > 0 
            ? Math.round(((totalRevenue._sum.amount || 0) / activeSubscriptions) * 100) / 100 
            : 0
        }
      },
      trends: {
        userGrowth: userGrowthTrend,
        uploads: uploadTrend,
        revenue: revenueTrend,
        period: `${days} days`
      },
      topUsers,
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        resource: activity.resource,
        user: activity.user,
        createdAt: activity.createdAt,
        details: activity.details
      }))
    };

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}