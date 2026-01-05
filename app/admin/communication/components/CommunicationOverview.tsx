'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageSquare, 
  Star, 
  Users, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Timer,
  BarChart3,
  Shield,
  Settings
} from 'lucide-react'
import AdminTicketList from '@/app/admin/communication/components/AdminTicketList'
import AdminFeedbackList from '@/app/admin/communication/components/AdminFeedbackList'
import CommunicationAnalytics from '@/app/admin/communication/components/CommunicationAnalytics'

interface CommunicationStats {
  overview: {
    totalTickets: number
    openTickets: number
    resolvedTickets: number
    recentTickets: number
    avgResponseTimeHours: number
    totalFeedback: number
    avgRating: number
  }
  tickets: {
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byCategory: Record<string, number>
  }
  feedback: {
    byRating: Record<number, number>
    byCategory: Record<string, number>
  }
}

export default function CommunicationOverview() {
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/communication/analytics')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load stats'}</p>
          <Button onClick={fetchStats} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Communication Management</h1>
            <p className="text-slate-600">Monitor and manage all user communications across the platform</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-800 text-white px-3 py-1">
          Admin Control Panel
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Tickets</p>
                <p className="text-3xl font-bold text-slate-900">{stats.overview.totalTickets}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Badge variant="secondary" className="mr-2 bg-blue-50 text-blue-700">
                {stats.overview.recentTickets} this week
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Open Tickets</p>
                <p className="text-3xl font-bold text-orange-600">{stats.overview.openTickets}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">Requires attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.overview.avgResponseTimeHours.toFixed(1)}h
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Timer className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">First response</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Satisfaction</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.overview.avgRating.toFixed(1)}/5
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Badge variant="secondary" className="mr-2 bg-purple-50 text-purple-700">
                {stats.overview.totalFeedback} reviews
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <MessageSquare className="h-5 w-5" />
              Tickets by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Object.entries(stats.tickets.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={status === 'OPEN' ? 'destructive' : status === 'RESOLVED' ? 'default' : 'secondary'}
                      className="w-24 justify-center"
                    >
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Star className="h-5 w-5" />
              Feedback Ratings Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.feedback.byRating[rating] || 0
                const total = Object.values(stats.feedback.byRating).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total) * 100 : 0
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium text-slate-700">{rating}</span>
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    </div>
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-slate-700">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Management Tabs */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Administrative Tools</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="tickets" className="w-full">
            <div className="p-6 pb-0">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                <TabsTrigger value="tickets" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  <MessageSquare className="h-4 w-4" />
                  Manage Tickets
                  {stats.overview.openTickets > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {stats.overview.openTickets}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  <Star className="h-4 w-4" />
                  Review Feedback
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tickets" className="p-6 pt-4">
              <AdminTicketList />
            </TabsContent>

            <TabsContent value="feedback" className="p-6 pt-4">
              <AdminFeedbackList />
            </TabsContent>

            <TabsContent value="analytics" className="p-6 pt-4">
              <CommunicationAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}