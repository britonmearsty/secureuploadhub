'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Clock, User, Search, Filter } from 'lucide-react'
import { TicketStatus, Priority } from '@/lib/communication-types'
import { formatDistanceToNow } from 'date-fns'

interface Ticket {
  id: string
  subject: string
  description: string
  status: TicketStatus
  priority: Priority
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

interface TicketListProps {
  onTicketSelect?: (ticket: Ticket) => void
  selectedTicketId?: string
}

const statusColors = {
  OPEN: 'bg-primary/10 text-primary border-primary/20',
  IN_PROGRESS: 'bg-warning/10 text-warning border-warning/20',
  WAITING_FOR_USER: 'bg-warning/10 text-warning border-warning/20',
  RESOLVED: 'bg-success/10 text-success border-success/20',
  CLOSED: 'bg-muted text-muted-foreground border-border'
}

const priorityColors = {
  LOW: 'bg-muted text-muted-foreground border-border',
  MEDIUM: 'bg-primary/10 text-primary border-primary/20',
  HIGH: 'bg-warning/10 text-warning border-warning/20',
  URGENT: 'bg-destructive/10 text-destructive border-destructive/20'
}

export default function TicketList({ onTicketSelect, selectedTicketId }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)

      const response = await fetch(`/api/communication/tickets?${params}`)
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

  useEffect(() => {
    fetchTickets()
  }, [page, statusFilter, categoryFilter])

  const getLastActivity = (ticket: Ticket) => {
    if (ticket.messages.length > 0) {
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
      sender: 'You'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse border-border">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchTickets} variant="outline" className="border-border hover:bg-muted">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-card border-border">
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-card border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets */}
      {tickets.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No tickets found</h3>
            <p className="text-muted-foreground">Create your first support ticket to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const lastActivity = getLastActivity(ticket)
            const isSelected = selectedTicketId === ticket.id
            
            return (
              <Card 
                key={ticket.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-border ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => onTicketSelect?.(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Badge className={`border ${statusColors[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={`border ${priorityColors[ticket.priority]}`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {ticket._count.messages}
                      </span>
                      <span className="capitalize">{ticket.category}</span>
                      {ticket.admin && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {ticket.admin.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{lastActivity.time}</span>
                      {lastActivity.isAdmin && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary">
                          Admin replied
                        </Badge>
                      )}
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
            className="border-border hover:bg-muted"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="border-border hover:bg-muted"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}