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
  ArrowLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface SupportDashboardProps {
  user: User
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
  const [activeTab, setActiveTab] = useState<'overview' | 'faq' | 'documentation' | 'contact'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredFAQ = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(faqData.map(item => item.category)))]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
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
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Support Center</h1>
              <p className="text-muted-foreground mt-1 text-lg">Get help, find answers, and contact our team</p>
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

      {/* Main Content with Tabs */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: HelpCircle },
                { id: 'faq', name: 'FAQ', icon: MessageCircle },
                { id: 'documentation', name: 'Documentation', icon: BookOpen },
                { id: 'contact', name: 'Contact', icon: Mail }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to Support</h2>
                      <p className="text-muted-foreground">
                        Find quick answers, browse documentation, or get in touch with our support team.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => window.location.href = '/dashboard/communication'}>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            My Tickets & Communication
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4">
                            View your support tickets, submit feedback, and check updates.
                          </p>
                          <div className="flex items-center text-primary text-sm font-medium">
                            Go to Communication <ExternalLink className="h-3 w-3 ml-1" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setActiveTab('faq')}>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            Frequently Asked Questions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4">
                            Quick answers to common questions about our platform.
                          </p>
                          <div className="flex items-center text-primary text-sm font-medium">
                            Browse FAQ <ExternalLink className="h-3 w-3 ml-1" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setActiveTab('documentation')}>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <BookOpen className="h-5 w-5 text-info" />
                            Documentation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4">
                            Comprehensive guides and tutorials for all features.
                          </p>
                          <div className="flex items-center text-info text-sm font-medium">
                            View Docs <ExternalLink className="h-3 w-3 ml-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <Card className="border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setActiveTab('contact')}>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Mail className="h-5 w-5 text-success" />
                            Contact Support
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4">
                            Get personalized help from our support team.
                          </p>
                          <div className="flex items-center text-success text-sm font-medium">
                            Get Help <ExternalLink className="h-3 w-3 ml-1" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Info className="h-5 w-5 text-info" />
                            Quick Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">• Check our FAQ for instant answers</p>
                            <p className="text-muted-foreground">• Use search to find specific topics</p>
                            <p className="text-muted-foreground">• Submit tickets for technical issues</p>
                            <p className="text-muted-foreground">• Browse docs for detailed guides</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* FAQ Tab */}
                {activeTab === 'faq' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground mb-2">Frequently Asked Questions</h2>
                      <p className="text-muted-foreground">
                        Find quick answers to the most common questions about our platform.
                      </p>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search FAQ..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex gap-2">
                        {categories.map((category) => (
                          <Button
                            key={category}
                            variant={selectedCategory === category ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(category)}
                            className="capitalize"
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* FAQ Items */}
                    <div className="space-y-4">
                      {filteredFAQ.map((item, index) => (
                        <Card key={index} className="border-border bg-card">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg font-medium text-foreground">
                                {item.question}
                              </CardTitle>
                              <Badge variant="secondary" className="ml-2">
                                {item.category}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">
                              {item.answer}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {filteredFAQ.length === 0 && (
                      <div className="text-center py-12">
                        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">
                          No FAQ items found matching your search.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Documentation Tab */}
                {activeTab === 'documentation' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground mb-2">Documentation</h2>
                      <p className="text-muted-foreground">
                        Comprehensive guides and tutorials to help you make the most of our platform.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {documentationSections.map((section, index) => {
                        const Icon = section.icon
                        return (
                          <Card key={index} className="border-border bg-card hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <Icon className="h-5 w-5 text-primary" />
                                {section.title}
                              </CardTitle>
                              <p className="text-muted-foreground text-sm">
                                {section.description}
                              </p>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {section.articles.map((article, articleIndex) => (
                                  <div key={articleIndex} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                                    <FileText className="h-3 w-3" />
                                    {article}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Contact Tab */}
                {activeTab === 'contact' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground mb-2">Contact Support</h2>
                      <p className="text-muted-foreground">
                        Need personalized help? Our support team is here to assist you.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            Create Support Ticket
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground text-sm">
                            Get help with technical issues, billing questions, or feature requests.
                          </p>
                          <Button 
                            className="w-full"
                            onClick={() => window.location.href = '/dashboard/communication'}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Open New Ticket
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Mail className="h-5 w-5 text-success" />
                            Email Support
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground text-sm">
                            Send us an email and we'll get back to you within 24 hours.
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">support@yourcompany.com</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Phone className="h-5 w-5 text-warning" />
                            Phone Support
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground text-sm">
                            Call us during business hours for immediate assistance.
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">+1 (555) 123-4567</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Mon-Fri, 9AM-6PM EST</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Info className="h-5 w-5 text-info" />
                            Live Chat
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-muted-foreground text-sm">
                            Chat with our support team in real-time for quick answers.
                          </p>
                          <Button variant="outline" className="w-full">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Start Live Chat
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}