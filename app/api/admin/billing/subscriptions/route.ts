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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { plan: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Fetch subscriptions with user and plan data
    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where,
        select: {
          id: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          providerSubscriptionId: true,
          providerCustomerId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              currency: true,
              features: true
            }
          },
          _count: {
            select: {
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      prisma.subscription.count({ where })
    ]);

    // Get payment statistics for each subscription
    const subscriptionIds = subscriptions.map(s => s.id);
    const paymentStats = await prisma.payment.groupBy({
      by: ['subscriptionId', 'status'],
      where: {
        subscriptionId: { in: subscriptionIds }
      },
      _sum: {
        amount: true
      },
      _count: {
        status: true
      }
    });

    // Organize payment stats by subscription
    const paymentStatsMap = paymentStats.reduce((acc, stat) => {
      if (!stat.subscriptionId) return acc;
      
      if (!acc[stat.subscriptionId]) {
        acc[stat.subscriptionId] = {
          totalPayments: 0,
          successfulPayments: 0,
          totalRevenue: 0
        };
      }
      
      acc[stat.subscriptionId].totalPayments += stat._count.status;
      if (stat.status === 'completed') {
        acc[stat.subscriptionId].successfulPayments += stat._count.status;
        acc[stat.subscriptionId].totalRevenue += stat._sum.amount || 0;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Add payment stats to subscriptions
    const subscriptionsWithStats = subscriptions.map(subscription => ({
      ...subscription,
      paymentStats: paymentStatsMap[subscription.id] || {
        totalPayments: 0,
        successfulPayments: 0,
        totalRevenue: 0
      }
    }));

    return NextResponse.json({
      subscriptions: subscriptionsWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}