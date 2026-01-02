import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { sendPlanMigrationNotification } from '@/lib/email-templates';

const migrationSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  newPlanId: z.string().min(1, 'New plan ID is required'),
  effectiveDate: z.enum(['immediate', 'next_period']).default('immediate'),
  prorateBilling: z.boolean().default(true),
  notifyCustomer: z.boolean().default(true),
  reason: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      subscriptionId, 
      newPlanId, 
      effectiveDate, 
      prorateBilling, 
      notifyCustomer, 
      reason 
    } = migrationSchema.parse(body);

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        plan: true
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only migrate active subscriptions' },
        { status: 400 }
      );
    }

    // Get new plan
    const newPlan = await prisma.billingPlan.findUnique({
      where: { id: newPlanId }
    });

    if (!newPlan) {
      return NextResponse.json({ error: 'New plan not found' }, { status: 404 });
    }

    if (!newPlan.isActive) {
      return NextResponse.json(
        { error: 'Cannot migrate to inactive plan' },
        { status: 400 }
      );
    }

    if (subscription.planId === newPlanId) {
      return NextResponse.json(
        { error: 'Subscription is already on this plan' },
        { status: 400 }
      );
    }

    // Calculate proration if needed
    let prorationAmount = 0;
    let prorationDescription = '';

    if (prorateBilling && effectiveDate === 'immediate') {
      const now = new Date();
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;
      
      // Calculate remaining days in current period
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (remainingDays > 0) {
        // Calculate prorated amounts
        const oldPlanDailyRate = subscription.plan.price / totalDays;
        const newPlanDailyRate = newPlan.price / totalDays;
        
        const oldPlanRefund = oldPlanDailyRate * remainingDays;
        const newPlanCharge = newPlanDailyRate * remainingDays;
        
        prorationAmount = newPlanCharge - oldPlanRefund;
        prorationDescription = `Plan migration proration: ${remainingDays} days remaining`;
      }
    }

    // Update subscription
    const updatedSubscription = await prisma.$transaction(async (tx) => {
      // Update the subscription
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId: newPlanId,
          updatedAt: new Date(),
          // If immediate, keep current period dates
          // If next_period, the period dates will be updated by the billing system
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          plan: true
        }
      });

      // Create proration payment record if needed
      if (prorationAmount !== 0) {
        await tx.payment.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscriptionId,
            amount: Math.abs(prorationAmount),
            currency: subscription.plan.currency,
            status: prorationAmount > 0 ? 'pending' : 'completed',
            description: prorationDescription,
            providerPaymentId: `proration_${Date.now()}`,
            createdAt: new Date()
          }
        });
      }

      return updated;
    });

    // Process payment provider changes if needed
    if (subscription.providerSubscriptionId) {
      try {
        // TODO: Update subscription with payment provider (Paystack)
        // await updatePaystackSubscription({
        //   subscriptionId: subscription.providerSubscriptionId,
        //   newPlanCode: newPlan.providerPlanId,
        //   effectiveDate
        // });
      } catch (providerError) {
        console.error('Payment provider update failed:', providerError);
        // You might want to rollback the database changes here
        return NextResponse.json(
          { error: 'Failed to update subscription with payment provider' },
          { status: 500 }
        );
      }
    }

    // Send notification to customer
    if (notifyCustomer && subscription.user) {
      try {
        await sendPlanMigrationNotification({
          to: subscription.user.email,
          name: subscription.user.name || 'Customer',
          oldPlanName: subscription.plan.name,
          newPlanName: newPlan.name,
          effectiveDate: effectiveDate === 'immediate' ? new Date() : subscription.currentPeriodEnd,
          prorationAmount,
          currency: subscription.plan.currency,
          reason
        });
      } catch (emailError) {
        console.error('Failed to send migration notification:', emailError);
        // Don't fail the migration if email fails
      }
    }

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'SUBSCRIPTION_MIGRATED',
    //   resource: 'subscription',
    //   resourceId: subscriptionId,
    //   details: {
    //     oldPlanId: subscription.planId,
    //     oldPlanName: subscription.plan.name,
    //     newPlanId,
    //     newPlanName: newPlan.name,
    //     effectiveDate,
    //     prorationAmount,
    //     customerEmail: subscription.user?.email,
    //     reason
    //   }
    // });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      migration: {
        oldPlan: subscription.plan,
        newPlan,
        effectiveDate,
        prorationAmount,
        prorationDescription
      },
      message: `Subscription migrated from ${subscription.plan.name} to ${newPlan.name}`
    });

  } catch (error) {
    console.error('Error migrating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to migrate subscription' },
      { status: 500 }
    );
  }
}

// Get migration history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get recent subscription updates (migrations)
    // Note: This is a simplified approach. In a real system, you'd want a dedicated migration log table
    const [recentMigrations, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          updatedAt: {
            not: {
              equals: prisma.subscription.fields.createdAt
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              currency: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip
      }),

      prisma.subscription.count({
        where: {
          updatedAt: {
            not: {
              equals: prisma.subscription.fields.createdAt
            }
          }
        }
      })
    ]);

    return NextResponse.json({
      migrations: recentMigrations.map(sub => ({
        id: sub.id,
        customer: sub.user,
        currentPlan: sub.plan,
        migratedAt: sub.updatedAt,
        status: sub.status
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching migration history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migration history' },
      { status: 500 }
    );
  }
}