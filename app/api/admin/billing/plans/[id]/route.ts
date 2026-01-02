import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

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

    // Check if plan exists and has active subscriptions
    const plan = await prisma.billingPlan.findUnique({
      where: { id },
      include: {
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

    if (plan._count.subscriptions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscriptions' },
        { status: 400 }
      );
    }

    await prisma.billingPlan.delete({
      where: { id }
    });

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'BILLING_PLAN_DELETED',
    //   resource: 'billing_plan',
    //   resourceId: id,
    //   details: { planName: plan.name, price: plan.price }
    // });

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