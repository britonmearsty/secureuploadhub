# Integration Examples - Using Resend with Your Application

Copy and adapt these examples to integrate email sending into your application.

## Authentication Flow

### 1. User Registration with Email Verification

```typescript
// app/api/auth/signup/route.ts
import { sendVerificationEmail } from '@/lib/email-templates';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, name, password } = await req.json();

  try {
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashPassword(password),
        emailVerified: false,
      },
    });

    // Generate verification token
    const verificationToken = generateToken();
    
    // Store token in database
    await prisma.verificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: user.email,
      userFirstname: user.name,
      verificationLink: `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${verificationToken}`,
      expiresIn: '24 hours',
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Decide: return error to user or continue?
    }

    return Response.json(
      { message: 'Account created. Check your email to verify.' },
      { status: 201 }
    );
  } catch (error) {
    return Response.json({ error: 'Registration failed' }, { status: 500 });
  }
}
```

### 2. Email Verification Handler

```typescript
// app/api/auth/verify/route.ts
import { sendWelcomeEmail } from '@/lib/email-templates';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { token } = await req.json();

  try {
    // Find and validate token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationToken) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Mark user email as verified
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Send welcome email
    const user = verificationToken.user;
    await sendWelcomeEmail({
      to: user.email,
      userFirstname: user.name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return Response.json({ message: 'Email verified successfully' });
  } catch (error) {
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
```

### 3. Password Reset Request

```typescript
// app/api/auth/forgot-password/route.ts
import { sendResetPasswordEmail } from '@/lib/email-templates';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { email } = await req.json();

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return Response.json({
        message: 'If account exists, password reset link sent to email',
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    
    // Store reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    const emailResult = await sendResetPasswordEmail({
      to: user.email,
      userFirstname: user.name,
      resetLink: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`,
      expiresIn: '1 hour',
    });

    if (!emailResult.success) {
      // Log error but don't expose to user
      console.error('Failed to send password reset email:', emailResult.error);
    }

    return Response.json({
      message: 'If account exists, password reset link sent to email',
    });
  } catch (error) {
    return Response.json({ error: 'Request failed' }, { status: 500 });
  }
}
```

### 4. Password Reset Completion

```typescript
// app/api/auth/reset-password/route.ts
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  const { token, newPassword } = await req.json();

  try {
    // Validate token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      return Response.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Update password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashPassword(newPassword) },
    });

    // Delete used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return Response.json({ message: 'Password reset successful' });
  } catch (error) {
    return Response.json({ error: 'Reset failed' }, { status: 500 });
  }
}
```

---

## File Upload Notifications

### 1. Notify Portal Owner of Upload

```typescript
// app/api/uploads/route.ts
import { sendUploadNotification } from '@/lib/email-templates';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { portalId, fileName, fileSize, clientName, clientEmail, clientMessage } = await req.json();

  try {
    // Get portal and owner
    const portal = await prisma.uploadPortal.findUnique({
      where: { id: portalId },
      include: { owner: true },
    });

    if (!portal) {
      return Response.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Create file record
    const file = await prisma.uploadedFile.create({
      data: {
        portalId,
        fileName,
        fileSize,
        clientName,
        clientEmail,
        clientMessage,
        uploadedAt: new Date(),
      },
    });

    // Send notification to portal owner
    const emailResult = await sendUploadNotification({
      to: portal.owner.email,
      portalName: portal.name,
      fileName,
      fileSize,
      clientName,
      clientEmail,
      clientMessage,
      uploadedAt: new Date(),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portal.id}`,
    });

    if (!emailResult.success) {
      console.error('Failed to send upload notification:', emailResult.error);
      // Don't fail the upload if email fails
    }

    return Response.json(file, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

---

## Security Notifications

### 1. Notify on New Sign-in

```typescript
// lib/auth/sign-in.ts
import { sendSignInNotification } from '@/lib/email-templates';
import { getClientInfo } from '@/lib/utils/client-info';

export async function handleUserSignIn(user: User, req: Request) {
  try {
    // Get device and location info
    const clientInfo = getClientInfo(req);

    // Send sign-in notification
    await sendSignInNotification({
      to: user.email,
      userFirstname: user.name,
      signInDate: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      signInDevice: clientInfo.device,
      signInLocation: clientInfo.location,
    });
  } catch (error) {
    // Log but don't fail sign-in
    console.error('Failed to send sign-in notification:', error);
  }
}
```

### 2. Helper to get client info

```typescript
// lib/utils/client-info.ts
import { UAParser } from 'ua-parser-js';
import { geoip } from 'geoip-lite';

export function getClientInfo(req: Request) {
  const ua = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';

  const parser = new UAParser(ua);
  const result = parser.getResult();

  const location = geoip.lookup(ip);

  return {
    device: `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown OS'}`,
    location: location ? `${location.city || location.country}, ${location.country}` : 'Unknown',
    ip,
  };
}
```

---

## Batch Operations

### 1. Send Bulk Emails to Users

```typescript
// scripts/send-announcement.ts
import { sendBatchEmails } from '@/lib/email-service';
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { prisma } from '@/lib/prisma';

async function sendAnnouncement() {
  const users = await prisma.user.findMany({
    where: { emailVerified: true },
  });

  const emails = users.map((user) => ({
    to: user.email,
    subject: 'Important Announcement',
    react: <WelcomeEmail userFirstname={user.name} />,
  }));

  const result = await sendBatchEmails(emails);
  console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
}

// Run with: tsx scripts/send-announcement.ts
sendAnnouncement().catch(console.error);
```

### 2. Retry Failed Emails

```typescript
// scripts/retry-failed-emails.ts
import { sendEmail } from '@/lib/email-service';
import { prisma } from '@/lib/prisma';

async function retryFailedEmails() {
  const failedEmails = await prisma.emailLog.findMany({
    where: { 
      status: 'failed',
      retryCount: { lt: 3 },
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  for (const emailLog of failedEmails) {
    try {
      const result = await sendEmail(emailLog.emailData);
      
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: result.success ? 'sent' : 'failed',
          retryCount: emailLog.retryCount + 1,
        },
      });
    } catch (error) {
      console.error(`Failed to retry email ${emailLog.id}:`, error);
    }
  }
}
```

---

## Error Handling Patterns

### 1. Graceful Degradation

```typescript
// Don't fail main operation if email fails
export async function createUserWithEmailNotification(userData: CreateUserData) {
  try {
    // Create user (critical)
    const user = await prisma.user.create({ data: userData });

    try {
      // Send email (non-critical)
      await sendWelcomeEmail({
        to: user.email,
        userFirstname: user.name,
      });
    } catch (emailError) {
      // Log but don't throw
      console.error('Failed to send welcome email:', emailError);
    }

    return user;
  } catch (error) {
    throw error;
  }
}
```

### 2. Retry Logic

```typescript
// Retry with exponential backoff
async function sendEmailWithRetry(
  options: SendEmailOptions,
  maxRetries = 3
) {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendEmail(options);
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 3. Queue-based Approach

```typescript
// Using a job queue (e.g., Bull, Agenda)
import { emailQueue } from '@/lib/queue';

export async function sendEmailAsync(options: SendEmailOptions) {
  await emailQueue.add('send-email', options, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

// In your job handler:
emailQueue.process('send-email', async (job) => {
  return await sendEmail(job.data);
});
```

---

## Database Logging

### 1. Log All Emails

```typescript
// prisma/schema.prisma
model EmailLog {
  id        String   @id @default(cuid())
  to        String
  subject   String
  status    String   @default("pending") // pending, sent, failed, bounced
  messageId String?
  error     String?
  retryCount Int    @default(0)
  sentAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```typescript
// lib/email-service-with-logging.ts
import { sendEmail as sendEmailBase, SendEmailOptions } from './email-service';
import { prisma } from './prisma';

export async function sendEmailWithLogging(options: SendEmailOptions) {
  const result = await sendEmailBase(options);

  await prisma.emailLog.create({
    data: {
      to: Array.isArray(options.to) ? options.to[0] : options.to,
      subject: options.subject,
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId,
      error: result.error,
      sentAt: result.success ? new Date() : null,
    },
  });

  return result;
}
```

---

## Resources

- [Complete Email Guide](./EMAIL_GUIDE.md)
- [Implementation Checklist](./IMPLEMENTATION.md)
- [Quick Start](../RESEND_QUICKSTART.md)
- [Resend Docs](https://resend.com/docs)
- [React Email Docs](https://react.email)
