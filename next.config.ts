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
  },
};

export default nextConfig;
