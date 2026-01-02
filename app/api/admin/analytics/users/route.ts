import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { period, groupBy } = querySchema.parse({
      period: searchParams.get('period'),
      groupBy: searchParams.get('groupBy'),
    });

    // Calculate date range
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

    const [
      userStats,
      registrationTrends,
      roleDistribution,
      statusDistribution,
      activityStats,
      topUsers,
    ] = await Promise.all([
      // Basic user statistics
      prisma.user.aggregate({
        _count: true,
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // Registration trends over time
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${groupBy}, "createdAt") as period,
          COUNT(*) as registrations
        FROM "User"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC(${groupBy}, "createdAt")
        ORDER BY period ASC
      `,
      
      // User role distribution
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      
      // User status distribution
      prisma.user.groupBy({
        by: ['status'],
        _count: true,
      }),
      
      // Activity statistics
      prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN s."createdAt" >= ${startDate} THEN u.id END) as active_users,
          COUNT(DISTINCT CASE WHEN up.id IS NOT NULL THEN u.id END) as users_with_portals,
          COUNT(DISTINCT CASE WHEN fu.id IS NOT NULL THEN u.id END) as users_with_uploads
        FROM "User" u
        LEFT JOIN "Session" s ON u.id = s."userId"
        LEFT JOIN "UploadPortal" up ON u.id = up."userId"
        LEFT JOIN "FileUpload" fu ON u.id = fu."userId"
      `,
      
      // Top users by activity
      prisma.user.findMany({
        take: 10,
        include: {
          _count: {
            select: {
              uploadPortals: true,
              fileUploads: true,
              sessions: true,
            },
          },
        },
        orderBy: [
          { uploadPortals: { _count: 'desc' } },
          { fileUploads: { _count: 'desc' } },
        ],
      }),
    ]);

    // Format the response
    const userAnalytics = {
      summary: {
        totalUsers: userStats._count,
        period,
        groupBy,
      },
      trends: {
        registrations: registrationTrends,
      },
      distribution: {
        roles: roleDistribution.map(item => ({
          role: item.role,
          count: item._count,
        })),
        status: statusDistribution.map(item => ({
          status: item.status,
          count: item._count,
        })),
      },
      activity: (activityStats as any[])[0] || {
        total_users: 0,
        active_users: 0,
        users_with_portals: 0,
        users_with_uploads: 0,
      },
      topUsers: topUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        stats: {
          portals: user._count.uploadPortals,
          uploads: user._count.fileUploads,
          sessions: user._count.sessions,
        },
      })),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(userAnalytics);
  } catch (error) {
    console.error('User analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user analytics' },
      { status: 500 }
    );
  }
}