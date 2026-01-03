import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit-log';

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  maxPortals: z.number().min(1).optional(),
  maxStorageGB: z.number().min(1).optional(),
  maxUploadsMonth: z.number().min(1).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const plan = await prisma.billingPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        },
        subscriptions: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });

  } catch (error) {
    console.error('Error fetching plan details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updateData = updatePlanSchema.parse(body);

    // Check if plan exists
    const existingPlan = await prisma.billingPlan.findUnique({
      where: { id }
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // If updating name, check for conflicts
    if (updateData.name && updateData.name !== existingPlan.name) {
      const nameConflict = await prisma.billingPlan.findUnique({
        where: { name: updateData.name }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Plan with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updatedPlan = await prisma.billingPlan.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'BILLING_PLAN_UPDATED',
    //   resource: 'billing_plan',
    //   resourceId: id,
    //   details: { 
    //     oldData: existingPlan,
    //     newData: updateData
    //   }
    // });

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: 'Billing plan updated successfully'
    });

  } catch (error) {
    console.error('Error updating billing plan:', error);
    return NextResponse.json(
      { error: 'Failed to update billing plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const migrateToPlanId = url.searchParams.get('migrateTo');

    // Check if plan exists and has active subscriptions
    const plan = await prisma.billingPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: {
            status: { in: ['active', 'past_due', 'incomplete'] }
          }
        },
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // If plan has active subscriptions and no force flag, return error with details
    if (plan._count.subscriptions > 0 && !force) {
      return NextResponse.json(
        { 
          error: 'Cannot delete plan with active subscriptions',
          details: {
            activeSubscriptions: plan._count.subscriptions,
            canForceDelete: true,
            requiresMigration: true
          }
        },
        { status: 400 }
      );
    }

    // Handle force deletion with subscription migration
    if (force && plan.subscriptions.length > 0) {
      if (!migrateToPlanId) {
        return NextResponse.json(
          { error: 'Migration plan ID required when force deleting plan with subscriptions' },
          { status: 400 }
        );
      }

      // Verify migration target plan exists
      const migrationPlan = await prisma.billingPlan.findUnique({
        where: { id: migrateToPlanId, isActive: true }
      });

      if (!migrationPlan) {
        return NextResponse.json(
          { error: 'Migration target plan not found or inactive' },
          { status: 400 }
        );
      }

      // Migrate all subscriptions to the new plan
      await prisma.$transaction(async (tx) => {
        // Update all subscriptions to new plan
        await tx.subscription.updateMany({
          where: { planId: id },
          data: { planId: migrateToPlanId }
        });

        // Create subscription history entries for each migration
        const subscriptionHistoryEntries = plan.subscriptions.map(sub => ({
          subscriptionId: sub.id,
          action: 'plan_changed',
          oldValue: JSON.stringify({ planId: id, planName: plan.name }),
          newValue: JSON.stringify({ planId: migrateToPlanId, planName: migrationPlan.name }),
          reason: `Plan migrated due to deletion of ${plan.name}`
        }));

        await tx.subscriptionHistory.createMany({
          data: subscriptionHistoryEntries
        });

        // Delete the plan
        await tx.billingPlan.delete({
          where: { id }
        });
      });

      // Create audit log
      if (session.user.id) {
        await createAuditLog({
          userId: session.user.id,
          action: AUDIT_ACTIONS.BILLING_PLAN_DELETED,
          resource: 'billing_plan',
          resourceId: id,
          details: { 
            planName: plan.name, 
            price: plan.price,
            migratedSubscriptions: plan.subscriptions.length,
            migrationPlanId: migrateToPlanId,
            migrationPlanName: migrationPlan.name
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Plan deleted successfully. ${plan.subscriptions.length} subscriptions migrated to ${migrationPlan.name}`
      });
    }

    // Standard deletion (no active subscriptions)
    await prisma.billingPlan.delete({
      where: { id }
    });

    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.BILLING_PLAN_DELETED,
        resource: 'billing_plan',
        resourceId: id,
        details: { planName: plan.name, price: plan.price }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Billing plan deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting billing plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete billing plan' },
      { status: 500 }
    );
  }
}