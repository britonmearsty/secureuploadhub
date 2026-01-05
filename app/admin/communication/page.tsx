import { Suspense } from 'react'
import CommunicationOverview from './components/CommunicationOverview'

export default function AdminCommunicationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-gray-600 mt-2">
            Manage support tickets, feedback, and user communications.
          </p>
        </div>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <CommunicationOverview />
      </Suspense>
    </div>
  )
}