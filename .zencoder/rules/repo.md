---
description: Repository Information Overview
alwaysApply: true
---

# secureuploadhub Information

## Summary
SecureUploadHub is a secure file upload platform built with Next.js, TypeScript, and Prisma. It provides "Upload Portals" where users can securely receive files from clients. The project integrates with Paystack for billing, PostHog for analytics, and Resend/Mailgun for email notifications. It features a full administrative dashboard, user-specific portals, and robust storage management.

## Structure
- **app/**: Next.js App Router containing all routes (admin, dashboard, public portals, auth, and API).
- **lib/**: Core business logic, including authentication, billing, email services, and storage providers.
- **prisma/**: Database schema definitions and seed scripts for PostgreSQL.
- **components/**: Reusable React components, including landing page sections and dashboard elements.
- **emails/**: React Email templates for verification, notifications, and billing.
- **types/**: TypeScript type definitions and declarations.
- **public/**: Static assets, images, and animations.

## Language & Runtime
**Language**: TypeScript  
**Version**: Next.js 16.1.0, React 19.2.3  
**Build System**: Next.js (with Turbopack optionally disabled during build)  
**Package Manager**: pnpm

## Dependencies
**Main Dependencies**:
- **Framework**: `next` (16.1.0)
- **Database**: `@prisma/client` (7.2.0), `pg` (8.16.3)
- **Authentication**: `next-auth` (5.0.0-beta.28)
- **Payments**: `paystack-api` (2.0.6)
- **Emails**: `resend` (6.6.0), `@react-email/components`
- **Analytics**: `posthog-js` (1.309.1), `posthog-node` (5.17.4)
- **UI/Animation**: `framer-motion` (12.23.26), `lottie-react` (2.4.1), `lucide-react` (0.562.0), `tailwindcss-animate`
- **Utilities**: `pdfkit`, `redis`, `jose`, `dotenv`

**Development Dependencies**:
- **ORM**: `prisma` (7.2.0)
- **Styling**: `tailwindcss` (4.x), `postcss`
- **Linting**: `eslint` (9.x)
- **Tools**: `tsx`, `typescript` (5.x), `cross-env`

## Build & Installation
```bash
# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Build the application
pnpm build

# Start development server
pnpm dev

# Start production server
pnpm start
```

## Main Files & Resources
- **Entry Point**: `app/page.tsx` (Home), `app/layout.tsx` (Root Layout)
- **Database Schema**: `prisma/schema.prisma`
- **Authentication**: `auth.ts`, `lib/auth.ts`
- **Middleware**: `middleware.ts`
- **Configuration**: `next.config.ts`, `tsconfig.json`, `pnpm-workspace.yaml`
- **API Routes**: `app/api/` (Handles auth, billing, portals, and uploads)
- **Seed Script**: `prisma/seed.ts`
