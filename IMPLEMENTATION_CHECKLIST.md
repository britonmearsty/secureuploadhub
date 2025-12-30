# Implementation Checklist - Resend + React Email

Use this checklist to track your progress implementing email functionality.

## Phase 1: Setup & Testing (Day 1)

### Environment Setup
- [ ] Sign up for Resend account at https://resend.com
- [ ] Go to API Keys: https://resend.com/api-keys
- [ ] Create new API key with "Full Access"
- [ ] Copy API key
- [ ] Add to `.env`: `RESEND_API_KEY=re_your_key_here`
- [ ] Add to `.env`: `EMAIL_FROM=SecureUploadHub <noreply@secureuploadhub.com>`
- [ ] Save `.env` file (do NOT commit)

### Local Testing
- [ ] Run `npm run email` to start preview server
- [ ] Visit http://localhost:3000
- [ ] Preview all 5 email templates
- [ ] Test with different props in preview
- [ ] Close preview server when done

### First Email Send
- [ ] Read `RESEND_QUICKSTART.md` (5 minutes)
- [ ] Copy example from `emails/email-use.tsx`
- [ ] Create test file with sendVerificationEmail example
- [ ] Replace email addresses with test emails
- [ ] Send test email
- [ ] Check inbox for received email
- [ ] Verify email looks good in email client

### Verification
- [ ] Email arrives in inbox
- [ ] Email formatting looks correct
- [ ] Links are clickable
- [ ] No Resend errors in console

---

## Phase 2: Authentication Flow (Days 2-3)

### Signup Flow
- [ ] Read signup handler code
- [ ] Read `emails/INTEGRATION_EXAMPLES.md` - "User Registration" section
- [ ] Import `sendVerificationEmail` from `lib/email-templates`
- [ ] Add verification email after user creation
- [ ] Generate unique verification token
- [ ] Store token in database with expiration (24 hours)
- [ ] Include token in email link
- [ ] Test signup flow end-to-end
- [ ] Verify email arrives to user
- [ ] Verify verification link works

### Email Verification
- [ ] Create verification endpoint
- [ ] Validate token exists and hasn't expired
- [ ] Mark user as email verified
- [ ] Delete used token
- [ ] Send welcome email on success
- [ ] Test verification flow
- [ ] Test expired token handling
- [ ] Test invalid token handling

### Password Reset - Request
- [ ] Read password reset request handler code
- [ ] Read `emails/INTEGRATION_EXAMPLES.md` - "Password Reset Request" section
- [ ] Import `sendResetPasswordEmail` from `lib/email-templates`
- [ ] Add "Forgot Password" endpoint
- [ ] Check if email exists (without revealing it for security)
- [ ] Generate reset token
- [ ] Store token with expiration (1 hour)
- [ ] Send reset email with token link
- [ ] Test forgot password flow
- [ ] Verify email arrives

### Password Reset - Completion
- [ ] Create password reset endpoint
- [ ] Validate reset token
- [ ] Check token expiration
- [ ] Update user password
- [ ] Delete used token
- [ ] Test password reset flow
- [ ] Test expired token handling
- [ ] Test invalid password validation

---

## Phase 3: File Upload Notifications (Days 4-5)

### Upload Handler
- [ ] Find file upload endpoint
- [ ] Read `emails/INTEGRATION_EXAMPLES.md` - "File Upload Notifications" section
- [ ] Import `sendUploadNotification` from `lib/email-templates`
- [ ] Get portal owner information
- [ ] Add email sending after successful file save
- [ ] Pass file details to email template
- [ ] Test file upload with notification
- [ ] Verify owner receives email
- [ ] Test with multiple files
- [ ] Verify file size formatting

### Email Content
- [ ] Check email displays correct portal name
- [ ] Check email displays correct file name
- [ ] Check email displays correct file size (formatted)
- [ ] Check email displays upload date/time
- [ ] Check email displays uploader info (if provided)
- [ ] Check email has working dashboard link
- [ ] Check email has working portal link

---

## Phase 4: Security Notifications (Days 6-7)

### Sign-in Notifications
- [ ] Find login handler
- [ ] Read `emails/INTEGRATION_EXAMPLES.md` - "Sign-in Notifications" section
- [ ] Add device detection library if needed
- [ ] Add location detection if needed
- [ ] Import `sendSignInNotification` from `lib/email-templates`
- [ ] Send notification after successful login
- [ ] Include device information
- [ ] Include location information
- [ ] Test sign-in notification
- [ ] Verify email arrives to user
- [ ] Verify device and location info is correct

### Alternative: 2FA Emails (Optional)
- [ ] Create 2FA email template if needed
- [ ] Implement 2FA code generation
- [ ] Send 2FA code via email
- [ ] Validate 2FA code from user

---

## Phase 5: Error Handling & Monitoring (Days 8-9)

### Database Logging
- [ ] Create EmailLog table in Prisma
- [ ] Add email_logs table to migration
- [ ] Create logging function
- [ ] Update email service to log all sends
- [ ] Store messageId, status, error
- [ ] Log retry attempts

### Error Handling
- [ ] Wrap email sends in try/catch
- [ ] Log errors to console
- [ ] Consider logging service integration
- [ ] Don't fail user operations if email fails
- [ ] Provide feedback about email status

### Retry Logic (Optional)
- [ ] Create retry function with exponential backoff
- [ ] Store failed emails for retry
- [ ] Implement background job if using queue system
- [ ] Test retry logic
- [ ] Monitor retry success rate

### Resend Dashboard
- [ ] Visit https://dashboard.resend.com
- [ ] Review sent emails
- [ ] Check bounce rate (should be < 5%)
- [ ] Check complaint rate (should be 0%)
- [ ] Check delivery rate (should be > 95%)
- [ ] Set up alerts if available

---

## Phase 6: Testing & Quality Assurance (Days 10-11)

### Email Client Testing
- [ ] Test in Gmail
- [ ] Test in Outlook
- [ ] Test on mobile (iPhone)
- [ ] Test on mobile (Android)
- [ ] Check for rendering issues
- [ ] Verify links work on all clients
- [ ] Verify buttons are clickable
- [ ] Check dark mode rendering

### Edge Cases
- [ ] Test with special characters in names
- [ ] Test with very long file names
- [ ] Test with very large file sizes
- [ ] Test with very small file sizes
- [ ] Test with missing optional fields
- [ ] Test with rapid successive sends
- [ ] Test rate limiting
- [ ] Test API key rotation

### Performance
- [ ] Test with single email (baseline)
- [ ] Test with 10 concurrent emails
- [ ] Test with 100 concurrent emails
- [ ] Monitor response times
- [ ] Check for rate limiting issues
- [ ] Optimize if needed

### Spam Testing
- [ ] Check if emails go to spam in Gmail
- [ ] Check if emails go to spam in Outlook
- [ ] Verify SPF records (if custom domain)
- [ ] Verify DKIM records (if custom domain)
- [ ] Verify DMARC records (if custom domain)
- [ ] Monitor spam complaints in dashboard

---

## Phase 7: Documentation & Maintenance (Day 12)

### Documentation
- [ ] Update README with email setup instructions
- [ ] Document email configuration variables
- [ ] Add troubleshooting guide to README
- [ ] Document custom email template creation
- [ ] Document how to modify email content
- [ ] Document monitoring procedures

### Code Quality
- [ ] Review code for security issues
- [ ] Add type definitions where needed
- [ ] Remove any hardcoded email addresses
- [ ] Remove any test/debug logging
- [ ] Add JSDoc comments to functions
- [ ] Review error messages for clarity

### Ongoing Maintenance
- [ ] Set reminder to check Resend dashboard weekly
- [ ] Monitor bounce/complaint rates
- [ ] Update email templates as needed
- [ ] Test email in new clients/devices
- [ ] Keep API key secret
- [ ] Rotate API key every 6 months
- [ ] Monitor Resend status page for outages

---

## Phase 8: Production Deployment (Day 13)

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Email error logging enabled
- [ ] Resend dashboard configured
- [ ] API key is production key (not test)
- [ ] Error handling implemented
- [ ] Monitoring in place

### Deployment
- [ ] Deploy code to staging
- [ ] Test all email flows in staging
- [ ] Verify emails send correctly
- [ ] Deploy to production
- [ ] Monitor first day of sends
- [ ] Check Resend dashboard
- [ ] Alert team if issues arise

### Post-deployment
- [ ] Monitor email metrics daily for first week
- [ ] Respond to bounce/complaint issues
- [ ] Test new flows/changes thoroughly
- [ ] Keep documentation updated
- [ ] Regular security reviews

---

## File Reference

| File | Purpose | When to Check |
|------|---------|---------------|
| `RESEND_QUICKSTART.md` | Quick setup guide | Phase 1 |
| `emails/EMAIL_GUIDE.md` | Complete reference | All phases |
| `emails/IMPLEMENTATION.md` | Integration guide | Phase 2-4 |
| `emails/INTEGRATION_EXAMPLES.md` | Code examples | Phase 2-5 |
| `lib/email-templates.ts` | Template functions | Phase 2-4 |
| `lib/email-service.ts` | Core service | Implementation review |
| `emails/*.tsx` | Email templates | Phase 6 (testing) |

---

## Time Estimates

- **Phase 1**: 1-2 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 3-4 hours
- **Phase 6**: 4-6 hours
- **Phase 7**: 2-3 hours
- **Phase 8**: 1-2 hours

**Total**: 19-29 hours (~3-4 days of focused work)

---

## Common Issues & Solutions

### Issue: "RESEND_API_KEY not configured"
**Solution**: Check `.env` file, make sure variable is spelled correctly, restart dev server

### Issue: Emails not arriving
**Solution**: Check spam folder, verify recipient email is correct, check Resend dashboard for errors

### Issue: Styling looks broken in email client
**Solution**: Test in React Email preview first, use inline styles, check email client support

### Issue: Links in email not working
**Solution**: Verify URLs are complete and valid, test in preview, check email client link handling

### Issue: High bounce rate
**Solution**: Check email addresses, verify SPF/DKIM, reduce sending to invalid addresses

### Issue: Emails throttled/rate limited
**Solution**: Use batch endpoint, schedule emails with `scheduledAt`, contact Resend support

---

## Tracking Progress

Update this as you complete each phase:

- [ ] Phase 1 Complete - Date: ___________
- [ ] Phase 2 Complete - Date: ___________
- [ ] Phase 3 Complete - Date: ___________
- [ ] Phase 4 Complete - Date: ___________
- [ ] Phase 5 Complete - Date: ___________
- [ ] Phase 6 Complete - Date: ___________
- [ ] Phase 7 Complete - Date: ___________
- [ ] Phase 8 Complete - Date: ___________

**Project Start**: ___________
**Project Completion**: ___________
**Total Time Spent**: ___________

---

## Support Resources

- Resend Docs: https://resend.com/docs
- React Email Docs: https://react.email
- Email Standards: https://www.campaignmonitor.com/css/
- Email Testing: https://www.litmus.com/

**Good luck with your implementation! 🚀**
