import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit-log';

const roleChangeSchema = z.object({
  role: z.enum(['user', 'admin']),
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
    const { role } = roleChangeSchema.parse(body);

    // Prevent self-demotion
    if (session.user.id && id === session.user.id && role === 'user') {
      return NextResponse.json(
        { error: 'Cannot demote yourself from admin role' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, name: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        image: true
      }
    });

    // Add audit log entry
    if (session.user.id) {
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        resource: 'user',
        resourceId: id,
        details: { 
          oldRole: user.role, 
          newRole: role,
          targetUserEmail: user.email,
          targetUserName: user.name
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User role changed to ${role}`
    });

  } catch (error) {
    console.error('Error changing user role:', error);
    return NextResponse.json(
      { error: 'Failed to change user role' },
      { status: 500 }
    );
  }
}