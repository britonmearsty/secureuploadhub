import { redirect } from 'next/navigation'

export default function CommunicationPage() {
  // Redirect to tickets by default
  redirect('/dashboard/communication/tickets')
}