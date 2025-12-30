# Resend + React Email Quick Start

## 1. Setup (1 minute)

Add to `.env`:
```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=SecureUploadHub <noreply@secureuploadhub.com>
```

Get your API key at: https://resend.com/api-keys

## 2. Send Your First Email (2 minutes)

```typescript
import { sendVerificationEmail } from '@/lib/email-templates';

// In your signup handler
const result = await sendVerificationEmail({
  to: user.email,
  userFirstname: user.name,
  verificationLink: `https://yourapp.com/verify?token=${token}`,
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

## 3. Available Email Functions

### Verification Email
```typescript
import { sendVerificationEmail } from '@/lib/email-templates';

await sendVerificationEmail({
  to: 'user@example.com',
  userFirstname: 'John',
  verificationLink: 'https://...',
  expiresIn: '24 hours',
});
```

### Password Reset
```typescript
import { sendResetPasswordEmail } from '@/lib/email-templates';

await sendResetPasswordEmail({
  to: 'user@example.com',
  userFirstname: 'John',
  resetLink: 'https://...',
  expiresIn: '1 hour',
});
```

### Welcome Email
```typescript
import { sendWelcomeEmail } from '@/lib/email-templates';

await sendWelcomeEmail({
  to: 'user@example.com',
  userFirstname: 'John',
  dashboardUrl: 'https://...',
});
```

### Upload Notification
```typescript
import { sendUploadNotification } from '@/lib/email-templates';

await sendUploadNotification({
  to: 'portal-owner@example.com',
  portalName: 'My Portal',
  fileName: 'document.pdf',
  fileSize: 1024000,
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  uploadedAt: new Date(),
  dashboardUrl: 'https://...',
});
```

### Sign-in Notification
```typescript
import { sendSignInNotification } from '@/lib/email-templates';

await sendSignInNotification({
  to: 'user@example.com',
  userFirstname: 'John',
  signInDate: new Date().toLocaleString(),
  signInDevice: 'Chrome on Windows',
  signInLocation: 'New York, USA',
});
```

## 4. Safe Versions (Auto Error Handling)

All functions have "Safe" versions that return boolean:

```typescript
import { sendVerificationEmailSafe } from '@/lib/email-templates';

const success = await sendVerificationEmailSafe(
  'user@example.com',
  'https://...',
  'John'
);

if (success) {
  // Email sent
} else {
  // Email failed (already logged)
}
```

Available safe functions:
- `sendVerificationEmailSafe()`
- `sendResetPasswordEmailSafe()`
- `sendWelcomeEmailSafe()`
- `sendUploadNotificationSafe()`
- `sendSignInNotificationSafe()`

## 5. Advanced Usage

### Custom Options
```typescript
import { sendEmail } from '@/lib/email-service';
import { WelcomeEmail } from '@/emails/WelcomeEmail';

await sendEmail({
  to: 'user@example.com',
  subject: 'Custom subject',
  react: <WelcomeEmail />,
  from: 'custom@example.com',
  replyTo: 'support@example.com',
  cc: 'admin@example.com',
  tags: [{ name: 'type', value: 'welcome' }],
});
```

### Batch Emails
```typescript
import { sendBatchEmails } from '@/lib/email-service';

const results = await sendBatchEmails([
  {
    to: 'user1@example.com',
    subject: 'Welcome',
    react: <WelcomeEmail />,
  },
  {
    to: 'user2@example.com',
    subject: 'Welcome',
    react: <WelcomeEmail />,
  },
]);

console.log(`Sent: ${results.sent}, Failed: ${results.failed}`);
```

### Schedule Emails
```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Scheduled email',
  react: <WelcomeEmail />,
  scheduledAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
});
```

## 6. Test Locally

Start preview server:
```bash
npm run email
```

Visit: http://localhost:3000

You can see all email templates and test with different props.

## 7. Monitor in Dashboard

Visit: https://dashboard.resend.com

See:
- All sent emails
- Bounce/complaint rates
- Delivery metrics
- Email logs

## 8. File Structure

```
lib/
  ├── email-service.ts      ← Core service
  └── email-templates.ts    ← Template wrappers

emails/
  ├── VerificationEmail.tsx
  ├── ResetPasswordEmail.tsx
  ├── WelcomeEmail.tsx
  ├── UploadNotificationEmail.tsx
  ├── SignInEmail.tsx
  ├── email-use.tsx         ← Usage examples
  ├── EMAIL_GUIDE.md        ← Full documentation
  └── IMPLEMENTATION.md     ← Integration guide
```

## 9. Troubleshooting

### Emails not sending?
1. Check `.env` has `RESEND_API_KEY`
2. Verify API key in Resend dashboard
3. Check email is valid
4. Review error message in logs

### Why isn't my email in my inbox?
- Check spam/promotions folder
- Verify sender domain setup
- Check Resend dashboard for bounces
- Test with different email providers

### Can I change the from address?
Yes, in `.env`:
```env
EMAIL_FROM=Your Name <your-email@domain.com>
```

Or per-email:
```typescript
await sendEmail({
  to: 'user@example.com',
  from: 'custom@example.com',
  // ...
});
```

## 10. Best Practices

1. **Always handle errors** - Check `result.success`
2. **Use "Safe" versions** for non-critical emails
3. **Test in preview server** - `npm run email`
4. **Monitor in dashboard** - https://dashboard.resend.com
5. **Log failures** - For debugging and analytics
6. **Schedule bulk emails** - Use `scheduledAt` to distribute load
7. **Test real integration** - Don't rely only on preview
8. **Set up domain SPF/DKIM** - For deliverability

## 11. Next Steps

1. ✅ Add `RESEND_API_KEY` to `.env`
2. ✅ Try sending a test email
3. ✅ Integrate into signup flow
4. ✅ Integrate into password reset
5. ✅ Monitor in Resend dashboard
6. ✅ Add to other flows (uploads, sign-in, etc)

## 12. Resources

- [Resend Docs](https://resend.com/docs)
- [React Email Docs](https://react.email)
- [Email Best Practices](https://resend.com/blog)
- [API Reference](https://resend.com/docs/api-reference/emails/send)

---

**Need help?** Check `emails/EMAIL_GUIDE.md` for complete documentation.
