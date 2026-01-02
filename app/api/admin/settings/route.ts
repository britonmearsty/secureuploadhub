import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  description: z.string().optional(),
  category: z.string().default('general'),
  isPublic: z.boolean().default(false),
});

const updateSettingSchema = z.object({
  value: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');

    const where: any = {};
    if (category) where.category = category;
    if (isPublic !== null) where.isPublic = isPublic === 'true';

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
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
    const validatedData = createSettingSchema.parse(body);

    const setting = await prisma.systemSetting.create({
      data: {
        ...validatedData,
        updatedBy: session.user.id,
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: 'CREATE_SYSTEM_SETTING',
        resource: 'SystemSetting',
        resourceId: setting.id,
        details: {
          key: setting.key,
          category: setting.category,
        },
      }
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error creating system setting:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create system setting' },
      { status: 500 }
    );
  }
}