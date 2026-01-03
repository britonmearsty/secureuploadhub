import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit-log';

const planSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
  maxPortals: z.number().min(1),
  maxStorageGB: z.number().min(1),
  maxUploadsMonth: z.number().min(1)
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await prisma.billingPlan.findMany({
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      },
      orderBy: { price: 'asc' }
    });

    return NextResponse.json({ plans });

  } catch (error) {
    console.error('Error fetching billing plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const planData = planSchema.parse(body);

    // Check if plan name already exists
    const existingPlan = await prisma.billingPlan.findUnique({
      where: { name: planData.name }
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Plan with this name already exists' },
        { status: 400 }
      );
    }

    const plan = await prisma.billingPlan.create({
      data: planData,
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    // Add audit log entry
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.BILLING_PLAN_CREATED,
        resource: 'billing_plan',
        resourceId: plan.id,
        details: { 
          planName: plan.name, 
          price: plan.price,
          currency: plan.currency,
          maxPortals: plan.maxPortals,
          maxStorageGB: plan.maxStorageGB,
          maxUploadsMonth: plan.maxUploadsMonth
        }
      });
    }

    return NextResponse.json({
      success: true,
      plan,
      message: 'Billing plan created successfully'
    });

  } catch (error) {
    console.error('Error creating billing plan:', error);
    return NextResponse.json(
      { error: 'Failed to create billing plan' },
      { status: 500 }
    );
  }
}