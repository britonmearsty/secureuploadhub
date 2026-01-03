import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail } from '@/lib/email-service';
import React from 'react';

const testEmailSchema = z.object({
  testEmail: z.string().email('Invalid email address')
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
    const { testEmail } = testEmailSchema.parse(body);

    // Fetch the template
    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Replace variables with test data
    let htmlContent = template.htmlContent;
    let textContent = template.textContent || '';
    let subject = template.subject;

    const testVariables: Record<string, string> = {
      user_name: 'Test User',
      company_name: 'SecureUploadHub',
      dashboard_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
      support_email: 'support@secureuploadhub.com',
      current_date: new Date().toLocaleDateString(),
      user_email: testEmail,
      portal_name: 'Test Portal',
      file_name: 'test-file.pdf'
    };

    // Replace variables in content
    Object.entries(testVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      htmlContent = htmlContent.replace(regex, value);
      textContent = textContent.replace(regex, value);
      subject = subject.replace(regex, value);
    });

    // Send test email - create a React component from HTML
    const EmailComponent = () => React.createElement('div', {
      dangerouslySetInnerHTML: { __html: htmlContent }
    });

    const emailResult = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      react: React.createElement(EmailComponent)
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      messageId: emailResult.messageId
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}

