// Communication system types
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type FeedbackCategory = 'GENERAL' | 'BUG_REPORT' | 'FEATURE_REQUEST' | 'UI_UX' | 'PERFORMANCE' | 'BILLING'
export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'IMPLEMENTED' | 'REJECTED'
export type NotificationType = 'TICKET_CREATED' | 'TICKET_UPDATED' | 'TICKET_RESOLVED' | 'MESSAGE_RECEIVED' | 'FEEDBACK_RESPONSE' | 'SYSTEM_ANNOUNCEMENT'

export interface TicketData {
  id: string
  userId: string
  adminId?: string | null
  subject: string
  description: string
  status: TicketStatus
  priority: Priority
  category: string
  createdAt: Date
  updatedAt: Date
  closedAt?: Date | null
}

export interface MessageData {
  id: string
  ticketId: string
  senderId: string
  content: string
  isAdmin: boolean
  createdAt: Date
  readAt?: Date | null
}

export interface FeedbackData {
  id: string
  userId: string
  rating: number
  comment?: string | null
  category: FeedbackCategory
  status: FeedbackStatus
  adminNotes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface NotificationData {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string
  data?: any
  read: boolean
  createdAt: Date
}