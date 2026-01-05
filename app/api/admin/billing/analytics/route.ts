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

    // Get billing analytics
    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      recentSubscriptions,
      totalRevenue,
      recentRevenue,
      paymentStats,
      planDistribution,
      revenueTrends,
      churnRate
    ] = await Promise.all([
      // Total subscriptions count
      prisma.subscription.count(),

      // Active subscriptions count
      prisma.subscription.count({
        where: { status: 'active' }
      }),

      // Cancelled subscriptions count
      prisma.subscription.count({
        where: { status: 'cancelled' }
      }),

      // Recent subscriptions (last 30 days)
      prisma.subscription.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),

      // Total revenue (all time)
      prisma.payment.aggregate({
        where: {
          status: 'succeeded'
        },
        _sum: {
          amount: true
        }
      }),

      // Recent revenue (last 30 days)
      prisma.payment.aggregate({
        where: {
          status: 'succeeded',
          createdAt: {
            gte: startDate
          }
        },
        _sum: {
          amount: true
        }
      }),

      // Payment statistics
      prisma.payment.groupBy({
        by: ['status'],
        _count: {
          status: true
        },
        _sum: {
          amount: true
        }
      }),

      // Plan distribution
      prisma.subscription.groupBy({
        by: ['planId'],
        where: {
          status: 'active'
        },
        _count: {
          planId: true
        }
      }),

      // Revenue trends by day using Prisma groupBy
      prisma.payment.groupBy({
        by: ['createdAt'],
        where: {
          status: 'succeeded',
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        },
        _sum: {
          amount: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }).then(data => {
        // Process the grouped data to get daily trends
        const dailyTrends = new Map<string, { payments: number; revenue: number }>();
        
        data.forEach(item => {
          const dateKey = item.createdAt.toISOString().split('T')[0];
          const existing = dailyTrends.get(dateKey) || { payments: 0, revenue: 0 };
          existing.payments += item._count.id;
          existing.revenue += Number(item._sum.amount) || 0;
          dailyTrends.set(dateKey, existing);
        });

        // Convert to array format
        return Array.from(dailyTrends.entries()).map(([date, data]) => ({
          date,
          payments: data.payments,
          revenue: data.revenue
        })).sort((a, b) => a.date.localeCompare(b.date));
      }),

      // Calculate churn rate (cancelled in last 30 days / total active at start of period)
      Promise.all([
        prisma.subscription.count({
          where: {
            status: 'cancelled',
            updatedAt: {
              gte: startDate
            }
          }
        }),
        prisma.subscription.count({
          where: {
            status: 'active',
            createdAt: {
              lt: startDate
            }
          }
        })
      ])
    ]);

    // Get plan details for distribution
    const planIds = planDistribution.map((p: any) => p.planId);
    const plans = await prisma.billingPlan.findMany({
      where: {
        id: { in: planIds }
      },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true
      }
    });

    const planMap = plans.reduce((acc: Record<string, any>, plan: any) => {
      acc[plan.id] = plan;
      return acc;
    }, {} as Record<string, any>);

    // Calculate metrics
    const [churnedSubscriptions, activeAtPeriodStart] = churnRate;
    const calculatedChurnRate = activeAtPeriodStart > 0 
      ? (churnedSubscriptions / activeAtPeriodStart) * 100 
      : 0;

    // Monthly Recurring Revenue (MRR) using Prisma with include
    const mrrData = await prisma.subscription.findMany({
      where: {
        status: 'active'
      },
      include: {
        plan: {
          select: {
            price: true
          }
        }
      }
    });

    const mrr = mrrData.reduce((sum, subscription) => {
      return sum + (Number(subscription.plan?.price) || 0);
    }, 0);

    // Average Revenue Per User (ARPU)
    const arpu = activeSubscriptions > 0 
      ? (totalRevenue._sum.amount || 0) / activeSubscriptions 
      : 0;

    const analytics = {
      overview: {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        recentSubscriptions,
        churnRate: Math.round(calculatedChurnRate * 100) / 100
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        recent: recentRevenue._sum.amount || 0,
        mrr: mrr,
        arpu: Math.round(arpu * 100) / 100,
        trends: revenueTrends
      },
      payments: {
        byStatus: paymentStats.reduce((acc: Record<string, any>, stat: any) => {
          acc[stat.status] = {
            count: stat._count.status,
            amount: stat._sum.amount || 0
          };
          return acc;
        }, {} as Record<string, any>)
      },
      plans: {
        distribution: planDistribution.map((dist: any) => ({
          plan: planMap[dist.planId],
          subscriptions: dist._count.planId
        }))
      }
    };

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Error fetching billing analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing analytics' },
      { status: 500 }
    );
  }
}