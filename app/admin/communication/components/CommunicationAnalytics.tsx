'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Star, 
  MessageSquare,
  Users,
  Calendar,
  Download
} from 'lucide-react'

interface AnalyticsData {
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
    dailyTrend: Array<{ date: string; count: number }>
  }
  feedback: {
    byRating: Record<number, number>
    byCategory: Record<string, number>
    dailyTrend: Array<{ date: string; count: number; avg_rating: number }>
  }
  period: {
    days: number
    startDate: string
    endDate: string
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function CommunicationAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/communication/analytics?days=${period}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalytics(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const exportData = () => {
    if (!analytics) return
    
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `communication-analytics-${period}days.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
          <Button onClick={fetchAnalytics} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const statusData = Object.entries(analytics.tickets.byStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count
  }))

  const priorityData = Object.entries(analytics.tickets.byPriority).map(([priority, count]) => ({
    name: priority,
    value: count
  }))

  const categoryData = Object.entries(analytics.tickets.byCategory).map(([category, count]) => ({
    name: category,
    tickets: count
  }))

  const ratingData = Object.entries(analytics.feedback.byRating).map(([rating, count]) => ({
    rating: `${rating} Star${rating !== '1' ? 's' : ''}`,
    count
  }))

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {analytics.period.days} days
          </Badge>
        </div>
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {analytics.overview.totalTickets > 0 
                    ? Math.round((analytics.overview.resolvedTickets / analytics.overview.totalTickets) * 100)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                {analytics.overview.resolvedTickets} of {analytics.overview.totalTickets} resolved
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {analytics.overview.avgResponseTimeHours.toFixed(1)}h
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">First response time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.overview.avgRating.toFixed(1)}/5
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">
                Based on {analytics.overview.totalFeedback} reviews
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tickets</p>
                <p className="text-3xl font-bold text-orange-600">
                  {analytics.overview.openTickets}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Require attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="tickets" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feedback Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Ticket Volume</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tickets:</span>
                  <span className="font-medium">{analytics.overview.totalTickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recent ({period} days):</span>
                  <span className="font-medium">{analytics.overview.recentTickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Average:</span>
                  <span className="font-medium">
                    {(analytics.overview.recentTickets / parseInt(period)).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Response Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Response Time:</span>
                  <span className="font-medium">{analytics.overview.avgResponseTimeHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resolution Rate:</span>
                  <span className="font-medium">
                    {analytics.overview.totalTickets > 0 
                      ? Math.round((analytics.overview.resolvedTickets / analytics.overview.totalTickets) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Tickets:</span>
                  <span className="font-medium">{analytics.overview.openTickets}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Customer Feedback</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Reviews:</span>
                  <span className="font-medium">{analytics.overview.totalFeedback}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Rating:</span>
                  <span className="font-medium">{analytics.overview.avgRating.toFixed(1)}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Satisfaction:</span>
                  <span className="font-medium">
                    {analytics.overview.avgRating >= 4 ? 'High' : 
                     analytics.overview.avgRating >= 3 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}