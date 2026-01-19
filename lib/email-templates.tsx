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
import { SubscriptionActivatedEmail } from '@/emails/SubscriptionActivatedEmail';
import { SubscriptionCancelledEmail } from '@/emails/SubscriptionCancelledEmail';
import { PaymentFailedEmail } from '@/emails/PaymentFailedEmail';
import { SubscriptionRenewedEmail } from '@/emails/SubscriptionRenewedEmail';
import { SubscriptionExpiredEmail } from '@/emails/SubscriptionExpiredEmail';

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

export interface SendSubscriptionActivatedOptions {
  to: string;
  userFirstname?: string;
  planName: string;
  planPrice: number;
  currency: string;
  nextBillingDate: Date;
  dashboardUrl: string;
  features: string[];
}

export interface SendSubscriptionCancelledOptions {
  to: string;
  userFirstname?: string;
  planName: string;
  cancelledAt: Date;
  accessUntil?: Date;
  reason?: string;
  dashboardUrl: string;
  reactivateUrl?: string;
}

export interface SendPaymentFailedOptions {
  to: string;
  userFirstname?: string;
  planName: string;
  amount: number;
  currency: string;
  failedAt: Date;
  retryDate?: Date;
  gracePeriodEnd?: Date;
  updatePaymentUrl: string;
  dashboardUrl: string;
  reason?: string;
}

export interface SendSubscriptionRenewedOptions {
  to: string;
  userFirstname?: string;
  planName: string;
  amount: number;
  currency: string;
  renewedAt: Date;
  nextBillingDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  dashboardUrl: string;
  invoiceUrl?: string;
}

export interface SendSubscriptionExpiredOptions {
  to: string;
  userFirstname?: string;
  planName: string;
  expiredAt: Date;
  gracePeriodEnd?: Date;
  reactivateUrl: string;
  dashboardUrl: string;
  freeFeatures: string[];
}

export interface SendPasswordResetEmailOptions {
  to: string;
  name: string;
  resetToken: string;
  adminInitiated?: boolean;
}

export interface SendPortalTransferNotificationOptions {
  to: string;
  name: string;
  portalName: string;
  newOwnerName?: string;
  oldOwnerName?: string;
  isOldOwner: boolean;
}

export interface SendRefundNotificationOptions {
  to: string;
  name: string;
  refundAmount: number;
  currency: string;
  reason: string;
  originalPaymentDate: Date;
  planName: string;
}

export interface SendPlanMigrationNotificationOptions {
  to: string;
  name: string;
  oldPlanName: string;
  newPlanName: string;
  effectiveDate: Date;
  prorationAmount?: number;
  currency: string;
  reason?: string;
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
 * Send subscription activated email
 */
export async function sendSubscriptionActivated(options: SendSubscriptionActivatedOptions) {
  return sendEmail({
    to: options.to,
    subject: `Your ${options.planName} subscription is now active!`,
    react: (
      <SubscriptionActivatedEmail
        userFirstname={options.userFirstname}
        planName={options.planName}
        planPrice={options.planPrice}
        currency={options.currency}
        nextBillingDate={options.nextBillingDate}
        dashboardUrl={options.dashboardUrl}
        features={options.features}
      />
    ),
  });
}

/**
 * Send subscription cancelled email
 */
export async function sendSubscriptionCancelled(options: SendSubscriptionCancelledOptions) {
  return sendEmail({
    to: options.to,
    subject: `Your ${options.planName} subscription has been cancelled`,
    react: (
      <SubscriptionCancelledEmail
        userFirstname={options.userFirstname}
        planName={options.planName}
        cancelledAt={options.cancelledAt}
        accessUntil={options.accessUntil}
        reason={options.reason}
        dashboardUrl={options.dashboardUrl}
        reactivateUrl={options.reactivateUrl}
      />
    ),
  });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailed(options: SendPaymentFailedOptions) {
  return sendEmail({
    to: options.to,
    subject: `Payment failed for your ${options.planName} subscription`,
    react: (
      <PaymentFailedEmail
        userFirstname={options.userFirstname}
        planName={options.planName}
        amount={options.amount}
        currency={options.currency}
        failedAt={options.failedAt}
        retryDate={options.retryDate}
        gracePeriodEnd={options.gracePeriodEnd}
        updatePaymentUrl={options.updatePaymentUrl}
        dashboardUrl={options.dashboardUrl}
        reason={options.reason}
      />
    ),
  });
}

/**
 * Send subscription renewed email
 */
export async function sendSubscriptionRenewed(options: SendSubscriptionRenewedOptions) {
  return sendEmail({
    to: options.to,
    subject: `Your ${options.planName} subscription has been renewed`,
    react: (
      <SubscriptionRenewedEmail
        userFirstname={options.userFirstname}
        planName={options.planName}
        amount={options.amount}
        currency={options.currency}
        renewedAt={options.renewedAt}
        nextBillingDate={options.nextBillingDate}
        currentPeriodStart={options.currentPeriodStart}
        currentPeriodEnd={options.currentPeriodEnd}
        dashboardUrl={options.dashboardUrl}
        invoiceUrl={options.invoiceUrl}
      />
    ),
  });
}

/**
 * Send subscription expired email
 */
export async function sendSubscriptionExpired(options: SendSubscriptionExpiredOptions) {
  return sendEmail({
    to: options.to,
    subject: `Your ${options.planName} subscription has expired`,
    react: (
      <SubscriptionExpiredEmail
        userFirstname={options.userFirstname}
        planName={options.planName}
        expiredAt={options.expiredAt}
        gracePeriodEnd={options.gracePeriodEnd}
        reactivateUrl={options.reactivateUrl}
        dashboardUrl={options.dashboardUrl}
        freeFeatures={options.freeFeatures}
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

/**
 * Send subscription activated email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendSubscriptionActivatedSafe(
  email: string,
  planName: string,
  planPrice: number,
  currency: string,
  nextBillingDate: Date,
  dashboardUrl: string,
  features: string[],
  userName?: string
): Promise<boolean> {
  try {
    const result = await sendSubscriptionActivated({
      to: email,
      userFirstname: userName,
      planName,
      planPrice,
      currency,
      nextBillingDate,
      dashboardUrl,
      features,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending subscription activated email:', error);
    return false;
  }
}

/**
 * Send subscription cancelled email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendSubscriptionCancelledSafe(
  email: string,
  planName: string,
  cancelledAt: Date,
  dashboardUrl: string,
  userName?: string,
  accessUntil?: Date,
  reason?: string,
  reactivateUrl?: string
): Promise<boolean> {
  try {
    const result = await sendSubscriptionCancelled({
      to: email,
      userFirstname: userName,
      planName,
      cancelledAt,
      accessUntil,
      reason,
      dashboardUrl,
      reactivateUrl,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending subscription cancelled email:', error);
    return false;
  }
}

/**
 * Send payment failed email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendPaymentFailedSafe(
  email: string,
  planName: string,
  amount: number,
  currency: string,
  failedAt: Date,
  updatePaymentUrl: string,
  dashboardUrl: string,
  userName?: string,
  retryDate?: Date,
  gracePeriodEnd?: Date,
  reason?: string
): Promise<boolean> {
  try {
    const result = await sendPaymentFailed({
      to: email,
      userFirstname: userName,
      planName,
      amount,
      currency,
      failedAt,
      retryDate,
      gracePeriodEnd,
      updatePaymentUrl,
      dashboardUrl,
      reason,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    return false;
  }
}

/**
 * Send subscription renewed email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendSubscriptionRenewedSafe(
  email: string,
  planName: string,
  amount: number,
  currency: string,
  renewedAt: Date,
  nextBillingDate: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  dashboardUrl: string,
  userName?: string,
  invoiceUrl?: string
): Promise<boolean> {
  try {
    const result = await sendSubscriptionRenewed({
      to: email,
      userFirstname: userName,
      planName,
      amount,
      currency,
      renewedAt,
      nextBillingDate,
      currentPeriodStart,
      currentPeriodEnd,
      dashboardUrl,
      invoiceUrl,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending subscription renewed email:', error);
    return false;
  }
}

/**
 * Send subscription expired email and handle errors gracefully
 * Returns true if successful, false if failed
 */
export async function sendSubscriptionExpiredSafe(
  email: string,
  planName: string,
  expiredAt: Date,
  reactivateUrl: string,
  dashboardUrl: string,
  freeFeatures: string[],
  userName?: string,
  gracePeriodEnd?: Date
): Promise<boolean> {
  try {
    const result = await sendSubscriptionExpired({
      to: email,
      userFirstname: userName,
      planName,
      expiredAt,
      gracePeriodEnd,
      reactivateUrl,
      dashboardUrl,
      freeFeatures,
    });
    return result.success;
  } catch (error) {
    console.error('Error sending subscription expired email:', error);
    return false;
  }
}

/**
 * Send password reset email (admin initiated)
 */
export async function sendPasswordResetEmail(options: SendPasswordResetEmailOptions) {
  const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${options.resetToken}`;
  
  return sendEmail({
    to: options.to,
    subject: options.adminInitiated 
      ? 'Password reset requested by administrator' 
      : 'Reset your SecureUploadHub password',
    react: (
      <ResetPasswordEmail
        userFirstname={options.name}
        resetLink={resetLink}
        expiresIn="24 hours"
      />
    ),
  });
}

/**
 * Send portal transfer notification
 */
export async function sendPortalTransferNotification(options: SendPortalTransferNotificationOptions) {
  const subject = options.isOldOwner 
    ? `Portal "${options.portalName}" has been transferred`
    : `You now own portal "${options.portalName}"`;

  // Create a simple React component for the email
  const EmailContent = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Portal Transfer Notification</h2>
      <p>Hello {options.name},</p>
      {options.isOldOwner 
        ? <p>Your portal "<strong>{options.portalName}</strong>" has been transferred to {options.newOwnerName}.</p>
        : <p>You are now the owner of portal "<strong>{options.portalName}</strong>", transferred from {options.oldOwnerName}.</p>
      }
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br />SecureUploadHub Team</p>
    </div>
  );

  return sendEmail({
    to: options.to,
    subject,
    react: <EmailContent />,
  });
}

/**
 * Send refund notification
 */
export async function sendRefundNotification(options: SendRefundNotificationOptions) {
  const EmailContent = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Refund Processed</h2>
      <p>Hello {options.name},</p>
      <p>We have processed a refund for your {options.planName} subscription.</p>
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
        <p><strong>Refund Amount:</strong> {options.refundAmount} {options.currency}</p>
        <p><strong>Reason:</strong> {options.reason}</p>
        <p><strong>Original Payment Date:</strong> {options.originalPaymentDate.toLocaleDateString()}</p>
      </div>
      <p>The refund will appear in your account within 5-10 business days.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br />SecureUploadHub Team</p>
    </div>
  );

  return sendEmail({
    to: options.to,
    subject: `Refund processed for your ${options.planName} subscription`,
    react: <EmailContent />,
  });
}

/**
 * Send plan migration notification
 */
export async function sendPlanMigrationNotification(options: SendPlanMigrationNotificationOptions) {
  const EmailContent = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Subscription Updated</h2>
      <p>Hello {options.name},</p>
      <p>Your subscription has been updated by our team.</p>
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
        <p><strong>Previous Plan:</strong> {options.oldPlanName}</p>
        <p><strong>New Plan:</strong> {options.newPlanName}</p>
        <p><strong>Effective Date:</strong> {options.effectiveDate.toLocaleDateString()}</p>
        {options.prorationAmount && <p><strong>Proration Amount:</strong> {options.prorationAmount} {options.currency}</p>}
        {options.reason && <p><strong>Reason:</strong> {options.reason}</p>}
      </div>
      <p>Your new plan features are now active. You can view your updated subscription details in your dashboard.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br />SecureUploadHub Team</p>
    </div>
  );

  return sendEmail({
    to: options.to,
    subject: `Your subscription has been updated to ${options.newPlanName}`,
    react: <EmailContent />,
  });
}
