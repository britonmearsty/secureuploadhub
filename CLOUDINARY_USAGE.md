# Cloudinary Implementation Usage

## Overview

I've successfully implemented Cloudinary for image uploads in two key areas:

1. **Profile Image Changes** in Settings page
2. **Logo Uploads** in Portal creation and editing pages

## Files Created/Modified

### New Files:
- `lib/cloudinary.ts` - Cloudinary configuration and upload options
- `app/api/upload/image/route.ts` - API endpoint for handling image uploads
- `components/ui/ImageUpload.tsx` - Reusable image upload component
- `CLOUDINARY_SETUP.md` - Setup guide for users

### Modified Files:
- `app/dashboard/settings/components/ProfileSettings.tsx` - Added profile image upload
- `app/dashboard/settings/actions.ts` - Updated to handle image field
- `app/dashboard/portals/new/page.tsx` - Added logo upload to creation form
- `app/dashboard/portals/[id]/page.tsx` - Added logo upload to editing form
- `next.config.ts` - Added Cloudinary domain to image configuration
- `.env.example` - Added Cloudinary environment variables
- `package.json` - Added cloudinary and next-cloudinary dependencies

## Features Implemented

### 1. Profile Image Upload (Settings Page)
- Drag & drop or click to upload
- Automatic resizing to 400x400px with face detection
- Real-time preview
- Remove image functionality
- File type validation (JPG, PNG, WebP)
- 10MB size limit

### 2. Portal Logo Upload (Creation & Editing)
- Same drag & drop interface
- Optimized for logos (800x400px max)
- Supports SVG files in addition to standard image formats
- Integrated into existing portal forms
- Replaces the previous URL input field

### 3. Technical Features
- Secure authentication-required uploads
- Automatic image optimization
- CDN delivery via Cloudinary
- Organized folder structure (profile-images/, portal-logos/)
- Error handling and user feedback
- Loading states and animations

## Usage Instructions

### For Users:
1. Set up Cloudinary account and add credentials to `.env`
2. Navigate to Settings → Profile to upload profile picture
3. When creating/editing portals, use the Branding tab to upload logos

### For Developers:
The `ImageUpload` component is reusable:

```tsx
<ImageUpload
  currentImage={imageUrl}
  onImageChange={(url) => setImageUrl(url)}
  type="profile" // or "logo"
  size="lg" // "sm", "md", "lg"
/>
```

## API Endpoint

`POST /api/upload/image`
- Requires authentication
- Accepts FormData with `file` and `type` fields
- Returns Cloudinary URL and metadata
- Handles validation and error responses

## Environment Variables Required

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Database Integration

The implementation works with existing database fields:
- `User.image` for profile pictures
- `UploadPortal.logoUrl` for portal logos

No database schema changes were required as these fields already existed as nullable strings.