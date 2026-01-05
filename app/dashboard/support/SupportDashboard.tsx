"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageSquare,
  Star,
  Bell,
  ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import TicketList from '@/components/communication/tickets/TicketList'
import TicketDetails from '@/components/communication/tickets/TicketDetails'
import CreateTicketModal from '@/components/communication/tickets/CreateTicketModal'
import FeedbackForm from '@/components/communication/feedback/FeedbackForm'
import NotificationList from '@/components/communication/notifications/NotificationList'

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface SupportDashboardProps {
  user: User
}

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

export default function SupportDashboard({ user }: SupportDashboardProps) {
  const [activeTab, setActiveTab] = useState("tickets")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setTicketModalOpen(true)
  }

  const handleTicketCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleTicketUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const tabs = [
    { id: "tickets", name: "My Tickets", icon: MessageSquare, description: "Track and manage your support requests" },
    { id: "feedback", name: "Feedback", icon: Star, description: "Share your experience and suggestions" },
    { id: "updates", name: "Updates", icon: Bell, description: "Recent notifications and announcements" },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-1 text-lg">Get help, manage tickets, and share feedback.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-card shadow-sm border border-border text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="font-medium text-sm">{tab.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="support-active-indicator"
                      className="ml-auto"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30">
                  <h2 className="text-xl font-semibold text-foreground">
                    {tabs.find(t => t.id === activeTab)?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tabs.find(t => t.id === activeTab)?.description}
                  </p>
                </div>

                <div className="p-8">
                  {/* My Tickets Section */}
                  {activeTab === "tickets" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-end">
                        <CreateTicketModal onTicketCreated={handleTicketCreated} />
                      </div>
                      <TicketList 
                        key={refreshTrigger}
                        onTicketSelect={handleTicketSelect}
                        selectedTicketId={selectedTicket?.id}
                      />
                    </div>
                  )}

                  {/* Feedback Section */}
                  {activeTab === "feedback" && (
                    <div className="max-w-md">
                      <FeedbackForm />
                    </div>
                  )}

                  {/* Updates Section */}
                  {activeTab === "updates" && (
                    <NotificationList />
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Ticket Details Modal */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <TicketDetails 
              ticketId={selectedTicket.id}
              onTicketUpdate={handleTicketUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
