'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, HeadphonesIcon } from 'lucide-react'
import TicketList from '@/components/communication/tickets/TicketList'
import TicketDetails from '@/components/communication/tickets/TicketDetails'
import CreateTicketModal from '@/components/communication/tickets/CreateTicketModal'

interface Ticket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  admin?: {
    id: string
    name: string
    email: string
  } | null
  _count: {
    messages: number
    attachments: number
  }
  messages: Array<{
    createdAt: string
    isAdmin: boolean
    sender: {
      name: string
      role: string
    }
  }>
}

export default function TicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket)
  }

  const handleTicketCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleTicketUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
    // Refresh the selected ticket if it's currently being viewed
    if (selectedTicket) {
      // The TicketDetails component will handle its own refresh
    }
  }

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
            <p className="text-muted-foreground">Track and manage your support requests</p>
          </div>
        </div>
        <CreateTicketModal onTicketCreated={handleTicketCreated} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <TicketList 
            key={refreshTrigger}
            onTicketSelect={handleTicketSelect}
            selectedTicketId={selectedTicket?.id}
          />
        </div>
        <div>
          {selectedTicket ? (
            <TicketDetails 
              ticketId={selectedTicket.id}
              onTicketUpdate={handleTicketUpdate}
            />
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select a ticket to view details
                </h3>
                <p className="text-muted-foreground text-sm">
                  Click on any ticket from the list to see messages and updates.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}