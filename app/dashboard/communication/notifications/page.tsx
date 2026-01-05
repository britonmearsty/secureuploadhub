import { Suspense } from 'react'
import NotificationsPage from './NotificationsPage'

export default function CommunicationNotificationsPage() {
  return (
    <Suspense fallback={<div>Loading notifications...</div>}>
      <NotificationsPage />
    </Suspense>
  )
}