'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Star, 
  Search, 
  MessageSquare,
  Calendar,
  User,
  Edit,
  Save,
  X
} from 'lucide-react'
import { FeedbackCategory, FeedbackStatus } from '@/lib/communication-types'
import { formatDistanceToNow, format } from 'date-fns'

interface AdminFeedback {
  id: string
  rating: number
  comment?: string | null
  category: FeedbackCategory
  status: FeedbackStatus
  adminNotes?: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWED: 'bg-blue-100 text-blue-800',
  IMPLEMENTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
}

const categoryColors = {
  GENERAL: 'bg-gray-100 text-gray-800',
  BUG_REPORT: 'bg-red-100 text-red-800',
  FEATURE_REQUEST: 'bg-purple-100 text-purple-800',
  UI_UX: 'bg-blue-100 text-blue-800',
  PERFORMANCE: 'bg-orange-100 text-orange-800',
  BILLING: 'bg-green-100 text-green-800'
}

export default function AdminFeedbackList() {
  const [feedback, setFeedback] = useState<AdminFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedFeedback, setSelectedFeedback] = useState<AdminFeedback | null>(null)
  const [responseData, setResponseData] = useState({
    status: '' as FeedbackStatus | '',
    adminNotes: ''
  })
  const [updating, setUpdating] = useState(false)

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (search) params.append('search', search)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (ratingFilter !== 'all') params.append('rating', ratingFilter)

      const response = await fetch(`/api/admin/communication/feedback?${params}`)
      if (!response.ok) throw new Error('Failed to fetch feedback')
      
      const data = await response.json()
      setFeedback(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
  }, [page, categoryFilter, statusFilter, ratingFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== '') {
        setPage(1)
        fetchFeedback()
      } else if (search === '') {
        fetchFeedback()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [search])

  const handleFeedbackResponse = async (feedbackId: string) => {
    if (!responseData.status) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/communication/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update feedback')
      }

      // Reset form and refresh data
      setResponseData({ status: '', adminNotes: '' })
      setSelectedFeedback(null)
      fetchFeedback()
    } catch (error) {
      console.error('Error updating feedback:', error)
      // TODO: Show error toast
    } finally {
      setUpdating(false)
    }
  }

  const openResponseModal = (feedbackItem: AdminFeedback) => {
    setSelectedFeedback(feedbackItem)
    setResponseData({
      status: feedbackItem.status,
      adminNotes: feedbackItem.adminNotes || ''
    })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ))
  }

  const formatCategory = (category: string) => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search feedback..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="BUG_REPORT">Bug Report</SelectItem>
                <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                <SelectItem value="UI_UX">UI/UX</SelectItem>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
                <SelectItem value="BILLING">Billing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchFeedback} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
            <p className="text-gray-500">No feedback matches your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.user.image || undefined} />
                      <AvatarFallback>
                        {item.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{item.user.name}</p>
                      <p className="text-sm text-gray-500">{item.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[item.status]}>
                      {item.status}
                    </Badge>
                    <Badge variant="outline" className={categoryColors[item.category]}>
                      {formatCategory(item.category)}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">{renderStars(item.rating)}</div>
                    <span className="text-sm text-gray-600">({item.rating}/5)</span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {item.comment && (
                    <p className="text-gray-700 mb-3">{item.comment}</p>
                  )}
                  {item.adminNotes && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-1">Admin Response:</p>
                      <p className="text-sm text-blue-800">{item.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openResponseModal(item)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {item.status === 'PENDING' ? 'Respond' : 'Update Response'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Respond to Feedback</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Select 
                            value={responseData.status} 
                            onValueChange={(value: FeedbackStatus) => 
                              setResponseData(prev => ({ ...prev, status: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="REVIEWED">Reviewed</SelectItem>
                              <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Admin Notes (Optional)</label>
                          <Textarea
                            placeholder="Add your response or notes..."
                            value={responseData.adminNotes}
                            onChange={(e) => 
                              setResponseData(prev => ({ ...prev, adminNotes: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              Cancel
                            </Button>
                          </DialogTrigger>
                          <Button 
                            onClick={() => selectedFeedback && handleFeedbackResponse(selectedFeedback.id)}
                            disabled={!responseData.status || updating}
                          >
                            {updating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Response
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}