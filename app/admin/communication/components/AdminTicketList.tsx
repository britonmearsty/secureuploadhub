'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Clock, 
  User, 
  Search, 
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Timer,
  UserCheck
} from 'lucide-react'
import { TicketStatus, Priority } from '@/lib/communication-types'
import { formatDistanceToNow, format } from 'date-fns'
import AdminTicketDetails from '@/app/admin/communication/components/AdminTicketDetails'

interface AdminTicket {
  id: string
  subject: string
  description: string
  status: TicketStatus
  priority: Priority
  category: string
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
  admin?: {
    id: string
    name: string
    email: string
    image?: string | null
  } | null
  _count: {
    messages: number
    attachments: number
  }
  messages?: Array<{
    createdAt: string
    isAdmin: boolean
    sender: {
      name: string
      role: string
    }
  }>
}

const statusColors = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  WAITING_FOR_USER: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800'
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
}

const statusIcons = {
  OPEN: AlertCircle,
  IN_PROGRESS: Timer,
  WAITING_FOR_USER: Clock,
  RESOLVED: CheckCircle,
  CLOSED: CheckCircle
}

export default function AdminTicketList() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null)
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (assignedFilter !== 'all') params.append('assignedTo', assignedFilter)

      const response = await fetch(`/api/admin/communication/tickets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tickets')
      
      const data = await response.json()
      setTickets(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      setLoadingDetails(true)
      const response = await fetch(`/api/admin/communication/tickets/${ticketId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch ticket details')
      }
      const result = await response.json()
      setSelectedTicketDetails(result.data)
    } catch (err) {
      console.error('Error fetching ticket details:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket details')
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [page, statusFilter, priorityFilter, categoryFilter, assignedFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== '') {
        setPage(1)
        fetchTickets()
      } else if (search === '') {
        fetchTickets()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [search])

  const handleTicketUpdate = () => {
    fetchTickets()
    // Refresh selected ticket details if it's currently being viewed
    if (selectedTicket) {
      fetchTicketDetails(selectedTicket.id)
    }
  }

  const getLastActivity = (ticket: AdminTicket) => {
    if (ticket.messages && ticket.messages.length > 0) {
      const lastMessage = ticket.messages[0]
      return {
        time: formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true }),
        isAdmin: lastMessage.isAdmin,
        sender: lastMessage.sender.name
      }
    }
    return {
      time: formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }),
      isAdmin: false,
      sender: ticket.user.name
    }
  }

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedTicket(null)
              setSelectedTicketDetails(null)
            }}
            className="flex items-center gap-2"
          >
            ← Back to List
          </Button>
          <Badge className={statusColors[selectedTicket.status]}>
            {selectedTicket.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={priorityColors[selectedTicket.priority]}>
            {selectedTicket.priority}
          </Badge>
        </div>
        {loadingDetails ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : selectedTicketDetails ? (
          <AdminTicketDetails 
            ticket={selectedTicketDetails} 
            onTicketUpdate={handleTicketUpdate}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Failed to load ticket details
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING_FOR_USER">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {/* TODO: Add actual admin users */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
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
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
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
            <Button onClick={fetchTickets} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500">No tickets match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const lastActivity = getLastActivity(ticket)
            const StatusIcon = statusIcons[ticket.status]
            
            return (
              <Card 
                key={ticket.id} 
                className="cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => {
                  setSelectedTicket(ticket)
                  fetchTicketDetails(ticket.id)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className={`h-4 w-4 ${
                          ticket.status === 'OPEN' ? 'text-red-500' :
                          ticket.status === 'RESOLVED' ? 'text-green-500' :
                          ticket.status === 'IN_PROGRESS' ? 'text-yellow-500' :
                          'text-gray-500'
                        }`} />
                        <h3 className="font-medium text-gray-900 truncate">
                          {ticket.subject}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={ticket.user.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {ticket.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{ticket.user.name}</span>
                        </div>
                        
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {ticket._count.messages}
                        </span>
                        
                        <span className="capitalize">{ticket.category}</span>
                        
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {lastActivity.time}
                        </span>
                        
                        {ticket.admin && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-4 w-4" />
                            {ticket.admin.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={priorityColors[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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