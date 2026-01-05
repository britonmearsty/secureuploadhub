'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  Paperclip,
  Settings,
  UserCheck,
  Mail
} from 'lucide-react'
import { TicketStatus, Priority } from '@/lib/communication-types'
import { formatDistanceToNow, format } from 'date-fns'

interface AdminTicketDetailsProps {
  ticket: {
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
    messages?: Array<{
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
    }>
    attachments?: Array<{
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
  onTicketUpdate?: () => void
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

export default function AdminTicketDetails({ ticket, onTicketUpdate }: AdminTicketDetailsProps) {
  const [fullTicket, setFullTicket] = useState(ticket)
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [updatingTicket, setUpdatingTicket] = useState(false)
  const [ticketUpdates, setTicketUpdates] = useState({
    status: fullTicket.status,
    priority: fullTicket.priority,
    adminId: fullTicket.admin?.id || ''
  })

  // Fetch full ticket details on mount
  useEffect(() => {
    const fetchFullTicket = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/communication/tickets/${ticket.id}`)
        if (!response.ok) throw new Error('Failed to fetch ticket details')
        
        const data = await response.json()
        setFullTicket(data.data)
        // Update the form state with the fresh data
        setTicketUpdates({
          status: data.data.status,
          priority: data.data.priority,
          adminId: data.data.admin?.id || ''
        })
      } catch (error) {
        console.error('Error fetching full ticket:', error)
        // Fall back to the passed ticket data
        setFullTicket(ticket)
      } finally {
        setLoading(false)
      }
    }

    fetchFullTicket()
  }, [ticket.id])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sendingMessage) return

    try {
      setSendingMessage(true)
      const response = await fetch(`/api/communication/tickets/${fullTicket.id}/messages`, {
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
      onTicketUpdate?.()
    } catch (error) {
      console.error('Error sending message:', error)
      // TODO: Show error toast
    } finally {
      setSendingMessage(false)
    }
  }

  const updateTicket = async () => {
    try {
      setUpdatingTicket(true)
      const response = await fetch(`/api/admin/communication/tickets/${fullTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketUpdates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update ticket')
      }

      onTicketUpdate?.()
    } catch (error) {
      console.error('Error updating ticket:', error)
      // TODO: Show error toast
    } finally {
      setUpdatingTicket(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const hasChanges = 
    ticketUpdates.status !== fullTicket.status ||
    ticketUpdates.priority !== fullTicket.priority ||
    ticketUpdates.adminId !== (fullTicket.admin?.id || '')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{fullTicket.subject}</CardTitle>
                <p className="text-gray-600 mb-4">{fullTicket.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span>Created {format(new Date(fullTicket.createdAt), 'MMM d, yyyy')}</span>
                  <span className="capitalize">{fullTicket.category}</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={fullTicket.user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {fullTicket.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{fullTicket.user.name}</span>
                    <span className="text-gray-400">({fullTicket.user.email})</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={statusColors[fullTicket.status]}>
                  {fullTicket.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className={priorityColors[fullTicket.priority]}>
                  {fullTicket.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages ({fullTicket._count.messages})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!fullTicket.messages || fullTicket.messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
            ) : (
              <div className="space-y-4">
                {fullTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.isAdmin ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.image || undefined} />
                      <AvatarFallback>
                        {message.sender.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 max-w-[80%] ${message.isAdmin ? 'text-left' : 'text-right'}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          message.isAdmin
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.attachments && message.attachments.length > 0 && (
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
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{message.sender.name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                        {message.isAdmin && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message Input */}
            {fullTicket.status !== 'CLOSED' && (
              <form onSubmit={sendMessage} className="border-t pt-4 mt-6">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your response..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    disabled={sendingMessage}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!newMessage.trim() || sendingMessage}>
                      {sendingMessage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {fullTicket.status === 'CLOSED' && (
              <div className="border-t pt-4 mt-6 text-center">
                <p className="text-gray-500">This ticket has been closed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Ticket Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Ticket Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={ticketUpdates.status} 
                onValueChange={(value: TicketStatus) => 
                  setTicketUpdates(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="WAITING_FOR_USER">Waiting for User</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select 
                value={ticketUpdates.priority} 
                onValueChange={(value: Priority) => 
                  setTicketUpdates(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to Admin</label>
              <Select 
                value={ticketUpdates.adminId} 
                onValueChange={(value) => 
                  setTicketUpdates(prev => ({ ...prev, adminId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {/* TODO: Add actual admin users */}
                  <SelectItem value="current">Assign to me</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasChanges && (
              <Button 
                onClick={updateTicket} 
                disabled={updatingTicket}
                className="w-full"
              >
                {updatingTicket ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Ticket'
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={fullTicket.user.image || undefined} />
                <AvatarFallback>
                  {fullTicket.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{fullTicket.user.name}</p>
                <p className="text-sm text-gray-500">{fullTicket.user.email}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">User ID:</span>
                <span className="font-mono text-xs">{fullTicket.user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member since:</span>
                <span>{format(new Date(fullTicket.createdAt), 'MMM yyyy')}</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href={`mailto:${fullTicket.user.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Assignment Info */}
        {fullTicket.admin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Assigned Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={fullTicket.admin.image || undefined} />
                  <AvatarFallback>
                    {fullTicket.admin.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{fullTicket.admin.name}</p>
                  <p className="text-sm text-gray-500">{fullTicket.admin.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}