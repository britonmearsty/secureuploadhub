import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit-log';

const statusChangeSchema = z.object({
  status: z.enum(['active', 'disabled']),
});

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
    const body = await request.json();
    const { status } = statusChangeSchema.parse(body);

    // Prevent self-disabling
    if (id === session.user.id && status === 'disabled') {
      return NextResponse.json(
        { error: 'Cannot disable your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, status: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        status,
        // If disabling, also invalidate all sessions
        ...(status === 'disabled' && {
          sessions: {
            deleteMany: {}
          }
        })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        image: true
      }
    });

    // Add audit log entry
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
        resource: 'user',
        resourceId: id,
        details: { 
          oldStatus: user.status, 
          newStatus: status,
          targetUserEmail: user.email,
          targetUserName: user.name
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User account ${status === 'active' ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('Error changing user status:', error);
    return NextResponse.json(
      { error: 'Failed to change user status' },
      { status: 500 }
    );
  }
}