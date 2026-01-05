import { Suspense } from 'react'
import FeedbackPage from './FeedbackPage'

export default function CommunicationFeedbackPage() {
  return (
    <Suspense fallback={<div>Loading feedback...</div>}>
      <FeedbackPage />
    </Suspense>
  )
}