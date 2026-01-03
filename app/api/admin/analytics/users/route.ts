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

    // Initialize default response
    let userAnalytics = {
      summary: {
        totalUsers: 0,
        period,
        groupBy,
      },
      trends: {
        registrations: [] as any[],
      },
      distribution: {
        roles: [] as Array<{ role: string; count: number }>,
        status: [] as Array<{ status: string; count: number }>,
      },
      activity: {
        total_users: 0,
        active_users: 0,
        users_with_portals: 0,
        users_with_uploads: 0,
      },
      topUsers: [] as Array<{
        id: string;
        name: string | null;
        email: string;
        role: string;
        status: string;
        createdAt: string;
        stats: {
          portals: number;
          uploads: number;
          sessions: number;
        };
      }>,
      generatedAt: new Date().toISOString(),
    };

    try {
      // Get basic user statistics
      const userStats = await prisma.user.aggregate({
        _count: true,
        where: {
          createdAt: { gte: startDate },
        },
      });
      userAnalytics.summary.totalUsers = userStats._count;

      // Get role distribution
      try {
        const roleDistribution = await prisma.user.groupBy({
          by: ['role'],
          _count: true,
        });
        userAnalytics.distribution.roles = roleDistribution.map(item => ({
          role: item.role,
          count: item._count,
        }));
      } catch (roleError) {
        console.log('Role distribution not available:', roleError);
      }

      // Get status distribution
      try {
        const statusDistribution = await prisma.user.groupBy({
          by: ['status'],
          _count: true,
        });
        userAnalytics.distribution.status = statusDistribution.map(item => ({
          status: item.status,
          count: item._count,
        }));
      } catch (statusError) {
        console.log('Status distribution not available:', statusError);
      }

      // Get registration trends
      try {
        let registrationTrends;
        if (groupBy === 'day') {
          registrationTrends = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('day', "createdAt") as period,
              COUNT(*)::int as registrations
            FROM "User"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY period ASC
          `;
        } else if (groupBy === 'week') {
          registrationTrends = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('week', "createdAt") as period,
              COUNT(*)::int as registrations
            FROM "User"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('week', "createdAt")
            ORDER BY period ASC
          `;
        } else {
          registrationTrends = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('month', "createdAt") as period,
              COUNT(*)::int as registrations
            FROM "User"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY period ASC
          `;
        }
        userAnalytics.trends.registrations = registrationTrends as any[];
      } catch (trendsError) {
        console.log('Registration trends not available:', trendsError);
      }

      // Get activity statistics
      try {
        const activityStats = await prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT u.id)::int as total_users,
            0::int as active_users,
            COUNT(DISTINCT CASE WHEN up.id IS NOT NULL THEN u.id END)::int as users_with_portals,
            COUNT(DISTINCT CASE WHEN fu.id IS NOT NULL THEN u.id END)::int as users_with_uploads
          FROM "User" u
          LEFT JOIN "UploadPortal" up ON u.id = up."userId"
          LEFT JOIN "FileUpload" fu ON u.id = fu."userId"
        `;
        const stats = (activityStats as any[])[0];
        if (stats) {
          userAnalytics.activity = {
            total_users: stats.total_users || 0,
            active_users: stats.active_users || 0,
            users_with_portals: stats.users_with_portals || 0,
            users_with_uploads: stats.users_with_uploads || 0,
          };
        }
      } catch (activityError) {
        console.log('Activity statistics not available:', activityError);
        // Try a simpler approach
        try {
          const totalUsers = await prisma.user.count();
          const usersWithPortals = await prisma.user.count({
            where: {
              uploadPortals: {
                some: {}
              }
            }
          });
          const usersWithUploads = await prisma.user.count({
            where: {
              fileUploads: {
                some: {}
              }
            }
          });
          
          userAnalytics.activity = {
            total_users: totalUsers,
            active_users: 0,
            users_with_portals: usersWithPortals,
            users_with_uploads: usersWithUploads,
          };
        } catch (fallbackError) {
          console.log('Fallback activity stats failed:', fallbackError);
        }
      }

      // Get top users
      try {
        const topUsers = await prisma.user.findMany({
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
        });

        userAnalytics.topUsers = topUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          stats: {
            portals: user._count.uploadPortals,
            uploads: user._count.fileUploads,
            sessions: user._count.sessions,
          },
        }));
      } catch (topUsersError) {
        console.log('Top users not available:', topUsersError);
      }

    } catch (error) {
      console.error('Error collecting user analytics:', error);
    }

    return NextResponse.json(userAnalytics);
  } catch (error) {
    console.error('User analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}