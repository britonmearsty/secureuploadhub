"use client"

import posthog from "posthog-js"

interface PostHogIdentifyProps {
  userId: string
  email?: string | null
  name?: string | null
}

export default function PostHogIdentify({ userId, email, name }: PostHogIdentifyProps) {
  // Identify user with PostHog on client side
  // This ensures all client-side events are associated with this user
  if (typeof window !== 'undefined') {
    posthog.identify(userId, {
      email: email || undefined,
      name: name || undefined,
    });
  }

  // This component doesn't render anything
  return null;
}
