'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Star, Bell, LifeBuoy, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
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

const statsData = [
  {
    title: "Open Tickets",
    value: "3",
    icon: MessageSquare,
    color: "text-primary",
    bgColor: "bg-primary/10",
    trend: "+2 this week"
  },
  {
    title: "Resolved",
    value: "12",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    trend: "94% resolution rate"
  },
  {
    title: "Feedback Given",
    value: "5",
    icon: Star,
    color: "text-warning",
    bgColor: "bg-warning/10",
    trend: "4.8 avg rating"
  },
  {
    title: "Response Time",
    value: "2h",
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    trend: "avg response"
  }
]

export default function CommunicationDashboard() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState("tickets")

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
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-all duration-200 border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.trend}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-2xl">
          <TabsTrigger 
            value="tickets" 
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <MessageSquare className="h-4 w-4" />
            Support Tickets
          </TabsTrigger>
          <TabsTrigger 
            value="feedback" 
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Star className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="tickets" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Support Tickets</h2>
                  <p className="text-muted-foreground">Manage your support requests and track their progress</p>
                </div>
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
                    <Card className="border-dashed border-2 border-muted-foreground/20">
                      <CardContent className="p-12 text-center">
                        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                          <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Select a ticket
                        </h3>
                        <p className="text-muted-foreground">
                          Choose a ticket from the list to view details and messages.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Feedback</h2>
                <p className="text-muted-foreground">Share your thoughts and help us improve our service</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-warning" />
                      Submit Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FeedbackForm />
                  </CardContent>
                </Card>
                
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Your Feedback History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                        <Star className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Your feedback submissions will appear here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
                <p className="text-muted-foreground">Stay updated with important messages and alerts</p>
              </div>
              
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Recent Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <NotificationList />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}