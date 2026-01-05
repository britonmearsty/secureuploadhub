import { Suspense } from 'react'
import CommunicationDashboard from './CommunicationDashboard'

export default function CommunicationPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Support & Communication</h1>
        <p className="text-gray-600 mt-2">
          Get help, submit feedback, and communicate with our support team.
        </p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <CommunicationDashboard />
      </Suspense>
    </div>
  )
}