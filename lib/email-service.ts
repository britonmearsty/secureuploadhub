/**
 * Email Service using Resend and React Email
 * Handles sending emails with React components
 */

import { Resend } from 'resend';
import { JSX } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: JSX.Element;
  from?: string;
  replyTo?: string;
  bcc?: string | string[];
  cc?: string | string[];
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
  scheduledAt?: string;
}

/**
 * Send email using Resend with React Email component
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('Email not sent - RESEND_API_KEY not configured');
    console.log('Would have sent email to:', options.to);
    console.log('Subject:', options.subject);
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
    };
  }

  const fromAddress = options.from || process.env.EMAIL_FROM;

  if (!fromAddress) {
    console.warn('Email not sent - From address (EMAIL_FROM) not configured');
    return {
      success: false,
      error: 'From address not configured',
    };
  }

  try {
    const response = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to : options.to,
      subject: options.subject,
      react: options.react,
      replyTo: options.replyTo,
      bcc: options.bcc,
      cc: options.cc,
      tags: options.tags,
      headers: options.headers,
      scheduledAt: options.scheduledAt,
    });

    if (response.error) {
      console.error('Failed to send email:', response.error);
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send batch emails
 */
export async function sendBatchEmails(emails: SendEmailOptions[]): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(email);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, sent, failed };
}

export { resend };
