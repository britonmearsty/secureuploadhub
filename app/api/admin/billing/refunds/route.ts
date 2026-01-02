import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { sendRefundNotification } from '@/lib/email-templates';

const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().min(0.01, 'Refund amount must be greater than 0'),
  reason: z.string().min(1, 'Refund reason is required'),
  notifyCustomer: z.boolean().default(true),
  partialRefund: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, amount, reason, notifyCustomer, partialRefund } = refundSchema.parse(body);

    // Get payment details
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
                price: true,
                currency: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only refund completed payments' },
        { status: 400 }
      );
    }

    // Check if refund amount is valid
    if (amount > payment.amount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed payment amount' },
        { status: 400 }
      );
    }

    // Check for existing refunds
    const existingRefunds = await prisma.payment.findMany({
      where: {
        providerPaymentRef: payment.id, // Assuming refunds reference original payment
        description: { contains: 'Refund' }
      }
    });

    const totalRefunded = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
    const remainingAmount = payment.amount - totalRefunded;

    if (amount > remainingAmount) {
      return NextResponse.json(
        { error: `Cannot refund ${amount}. Only ${remainingAmount} remaining after previous refunds` },
        { status: 400 }
      );
    }

    // Process refund with payment provider (Paystack in this case)
    let providerRefundId: string | null = null;
    try {
      // TODO: Implement actual Paystack refund API call
      // const paystackRefund = await processPaystackRefund({
      //   paymentReference: payment.providerPaymentRef,
      //   amount: amount * 100, // Convert to kobo for Paystack
      //   reason
      // });
      // providerRefundId = paystackRefund.id;
      
      // For now, simulate successful refund
      providerRefundId = `refund_${Date.now()}`;
    } catch (providerError) {
      console.error('Payment provider refund failed:', providerError);
      return NextResponse.json(
        { error: 'Failed to process refund with payment provider' },
        { status: 500 }
      );
    }

    // Create refund record
    const refund = await prisma.payment.create({
      data: {
        userId: payment.userId,
        subscriptionId: payment.subscriptionId,
        amount: -amount, // Negative amount for refund
        currency: payment.currency,
        status: 'completed',
        description: `Refund: ${reason}`,
        providerPaymentId: providerRefundId,
        providerPaymentRef: payment.id, // Reference to original payment
        createdAt: new Date()
      }
    });

    // Update subscription if full refund and it affects current period
    if (!partialRefund && payment.subscriptionId) {
      const subscription = payment.subscription;
      if (subscription && subscription.status === 'active') {
        // For full refunds, you might want to:
        // 1. Cancel the subscription
        // 2. Adjust the current period
        // 3. Downgrade to free plan
        
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            // Decide based on your business logic
            cancelAtPeriodEnd: true,
            updatedAt: new Date()
          }
        });
      }
    }

    // Send notification to customer
    if (notifyCustomer && payment.user) {
      try {
        await sendRefundNotification({
          to: payment.user.email,
          name: payment.user.name || 'Customer',
          refundAmount: amount,
          currency: payment.currency,
          reason,
          originalPaymentDate: payment.createdAt,
          planName: payment.subscription?.plan?.name || 'Service'
        });
      } catch (emailError) {
        console.error('Failed to send refund notification:', emailError);
        // Don't fail the refund if email fails
      }
    }

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'REFUND_PROCESSED',
    //   resource: 'payment',
    //   resourceId: paymentId,
    //   details: {
    //     refundId: refund.id,
    //     refundAmount: amount,
    //     originalAmount: payment.amount,
    //     reason,
    //     customerEmail: payment.user?.email,
    //     providerRefundId,
    //     partialRefund
    //   }
    // });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount,
        currency: payment.currency,
        reason,
        processedAt: refund.createdAt,
        providerRefundId
      },
      message: `Refund of ${amount} ${payment.currency} processed successfully`
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

// Get refund history
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

    // Get all refund records (negative amounts)
    const [refunds, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: {
          amount: { lt: 0 }, // Negative amounts are refunds
          description: { contains: 'Refund' }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          subscription: {
            include: {
              plan: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      prisma.payment.count({
        where: {
          amount: { lt: 0 },
          description: { contains: 'Refund' }
        }
      })
    ]);

    // Calculate refund statistics
    const totalRefunded = await prisma.payment.aggregate({
      where: {
        amount: { lt: 0 },
        description: { contains: 'Refund' }
      },
      _sum: {
        amount: true
      }
    });

    return NextResponse.json({
      refunds: refunds.map(refund => ({
        id: refund.id,
        amount: Math.abs(refund.amount), // Show as positive
        currency: refund.currency,
        reason: refund.description?.replace('Refund: ', '') || 'No reason provided',
        processedAt: refund.createdAt,
        customer: refund.user,
        plan: refund.subscription?.plan?.name,
        providerRefundId: refund.providerPaymentId
      })),
      statistics: {
        totalRefunds: totalCount,
        totalRefundedAmount: Math.abs(totalRefunded._sum.amount || 0)
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refunds' },
      { status: 500 }
    );
  }
}