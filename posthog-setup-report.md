# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your SecureUploadHub project. The integration includes:

- **Client-side analytics** via `instrumentation-client.ts` using `posthog-js` for automatic pageview tracking and custom event capture
- **Server-side analytics** via `posthog-node` for tracking authentication events with user identification
- **Reverse proxy** configuration in `next.config.ts` to route PostHog requests through your domain, improving reliability and bypassing ad blockers
- **Error tracking** enabled via `capture_exceptions: true` with manual exception capture in critical areas
- **User identification** on both client and server side for cohesive user journey tracking

## Events Instrumented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `cta_clicked` | User clicked the main CTA button 'Create Your Portal Link' on the landing page hero section | `app/page.tsx` |
| `demo_video_clicked` | User clicked 'Watch 1-min Demo' button, indicating interest but not ready to commit | `app/page.tsx` |
| `pricing_toggle_changed` | User toggled between monthly and annual pricing options | `app/page.tsx` |
| `free_plan_clicked` | User clicked 'Get Started' on the free Individual plan | `app/page.tsx` |
| `pro_plan_trial_clicked` | User clicked 'Start 14-Day Free Trial' on the Professional plan - key conversion event | `app/page.tsx` |
| `portal_created` | User successfully created a new upload portal - major conversion milestone | `app/dashboard/portals/new/page.tsx` |
| `portal_link_copied` | User copied portal link to share with clients - indicates intent to use the product | `app/dashboard/components/PortalList.tsx` |
| `portal_status_toggled` | User activated or deactivated a portal | `app/dashboard/components/PortalList.tsx` |
| `portal_deleted` | User deleted a portal - potential churn indicator | `app/dashboard/components/PortalList.tsx` |
| `file_upload_started` | Client started uploading files to a public portal - funnel start for uploads | `app/p/[slug]/page.tsx` |
| `file_upload_completed` | Client successfully completed file upload - key value delivery event | `app/p/[slug]/page.tsx` |
| `file_upload_failed` | File upload failed - error tracking for reliability monitoring | `app/p/[slug]/page.tsx` |
| `upload_more_clicked` | Client clicked to upload additional files after successful upload - engagement metric | `app/p/[slug]/page.tsx` |
| `server_login` | Server-side login event captured with user identification | `lib/auth.ts` |

## Files Created/Modified

### New Files
- `instrumentation-client.ts` - PostHog client-side initialization
- `lib/posthog-server.ts` - PostHog server-side client singleton
- `app/dashboard/components/PostHogIdentify.tsx` - Client-side user identification component
- `app/api/auth/[...nextauth]/route.ts` - NextAuth route handler
- `app/api/portals/route.ts` - Portals API routes
- `app/api/portals/[id]/route.ts` - Individual portal API routes
- `app/api/public/portals/[slug]/route.ts` - Public portal API route

### Modified Files
- `.env` - Added PostHog environment variables
- `next.config.ts` - Added reverse proxy rewrites for PostHog
- `app/page.tsx` - Added CTA and pricing event tracking
- `app/dashboard/page.tsx` - Added PostHogIdentify component
- `app/dashboard/portals/new/page.tsx` - Added portal creation tracking
- `app/dashboard/components/PortalList.tsx` - Added portal management event tracking
- `app/p/[slug]/page.tsx` - Added file upload tracking
- `lib/auth.ts` - Added server-side user identification and login tracking

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/250119/dashboard/925842) - Core analytics dashboard with all insights

### Insights
- [User Signups & Logins](https://us.posthog.com/project/250119/insights/M1vLCURp) - Track daily user authentication events
- [Portal Creation Funnel](https://us.posthog.com/project/250119/insights/VBjiwYrz) - Track conversion from landing page CTA clicks to portal creation
- [File Upload Success Rate](https://us.posthog.com/project/250119/insights/iiZNyrKr) - Track file upload completion vs failures
- [Portal Engagement](https://us.posthog.com/project/250119/insights/BLvruMwY) - Track portal link copies and status changes
- [Pricing Page Conversion](https://us.posthog.com/project/250119/insights/oWJnyoJF) - Track pricing interactions and trial signups

## Configuration

Your PostHog configuration is stored in environment variables:

```env
NEXT_PUBLIC_POSTHOG_KEY="phc_4o1mIBBsPWW35pwgQJzlt7CLnZqHZkE4oossEoFROJu"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

For production deployment, ensure these environment variables are set in your hosting provider (Vercel, Netlify, AWS, etc.).
