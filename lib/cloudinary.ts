import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

// Upload options for different image types
export const uploadOptions = {
  profile: {
    folder: 'profile-images',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
  logo: {
    folder: 'portal-logos',
    transformation: [
      { width: 800, height: 400, crop: 'limit' },
      { quality: 'auto', format: 'auto' }
    ],
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  }
}