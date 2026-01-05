import { Suspense } from 'react'
import CommunicationDashboard from './CommunicationDashboard'

export default function CommunicationPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Support & Communication</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Get help, submit feedback, and communicate with our support team.
        </p>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <CommunicationDashboard />
      </Suspense>
    </div>
  )
}