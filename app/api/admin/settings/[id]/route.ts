import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSettingSchema = z.object({
  value: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { id }
    });

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error fetching system setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system setting' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSettingSchema.parse(body);

    const existingSetting = await prisma.systemSetting.findUnique({
      where: { id }
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    const setting = await prisma.systemSetting.update({
      where: { id },
      data: {
        ...validatedData,
        updatedBy: session.user.id,
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: 'UPDATE_SYSTEM_SETTING',
        resource: 'SystemSetting',
        resourceId: setting.id,
        details: {
          key: setting.key,
          changes: validatedData,
          previousValue: existingSetting.value,
        },
      }
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error updating system setting:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update system setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingSetting = await prisma.systemSetting.findUnique({
      where: { id }
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    await prisma.systemSetting.delete({
      where: { id }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: 'DELETE_SYSTEM_SETTING',
        resource: 'SystemSetting',
        resourceId: id,
        details: {
          key: existingSetting.key,
          category: existingSetting.category,
        },
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting system setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete system setting' },
      { status: 500 }
    );
  }
}