import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email-templates';

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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        email: true, 
        name: true,
        status: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status === 'disabled') {
      return NextResponse.json(
        { error: 'Cannot reset password for disabled user' },
        { status: 400 }
      );
    }

    // Generate password reset token
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token (you might want to create a separate table for this)
    await prisma.user.update({
      where: { id },
      data: {
        // Note: You'll need to add these fields to your User model
        // resetToken,
        // resetTokenExpiry
      }
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name || 'User',
        resetToken,
        adminInitiated: true
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    // TODO: Add audit log entry
    // await createAuditLog({
    //   userId: session.user.id,
    //   action: 'PASSWORD_RESET_INITIATED',
    //   resource: 'user',
    //   resourceId: id,
    //   details: { targetUserEmail: user.email, adminInitiated: true }
    // });

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Error initiating password reset:', error);
    return NextResponse.json(
      { error: 'Failed to initiate password reset' },
      { status: 500 }
    );
  }
}