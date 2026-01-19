import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  /* config options here */
  serverExternalPackages: ["paystack-api"],
  compress: true, // Enable gzip compression for responses
  images: {
    remotePatterns: [
      { hostname: "us.i.posthog.com" },
      { hostname: "us-assets.i.posthog.com" },
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  // Optimize for HTTP/2 performance
  httpAgentOptions: {
    keepAlive: true,
  },
  // Increase server timeout for large uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Allow larger request bodies
    },
  },
  // Add API route configuration
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase API route body size limit
    },
  },
};

export default nextConfig;
