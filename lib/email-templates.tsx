/**
 * Email template wrapper functions
 * Simplifies sending emails with pre-configured templates
 */

import { sendEmail, SendEmailOptions } from './email-service';
import { VerificationEmail } from '@/emails/VerificationEmail';
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail';
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { UploadNotificationEmail } from '@/emails/UploadNotificationEmail';
import { SignInEmail } from '@/emails/SignInEmail';

export interface SendVerificationEmailOptions {
  to: string;
  userFirstname?: string;
  verificationLink: string;
  expiresIn?: string;
}

export interface SendResetPasswordEmailOptions {
  to: string;
  userFirstname?: string;
  resetLink: string;
  expiresIn?: string;
}

export interface SendWelcomeEmailOptions {
  to: string;
  userFirstname?: string;
  dashboardUrl?: string;
}

export interface SendUploadNotificationOptions {
  to: string;
  portalName: string;
  fileName: string;
  fileSize: number;
  clientName?: string;
  clientEmail?: string;
  clientMessage?: string;
  uploadedAt?: Date;
  dashboardUrl: string;
  portalUrl?: string;
}

export interface SendSignInNotificationOptions {
  to: string;
  userFirstname?: string;
  signInDate?: string;
  signInDevice?: string;
  signInLocation?: string;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(options: SendVerificationEmailOptions) {
  return sendEmail({
    to: options.to,
    subject: 'Verify your SecureUploadHub account',
    react: (
      <VerificationEmail
        userFirstname={options.userFirstname}
        verificationLink={options.verificationLink}
        expiresIn={options.expiresIn}
      />
    ),
  });
}

/**
 * Send password reset email
 */
export async function sendResetPasswordEmail(options: SendResetPasswordEmailOptions) {
  return sendEmail({
    to: options.to,
    subject: 'Reset your SecureUploadHub password',
    react: (
      <ResetPasswordEmail
        userFirstname={options.userFirstname}
        resetLink={options.resetLink}
        expiresIn={options.expiresIn}
      />
    ),
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(options: SendWelcomeEmailOptions) {
  return sendEmail({
    to: options.to,
    subject: 'Welcome to SecureUploadHub',
    react: (
      <WelcomeEmail
        userFirstname={options.userFirstname}
        dashboardUrl={options.dashboardUrl}
      />
    ),
  });
}

/**
 * Send upload notification email to portal owner
 */
export async function sendUploadNotification(options: SendUploadNotificationOptions) {
  return sendEmail({
    to: options.to,
    subject: `New file uploaded to ${options.portalName}`,
    react: (
      <UploadNotificationEmail
        portalName={options.portalName}
        fileName={options.fileName}
        fileSize={options.fileSize}
        clientName={options.clientName}
        clientEmail={options.clientEmail}
        clientMessage={options.clientMessage}
        uploadedAt={options.uploadedAt || new Date()}
        dashboardUrl={options.dashboardUrl}
        portalUrl={options.portalUrl}
      />
    ),
  });
}

/**
 * Send sign-in notification email
 */
export async function sendSignInNotification(options: SendSignInNotificationOptions) {
  return sendEmail({
    to: options.to,
    subject: 'New sign-in to your SecureUploadHub account',
    react: (
      <SignInEmail
        userFirstname={options.userFirstname}
        signInDate={options.signInDate}
        signInDevice={options.signInDevice}
        signInLocation={options.signInLocation}
      />
    ),
  });
}

/**
 * Send verification email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendVerificationEmailSafe(
  email: string,
  verificationLink: string,
  userName?: string
): Promise<boolean> {
  try {
    const result = await sendVerificationEmail({
      to: email,
      userFirstname: userName,
      verificationLink,
      expiresIn: '24 hours',
    });
    return result.success;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send password reset email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendResetPasswordEmailSafe(
  email: string,
  resetLink: string,
  userName?: string
): Promise<boolean> {
  try {
    const result = await sendResetPasswordEmail({
      to: email,
      userFirstname: userName,
      resetLink,
      expiresIn: '1 hour',
    });
    return result.success;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send welcome email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendWelcomeEmailSafe(
  email: string,
  userName?: string,
  dashboardUrl?: string
): Promise<boolean> {
  try {
    const result = await sendWelcomeEmail({
      to: email,
      userFirstname: userName,
      dashboardUrl,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send upload notification and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendUploadNotificationSafe(
  portalOwnerEmail: string,
  portalName: string,
  fileName: string,
  fileSize: number,
  dashboardUrl: string,
  clientName?: string,
  clientEmail?: string
): Promise<boolean> {
  try {
    const result = await sendUploadNotification({
      to: portalOwnerEmail,
      portalName,
      fileName,
      fileSize,
      clientName,
      clientEmail,
      uploadedAt: new Date(),
      dashboardUrl,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending upload notification:', error);
    return false;
  }
}

/**
 * Send sign-in notification and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendSignInNotificationSafe(
  email: string,
  userName?: string,
  device?: string,
  location?: string
): Promise<boolean> {
  try {
    const result = await sendSignInNotification({
      to: email,
      userFirstname: userName,
      signInDate: new Date().toLocaleString(),
      signInDevice: device,
      signInLocation: location,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending sign-in notification:', error);
    return false;
  }
}
