'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Star, Bell, LifeBuoy } from 'lucide-react'
import TicketList from '@/components/communication/tickets/TicketList'
import TicketDetails from '@/components/communication/tickets/TicketDetails'
import CreateTicketModal from '@/components/communication/tickets/CreateTicketModal'
import FeedbackForm from '@/components/communication/feedback/FeedbackForm'
import NotificationList from '@/components/communication/notifications/NotificationList'

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

export default function CommunicationDashboard() {
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
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <LifeBuoy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Feedback Given</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="text-2xl font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Support Tickets
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Support Tickets</h2>
            <CreateTicketModal onTicketCreated={handleTicketCreated} />
          </div>
          
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
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a ticket
                    </h3>
                    <p className="text-gray-500">
                      Choose a ticket from the list to view details and messages.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Submit Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeedbackForm />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Your Feedback History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-center py-8">
                    Your feedback submissions will appear here.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}