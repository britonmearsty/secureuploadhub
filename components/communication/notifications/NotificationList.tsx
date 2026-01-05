'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, MessageSquare, Star, AlertCircle } from 'lucide-react'
import { NotificationType } from '@/lib/communication-types'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: NotificationType
  title: string
  content: string
  data?: any
  read: boolean
  createdAt: string
}

const notificationIcons = {
  TICKET_CREATED: MessageSquare,
  TICKET_UPDATED: MessageSquare,
  TICKET_RESOLVED: CheckCheck,
  MESSAGE_RECEIVED: MessageSquare,
  FEEDBACK_RESPONSE: Star,
  SYSTEM_ANNOUNCEMENT: AlertCircle
}

const notificationColors = {
  TICKET_CREATED: 'bg-blue-100 text-blue-800',
  TICKET_UPDATED: 'bg-yellow-100 text-yellow-800',
  TICKET_RESOLVED: 'bg-green-100 text-green-800',
  MESSAGE_RECEIVED: 'bg-purple-100 text-purple-800',
  FEEDBACK_RESPONSE: 'bg-orange-100 text-orange-800',
  SYSTEM_ANNOUNCEMENT: 'bg-red-100 text-red-800'
}

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/communication/notifications')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
      setNotifications(data.data)
      setUnreadCount(data.unreadCount)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/communication/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      if (!response.ok) throw new Error('Failed to mark as read')
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/communication/notifications/read-all', {
        method: 'PUT'
      })
      if (!response.ok) throw new Error('Failed to mark all as read')
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-start gap-3 p-3 border rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchNotifications} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="font-medium">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      )}

      {/* Notifications */}
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-500">You're all caught up! New notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type]
            
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                  notification.read 
                    ? 'bg-white border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className={`p-2 rounded-full ${notificationColors[notification.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${
                        notification.read ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-gray-600' : 'text-gray-700'
                      }`}>
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}