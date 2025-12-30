# Email Integration Guide - Resend + React Email

This guide explains how to use the email service with Resend and React Email in SecureUploadHub.

## Installation

The required dependencies are already installed:
- `resend` - Resend SDK for Node.js
- `@react-email/components` - React Email component library
- `react-email` - React Email CLI (for development)

## Setup

### 1. Configure Environment Variables

Add to your `.env` file:

```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=SecureUploadHub <noreply@secureuploadhub.com>
```

To get your Resend API Key:
1. Sign up at https://resend.com
2. Go to API Keys: https://resend.com/api-keys
3. Click "Create API Key" and ensure "Full Access" is selected
4. Copy the API key and add it to your `.env` file

### 2. Email Service Usage

The main email service is located at `lib/email-service.ts`. Import and use it like this:

```typescript
import { sendEmail } from '@/lib/email-service';
import { VerificationEmail } from '@/emails/VerificationEmail';

// Send an email
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Verify your email',
  react: <VerificationEmail 
    userFirstname="John"
    verificationLink="https://example.com/verify?token=xyz"
    expiresIn="24 hours"
  />,
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Failed to send email:', result.error);
}
```

## Available Email Templates

### 1. VerificationEmail
For email verification during signup.

```typescript
import { VerificationEmail } from '@/emails/VerificationEmail';

await sendEmail({
  to: userEmail,
  subject: 'Verify your email',
  react: <VerificationEmail 
    userFirstname={user.name}
    verificationLink={`https://yourapp.com/verify?token=${token}`}
    expiresIn="24 hours"
  />,
});
```

**Props:**
- `userFirstname` (optional): User's first name
- `verificationLink` (required): Link to verification page
- `expiresIn` (optional): When the link expires (default: "24 hours")

---

### 2. ResetPasswordEmail
For password reset requests.

```typescript
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail';

await sendEmail({
  to: userEmail,
  subject: 'Reset your password',
  react: <ResetPasswordEmail 
    userFirstname={user.name}
    resetLink={`https://yourapp.com/reset?token=${token}`}
    expiresIn="1 hour"
  />,
});
```

**Props:**
- `userFirstname` (optional): User's first name
- `resetLink` (required): Link to password reset page
- `expiresIn` (optional): When the link expires (default: "1 hour")

---

### 3. SignInEmail
For sign-in notifications and security alerts.

```typescript
import { SignInEmail } from '@/emails/SignInEmail';

await sendEmail({
  to: userEmail,
  subject: 'New sign-in detected',
  react: <SignInEmail 
    userFirstname={user.name}
    signInDate={new Date().toLocaleDateString()}
    signInDevice="Chrome on Windows"
    signInLocation="New York, USA"
  />,
});
```

**Props:**
- `userFirstname` (optional): User's first name
- `signInDate` (optional): Date of sign-in
- `signInDevice` (optional): Device information
- `signInLocation` (optional): Location information

---

### 4. WelcomeEmail
Welcome new users after successful signup.

```typescript
import { WelcomeEmail } from '@/emails/WelcomeEmail';

await sendEmail({
  to: userEmail,
  subject: 'Welcome to SecureUploadHub',
  react: <WelcomeEmail 
    userFirstname={user.name}
    dashboardUrl="https://yourapp.com/dashboard"
  />,
});
```

**Props:**
- `userFirstname` (optional): User's first name
- `dashboardUrl` (optional): Link to user dashboard

---

### 5. UploadNotificationEmail
Notify portal owners of new file uploads.

```typescript
import { UploadNotificationEmail } from '@/emails/UploadNotificationEmail';

await sendEmail({
  to: portalOwnerEmail,
  subject: `New file uploaded to ${portal.name}`,
  react: <UploadNotificationEmail 
    portalName={portal.name}
    fileName={file.name}
    fileSize={file.size}
    clientName={upload.clientName}
    clientEmail={upload.clientEmail}
    clientMessage={upload.message}
    uploadedAt={new Date()}
    dashboardUrl="https://yourapp.com/dashboard/uploads"
    portalUrl={`https://yourapp.com/portal/${portal.id}`}
  />,
});
```

**Props:**
- `portalName` (required): Name of the upload portal
- `fileName` (required): Name of the uploaded file
- `fileSize` (required): File size in bytes
- `clientName` (optional): Name of the person who uploaded
- `clientEmail` (optional): Email of the uploader
- `clientMessage` (optional): Message from uploader
- `uploadedAt` (required): Date of upload
- `dashboardUrl` (required): Link to dashboard
- `portalUrl` (optional): Link to the portal

---

## Advanced Usage

### Sending Batch Emails

```typescript
import { sendBatchEmails } from '@/lib/email-service';

const emails = [
  {
    to: 'user1@example.com',
    subject: 'Welcome',
    react: <WelcomeEmail userFirstname="John" />,
  },
  {
    to: 'user2@example.com',
    subject: 'Welcome',
    react: <WelcomeEmail userFirstname="Jane" />,
  },
];

const result = await sendBatchEmails(emails);
console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

### Custom Options

The `sendEmail` function supports additional options:

```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  react: <YourEmail />,
  from: 'custom@example.com', // Override default from
  replyTo: 'reply@example.com',
  cc: 'cc@example.com',
  bcc: 'bcc@example.com',
  tags: [{ name: 'category', value: 'welcome' }],
  headers: { 'X-Custom': 'value' },
  scheduledAt: new Date(Date.now() + 3600000).toISOString(), // Schedule for 1 hour from now
});
```

---

## Testing Emails Locally

### Using React Email Preview Server

1. Run the preview server:
```bash
npm run email
```

2. Visit http://localhost:3000 in your browser

3. The preview server shows all your email templates and lets you test different props

### Creating Test Emails

Create a test file in the `emails` directory:

```typescript
// emails/test-email.tsx
import { WelcomeEmail } from './WelcomeEmail';

export default WelcomeEmail;
```

Then add it to the React Email preview server and view it.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Your Resend API key from https://resend.com/api-keys |
| `EMAIL_FROM` | No | Sender email address (default: `SecureUploadHub <noreply@secureuploadhub.com>`) |

---

## Error Handling

The `sendEmail` function returns an object with:

```typescript
{
  success: boolean,
  messageId?: string,  // Message ID if successful
  error?: string       // Error message if failed
}
```

Example error handling:

```typescript
const result = await sendEmail({
  to: userEmail,
  subject: 'Test',
  react: <TestEmail />,
});

if (!result.success) {
  console.error('Email failed:', result.error);
  // Handle error (log, notify admin, retry, etc.)
} else {
  console.log('Email sent:', result.messageId);
}
```

---

## Best Practices

1. **Always include proper error handling** - Emails can fail for various reasons
2. **Use meaningful subject lines** - Makes emails easy to find
3. **Test with different email providers** - Gmail, Outlook, etc. render differently
4. **Keep templates responsive** - Many users read emails on mobile
5. **Use meaningful variable names** - Makes templates reusable and maintainable
6. **Schedule bulk emails** - Use the `scheduledAt` option to distribute load
7. **Monitor delivery** - Use Resend dashboard to track bounces and complaints

---

## Troubleshooting

### Emails not sending?

1. Check that `RESEND_API_KEY` is set in `.env`
2. Verify the API key is valid and has "Full Access" scope
3. Check that the recipient email is valid
4. Review Resend dashboard for delivery failures
5. Check application logs for error messages

### Emails going to spam?

1. Use a verified domain in Resend
2. Set up SPF, DKIM, and DMARC records
3. Use consistent branding
4. Avoid spam-trigger words
5. Include unsubscribe option for marketing emails

### Template rendering issues?

1. Test in React Email preview server (`npm run email`)
2. Ensure all React Email components are imported from `@react-email/components`
3. Check for TypeScript errors
4. Validate inline styles syntax

---

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email)
- [Email Best Practices](https://resend.com/blog)
