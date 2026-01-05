import { Suspense } from 'react'
import TicketsPage from './TicketsPage'

export default function CommunicationTicketsPage() {
  return (
    <Suspense fallback={<div>Loading tickets...</div>}>
      <TicketsPage />
    </Suspense>
  )
}