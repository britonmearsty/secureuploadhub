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

    // Initialize default response with empty arrays
    let userAnalytics = {
      summary: {
        totalUsers: 0,
        period,
        groupBy,
      },
      trends: {
        registrations: [] as Array<{ period: string; registrations: number }>,
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

    // Generate date range for trends (always show some data points)
    const generateDateRange = (start: Date, end: Date, groupBy: string) => {
      const dates: Date[] = [];
      const current = new Date(start);
      const endDate = new Date(end);
      
      if (groupBy === 'day') {
        current.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      } else if (groupBy === 'week') {
        // Start from beginning of week
        current.setDate(current.getDate() - current.getDay());
        current.setHours(0, 0, 0, 0);
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 7);
        }
      } else { // month
        current.setDate(1);
        current.setHours(0, 0, 0, 0);
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
        }
      }
      return dates;
    };

    const dateRange = generateDateRange(startDate, now, groupBy);
    
    // Initialize trends with empty data
    userAnalytics.trends.registrations = dateRange.map(date => ({
      period: date.toISOString().split('T')[0],
      registrations: 0
    }));

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

      // Get registration trends using Prisma groupBy
      try {
        const userData = await prisma.user.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: startDate }
          },
          _count: {
            id: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Process the data based on groupBy parameter
        const trendsMap = new Map<string, number>();
        
        userData.forEach(item => {
          let periodKey: string;
          const date = new Date(item.createdAt);
          
          if (groupBy === 'day') {
            periodKey = date.toISOString().split('T')[0];
          } else if (groupBy === 'week') {
            // Get start of week (Sunday)
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            periodKey = startOfWeek.toISOString().split('T')[0];
          } else { // month
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          }
          
          const existing = trendsMap.get(periodKey) || 0;
          trendsMap.set(periodKey, existing + item._count.id);
        });

        // Convert to array
        userAnalytics.trends.registrations = Array.from(trendsMap.entries()).map(([period, registrations]) => ({
          period,
          registrations
        })).sort((a, b) => a.period.localeCompare(b.period));
      } catch (trendsError) {
        console.log('Registration trends not available:', trendsError);
      }

      // Get activity statistics using Prisma queries
      try {
        const [totalUsers, usersWithPortals, usersWithUploads] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({
            where: {
              uploadPortals: {
                some: {}
              }
            }
          }),
          prisma.user.count({
            where: {
              fileUploads: {
                some: {}
              }
            }
          })
        ]);
        
        userAnalytics.activity = {
          total_users: totalUsers,
          active_users: 0, // Could be calculated based on recent activity
          users_with_portals: usersWithPortals,
          users_with_uploads: usersWithUploads,
        };
      } catch (activityError) {
        console.log('Activity statistics not available:', activityError);
      }

      // Get top users
      try {
        // Get all users with their counts
        const allUsers = await prisma.user.findMany({
          include: {
            _count: {
              select: {
                uploadPortals: true,
                fileUploads: true,
                sessions: true,
              },
            },
          },
        });

        // Sort by portal count first, then upload count
        const sortedUsers = allUsers.sort((a, b) => {
          const portalDiff = b._count.uploadPortals - a._count.uploadPortals;
          if (portalDiff !== 0) return portalDiff;
          return b._count.fileUploads - a._count.fileUploads;
        });

        userAnalytics.topUsers = sortedUsers.slice(0, 10).map(user => ({
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