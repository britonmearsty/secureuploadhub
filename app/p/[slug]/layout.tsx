import { Metadata } from 'next';
import prisma from '@/lib/prisma';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const portal = await prisma.uploadPortal.findUnique({
      where: { slug },
      include: { 
        user: { 
          select: { name: true, email: true } 
        } 
      }
    });

    if (!portal) {
      return {
        title: 'Portal Not Found - SecureUploadHub',
        description: 'The requested upload portal could not be found.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const title = `${portal.name} - Secure File Upload Portal`;
    const description = portal.description || 
      `Upload files securely to ${portal.user?.name || 'this professional'}. Encrypted, fast, and reliable file collection powered by SecureUploadHub.`;

    return {
      title,
      description,
      keywords: `secure file upload, ${portal.name}, file collection, document upload, ${portal.user?.name || 'professional'} files`,
      alternates: {
        canonical: `https://secureuploadhub.com/p/${slug}`,
      },
      openGraph: {
        title,
        description,
        type: 'website',
        url: `https://secureuploadhub.com/p/${slug}`,
        siteName: 'SecureUploadHub',
        images: [
          {
            url: portal.logoUrl || 'https://secureuploadhub.com/og-portal.png',
            width: 1200,
            height: 630,
            alt: `${portal.name} - Secure File Upload Portal`,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [portal.logoUrl || 'https://secureuploadhub.com/og-portal.png'],
      },
      robots: {
        index: portal.isActive,
        follow: portal.isActive,
      },
    };
  } catch (error) {
    console.error('Error generating portal metadata:', error);
    return {
      title: 'Secure File Upload Portal - SecureUploadHub',
      description: 'Upload files securely with end-to-end encryption.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default function PortalLayout({ params, children }: Props) {
  return children;
}