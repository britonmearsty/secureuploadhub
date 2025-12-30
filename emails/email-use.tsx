/**
 * Example usage of the email service with React Email templates
 * 
 * This file demonstrates how to use the email service with different email templates.
 * Import and use as needed in your application.
 */

import { sendEmail } from '@/lib/email-service';
import { VerificationEmail } from './VerificationEmail';
import { ResetPasswordEmail } from './ResetPasswordEmail';
import { WelcomeEmail } from './WelcomeEmail';
import { UploadNotificationEmail } from './UploadNotificationEmail';
import { SignInEmail } from './SignInEmail';

// Example 1: Send a verification email
export async function sendVerificationEmailExample(userEmail: string, verificationToken: string) {
  const result = await sendEmail({
    to: userEmail,
    subject: 'Verify your SecureUploadHub account',
    react: (
      <VerificationEmail
        userFirstname="John"
        verificationLink={`https://secureuploadhub.com/verify?token=${verificationToken}`}
        expiresIn="24 hours"
      />
    ),
  });

  return result;
}

// Example 2: Send a password reset email
export async function sendPasswordResetEmailExample(userEmail: string, resetToken: string) {
  const result = await sendEmail({
    to: userEmail,
    subject: 'Reset your SecureUploadHub password',
    react: (
      <ResetPasswordEmail
        userFirstname="John"
        resetLink={`https://secureuploadhub.com/reset-password?token=${resetToken}`}
        expiresIn="1 hour"
      />
    ),
  });

  return result;
}

// Example 3: Send a welcome email
export async function sendWelcomeEmailExample(userEmail: string, userName: string) {
  const result = await sendEmail({
    to: userEmail,
    subject: 'Welcome to SecureUploadHub',
    react: (
      <WelcomeEmail
        userFirstname={userName}
        dashboardUrl="https://secureuploadhub.com/dashboard"
      />
    ),
  });

  return result;
}

// Example 4: Send an upload notification email
export async function sendUploadNotificationExample(
  portalOwnerEmail: string,
  portalName: string,
  fileName: string,
  fileSize: number
) {
  const result = await sendEmail({
    to: portalOwnerEmail,
    subject: `New file uploaded to ${portalName}`,
    react: (
      <UploadNotificationEmail
        portalName={portalName}
        fileName={fileName}
        fileSize={fileSize}
        clientName="John Doe"
        clientEmail="john@example.com"
        clientMessage="Here are the files you requested"
        uploadedAt={new Date()}
        dashboardUrl="https://secureuploadhub.com/dashboard"
        portalUrl={`https://secureuploadhub.com/portal/abc123`}
      />
    ),
  });

  return result;
}

// Example 5: Send a sign-in notification email
export async function sendSignInNotificationExample(userEmail: string, userName: string) {
  const result = await sendEmail({
    to: userEmail,
    subject: 'New sign-in to your SecureUploadHub account',
    react: (
      <SignInEmail
        userFirstname={userName}
        signInDate={new Date().toLocaleString()}
        signInDevice="Chrome on Windows 10"
        signInLocation="New York, USA"
      />
    ),
  });

  return result;
}

// Example 6: Send emails with custom options
export async function sendCustomEmailExample(userEmail: string) {
  const result = await sendEmail({
    to: userEmail,
    subject: 'Custom Email Example',
    react: <WelcomeEmail />,
    from: 'custom@secureuploadhub.com',
    replyTo: 'support@secureuploadhub.com',
    cc: 'admin@secureuploadhub.com',
    tags: [
      { name: 'type', value: 'welcome' },
      { name: 'user_id', value: '12345' },
    ],
  });

  return result;
}

// Example 7: Batch email sending
export async function sendBatchWelcomeEmailsExample() {
  const users = [
    { email: 'user1@example.com', name: 'Alice' },
    { email: 'user2@example.com', name: 'Bob' },
    { email: 'user3@example.com', name: 'Charlie' },
  ];

  const results = await Promise.all(
    users.map((user) =>
      sendEmail({
        to: user.email,
        subject: 'Welcome to SecureUploadHub',
        react: <WelcomeEmail userFirstname={user.name} />,
      })
    )
  );

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Batch email sent: ${succeeded} succeeded, ${failed} failed`);

  return { succeeded, failed };
}