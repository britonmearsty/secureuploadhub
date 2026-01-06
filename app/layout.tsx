import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecureUploadHub | Professional Client File Collection",
  description: "Secure file collection platform for accountants, lawyers & consultants. Stop chasing email attachments - create branded upload portals in seconds.",
  keywords: "secure file upload, client file collection, professional file sharing, branded upload portal, accountant file collection, lawyer document portal, consultant file sharing, GDPR compliant file upload, secure file transfer, business file collection",
  authors: [{ name: "SecureUploadHub" }],
  creator: "SecureUploadHub",
  publisher: "SecureUploadHub",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "https://secureuploadhub.com",
  },
  openGraph: {
    title: "SecureUploadHub | Professional Client File Collection",
    description: "Secure file collection platform for accountants, lawyers & consultants. Stop chasing email attachments - create branded upload portals in seconds.",
    type: "website",
    url: "https://secureuploadhub.com",
    siteName: "SecureUploadHub",
    locale: "en_US",
    images: [
      {
        url: "https://8qlc5jjyt0.ufs.sh/f/0kCONu1c57kgA4GOd2yySTBbnfrYeasU8tq4QAowVDXME5Ic",
        width: 1200,
        height: 630,
        alt: "SecureUploadHub - Professional File Collection Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SecureUploadHub | Professional Client File Collection",
    description: "Secure file collection platform for accountants, lawyers & consultants. Stop chasing email attachments - create branded upload portals in seconds.",
    images: ["https://8qlc5jjyt0.ufs.sh/f/0kCONu1c57kgA4GOd2yySTBbnfrYeasU8tq4QAowVDXME5Ic"],
    creator: "@secureuploadhub",
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://secureuploadhub.com/#organization",
        "name": "SecureUploadHub",
        "url": "https://secureuploadhub.com",
        "logo": "https://secureuploadhub.com/logo.png",
        "description": "Professional secure file collection platform for businesses",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KE",
          "addressLocality": "Nairobi",
          "addressRegion": "Nairobi County"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "email": "support@secureuploadhub.com"
        },
        "sameAs": [
          "https://twitter.com/secureuploadhub",
          "https://linkedin.com/company/secureuploadhub"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://secureuploadhub.com/#software",
        "name": "SecureUploadHub",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web Browser",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "softwareVersion": "1.0",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "150"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Free plan available with premium features"
        }
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://secureuploadhub.com/#business",
        "name": "SecureUploadHub",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KE",
          "addressLocality": "Nairobi",
          "addressRegion": "Nairobi County"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": -1.2921,
          "longitude": 36.8219
        },
        "areaServed": ["Kenya", "East Africa", "Global"],
        "serviceArea": {
          "@type": "GeoCircle",
          "geoMidpoint": {
            "@type": "GeoCoordinates", 
            "latitude": -1.2921,
            "longitude": 36.8219
          },
          "geoRadius": "50000"
        }
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
