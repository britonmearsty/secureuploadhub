'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRedirect() {
  const router = useRouter()

  useEffect(() => {
    console.log('🔄 CLIENT REDIRECT: Redirecting admin user to /admin')
    // Use replace to avoid adding to browser history
    router.replace('/admin')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Redirecting to Admin Panel...</h1>
        <p className="text-muted-foreground">Please wait while we redirect you to the admin dashboard.</p>
      </div>
    </div>
  )
}