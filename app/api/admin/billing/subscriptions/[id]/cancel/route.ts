import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit-log';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id },
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
            name: true
          }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Update subscription to cancel at period end
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        cancelAtPeriodEnd: true,
        status: 'active' // Keep active until period ends
      }
    });

    // Create audit log
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: 'CANCEL_SUBSCRIPTION',
        resource: 'subscription',
        resourceId: id,
        details: {
          subscriptionId: id,
          userId: subscription.user.id,
          userEmail: subscription.user.email,
          planName: subscription.plan.name,
          cancelledBy: session.user.email,
          cancelAtPeriodEnd: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: 'Subscription will be cancelled at the end of the billing period'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

