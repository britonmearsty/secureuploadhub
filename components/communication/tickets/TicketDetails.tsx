'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Send, User, Clock, Paperclip } from 'lucide-react'
import { TicketStatus, Priority } from '@/lib/communication-types'
import { formatDistanceToNow, format } from 'date-fns'

interface Message {
  id: string
  content: string
  isAdmin: boolean
  createdAt: string
  readAt?: string | null
  sender: {
    id: string
    name: string
    email: string
    image?: string | null
    role: string
  }
  attachments: Array<{
    id: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
}

interface TicketDetailsData {
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
  messages: Message[]
  attachments: Array<{
    id: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
  _count: {
    messages: number
    attachments: number
  }
}

interface TicketDetailsProps {
  ticketId: string
  onTicketUpdate?: () => void
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

export default function TicketDetails({ ticketId, onTicketUpdate }: TicketDetailsProps) {
  const [ticket, setTicket] = useState<TicketDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/communication/tickets/${ticketId}`)
      if (!response.ok) throw new Error('Failed to fetch ticket')
      
      const data = await response.json()
      setTicket(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sendingMessage) return

    try {
      setSendingMessage(true)
      const response = await fetch(`/api/communication/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      setNewMessage('')
      await fetchTicket() // Refresh ticket data
      onTicketUpdate?.()
    } catch (error) {
      console.error('Error sending message:', error)
      // TODO: Show error toast
    } finally {
      setSendingMessage(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [ticketId])

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !ticket) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error || 'Ticket not found'}</p>
          <Button onClick={fetchTicket} variant="outline" className="border-border hover:bg-muted">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2 text-foreground">{ticket.subject}</CardTitle>
              <p className="text-muted-foreground mb-4">{ticket.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Created {format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                <span className="capitalize">{ticket.category}</span>
                {ticket.admin && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Assigned to {ticket.admin.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`border ${statusColors[ticket.status]}`}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge className={`border ${priorityColors[ticket.priority]}`}>
                {ticket.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5" />
            Messages ({ticket._count.messages})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
          ) : (
            <div className="space-y-4">
              {ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isAdmin ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender.image || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {(message.sender?.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[80%] ${message.isAdmin ? 'text-left' : 'text-right'}`}>
                    <div
                      className={`rounded-xl p-4 ${
                        message.isAdmin
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 text-sm opacity-90"
                            >
                              <Paperclip className="h-3 w-3" />
                              <a
                                href={attachment.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {attachment.fileName} ({formatFileSize(attachment.fileSize)})
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{message.sender?.name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                      {message.isAdmin && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          Support
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message Input */}
          {ticket.status !== 'CLOSED' && (
            <form onSubmit={sendMessage} className="border-t border-border pt-4 mt-6">
              <div className="space-y-3">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                  disabled={sendingMessage}
                  className="bg-card border-border focus:ring-ring resize-none"
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {sendingMessage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {ticket.status === 'CLOSED' && (
            <div className="border-t border-border pt-4 mt-6 text-center">
              <p className="text-muted-foreground">This ticket has been closed. Contact support to reopen if needed.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}