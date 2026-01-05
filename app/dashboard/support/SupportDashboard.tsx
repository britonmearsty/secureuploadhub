"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  HelpCircle, 
  BookOpen, 
  MessageCircle, 
  FileText,
  Search,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  MessageSquare,
  Star,
  Bell,
  ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

// Import communication components
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

const statsData = [
  {
    title: "Response Time",
    value: "< 2h",
    icon: Clock,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Average response time"
  },
  {
    title: "Resolution Rate",
    value: "98%",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
    description: "Issues resolved successfully"
  },
  {
    title: "Articles",
    value: "150+",
    icon: BookOpen,
    color: "text-info",
    bgColor: "bg-info/10",
    description: "Help articles available"
  },
  {
    title: "Support Hours",
    value: "24/7",
    icon: HelpCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    description: "We're here to help"
  }
]

const faqData = [
  {
    question: "How do I reset my password?",
    answer: "You can reset your password by clicking the 'Forgot Password' link on the login page. We'll send you a secure reset link via email.",
    category: "Account"
  },
  {
    question: "How do I upload files to my portal?",
    answer: "Navigate to your portal dashboard, click 'Upload Files', and drag & drop your files or click to browse. Files are processed automatically.",
    category: "Uploads"
  },
  {
    question: "What file formats are supported?",
    answer: "We support most common file formats including PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, and many more. Maximum file size is 100MB per file.",
    category: "Uploads"
  },
  {
    question: "How do I manage my billing?",
    answer: "Go to Settings > Billing to view your subscription, update payment methods, download invoices, and manage your plan.",
    category: "Billing"
  },
  {
    question: "Can I integrate with third-party services?",
    answer: "Yes! We offer integrations with popular services like Zapier, Slack, and custom webhooks. Check the Integrations section in your dashboard.",
    category: "Integrations"
  }
]

const documentationSections = [
  {
    title: "Getting Started",
    description: "Learn the basics of using our platform",
    icon: BookOpen,
    articles: [
      "Quick Start Guide",
      "Setting up your first portal",
      "Understanding file uploads",
      "Managing your account"
    ]
  },
  {
    title: "Advanced Features",
    description: "Explore powerful features and integrations",
    icon: FileText,
    articles: [
      "Custom branding options",
      "API documentation",
      "Webhook configuration",
      "Advanced security settings"
    ]
  },
  {
    title: "Troubleshooting",
    description: "Common issues and solutions",
    icon: AlertCircle,
    articles: [
      "Upload failures",
      "Login problems",
      "Payment issues",
      "Performance optimization"
    ]
  }
]

export default function SupportDashboard({ user }: SupportDashboardProps) {
  const [activeTab, setActiveTab] = useState("tickets")
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Ticket-related state
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
    if (selectedTicket) {
      // The TicketDetails component will handle its own refresh
    }
  }

  const tabs = [
    { id: "tickets", name: "My Tickets", icon: MessageSquare, description: "Track and manage your support requests" },
    { id: "feedback", name: "Feedback", icon: Star, description: "Share your experience and suggestions" },
    { id: "updates", name: "Updates", icon: Bell, description: "Recent notifications and announcements" },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </Link>
            <div className="p-2 bg-primary rounded-lg">
              <HelpCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight">Support</h1>
              <p className="text-muted-foreground mt-2 text-lg max-w-2xl leading-relaxed">
                Get help, manage tickets, share feedback, and stay updated with our support center.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-card">
            Welcome, {user.name || user.email}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300 border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-card shadow-sm border border-border text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="font-medium text-sm">{tab.name}</span>
                  {isActive && (
                    <motion.div layoutId="support-active-indicator" className="ml-auto">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 p-6 bg-muted border border-border rounded-3xl">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Quick Help</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>Live Chat</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <Mail className="h-4 w-4" />
                <span>Email Support</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30">
                  <h2 className="text-xl font-bold text-foreground">
                    {tabs.find(t => t.id === activeTab)?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tabs.find(t => t.id === activeTab)?.description}
                  </p>
                </div>

                <div className="p-0">
                  {/* My Tickets Section */}
                  {activeTab === "tickets" && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary rounded-lg">
                            <MessageSquare className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Support Tickets</h3>
                            <p className="text-muted-foreground text-sm">Track and manage your support requests</p>
                          </div>
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
                  )}

                  {/* Feedback Section */}
                  {activeTab === "feedback" && (
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-primary rounded-lg">
                          <Star className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Share Your Feedback</h3>
                          <p className="text-muted-foreground text-sm">Help us improve by sharing your experience</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-border bg-card">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Star className="h-5 w-5 text-warning" />
                              Submit New Feedback
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <FeedbackForm />
                          </CardContent>
                        </Card>
                        
                        <Card className="border-border bg-card">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <FileText className="h-5 w-5 text-primary" />
                              Your Feedback History
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-12">
                              <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                                <Star className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground text-sm">
                                Your previous feedback submissions will appear here.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Updates Section */}
                  {activeTab === "updates" && (
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-primary rounded-lg">
                          <Bell className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Recent Updates</h3>
                          <p className="text-muted-foreground text-sm">Stay informed about your tickets and account</p>
                        </div>
                      </div>
                      
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Bell className="h-5 w-5 text-primary" />
                            Notifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <NotificationList />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}