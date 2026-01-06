# Cloudinary Setup Guide

This guide will help you set up Cloudinary for image uploads in your SecureUploadHub application.

## 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/) and sign up for a free account
2. After signing up, you'll be taken to your dashboard

## 2. Get Your Cloudinary Credentials

From your Cloudinary dashboard, you'll need three pieces of information:

- **Cloud Name**: Found in the top-left of your dashboard
- **API Key**: Found in the "API Keys" section
- **API Secret**: Found in the "API Keys" section (click "Reveal" to see it)

## 3. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# Cloudinary (Image Uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Replace the placeholder values with your actual Cloudinary credentials.

## 4. Features Enabled

Once configured, users will be able to:

### Profile Images
- Upload profile pictures in Settings page
- Automatic resizing to 400x400px with face detection
- Supports JPG, PNG, WebP formats
- 10MB file size limit

### Portal Logos
- Upload logos when creating or editing portals
- Automatic optimization for web display
- Supports JPG, PNG, WebP, SVG formats
- 10MB file size limit
- Recommended size: 800x400px

## 5. Image Organization

Images are automatically organized in Cloudinary:
- Profile images: `profile-images/` folder
- Portal logos: `portal-logos/` folder

Each image gets a unique public ID based on the user ID and timestamp.

## 6. Security Features

- Authentication required for all uploads
- File type validation
- File size limits enforced
- Automatic image optimization and format conversion
- Secure URLs with Cloudinary's CDN

## 7. Troubleshooting

### Common Issues:

1. **"Upload failed" error**: Check that your API credentials are correct
2. **"Invalid file type" error**: Ensure you're uploading supported image formats
3. **"File too large" error**: Reduce file size to under 10MB

### Testing Your Setup:

1. Go to Settings page and try uploading a profile picture
2. Create a new portal and try uploading a logo
3. Check your Cloudinary dashboard to see if images appear

## 8. Optional: Cloudinary Transformations

The app includes automatic image transformations:
- Profile images are cropped to square with face detection
- All images are optimized for web delivery
- Format is automatically chosen for best performance

You can customize these transformations in `lib/cloudinary.ts` if needed.