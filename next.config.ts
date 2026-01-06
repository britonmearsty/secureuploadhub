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
  // Optimize upload performance
  httpAgentOptions: {
    keepAlive: true,
    // keepAliveMsecs: 30000, // Keep-alive probe every 30s
    // maxSockets: 128, // Increased max sockets for parallel uploads
    // maxFreeSockets: 64,
    // freeSocketTimeout: 30000, // Close idle sockets after 30s
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Keep compiled pages for 60s
    pagesBufferLength: 5,
  },
  // Increase server timeout for large uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Allow larger request bodies
    },
  },
};

export default nextConfig;
