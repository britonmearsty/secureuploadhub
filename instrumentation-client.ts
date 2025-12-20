import posthog from "posthog-js"

// Only initialize PostHog in browser environment
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      // Include the defaults option as required by PostHog
      defaults: '2025-05-24',
      // Enables capturing unhandled exceptions via Error Tracking
      capture_exceptions: true,
      // Turn on debug in development mode
      debug: process.env.NODE_ENV === "development",
      // Disable automatic capturing until page is fully loaded to prevent fetch errors
      autocapture: false,
      capture_pageview: false,
      // Add persistence to handle page reloads gracefully
      persistence: "localStorage+cookie",
      // Prevent immediate network requests that might fail during hydration
      bootstrap: {},
      loaded: (_ph) => {
        if (process.env.NODE_ENV === "development") {
          console.log("PostHog loaded successfully")
        }
      }
    });
  } catch (error) {
    console.error("Failed to initialize PostHog:", error);
  }
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
