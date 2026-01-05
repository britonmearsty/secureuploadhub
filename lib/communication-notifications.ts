import prisma from '@/lib/prisma'
import { NotificationType } from '@/lib/communication-types'

interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  content: string
  data?: any
}

/**
 * Create a notification for a user
 */
export async function createNotification(notificationData: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: notificationData
    })
    
    // TODO: Send real-time notification via WebSocket
    // TODO: Send push notification if enabled
    
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Create notifications for ticket events
 */
export async function createTicketNotifications(
  ticketId: string,
  userId: string,
  adminId: string | null,
  type: 'created' | 'updated' | 'resolved' | 'message_received',
  data?: any
) {
  const notifications = []

  switch (type) {
    case 'created':
      // Notify all admins about new ticket
      const admins = await prisma.user.findMany({
        where: { role: 'admin', status: 'active' },
        select: { id: true }
      })
      
      for (const admin of admins) {
        notifications.push(
          createNotification({
            userId: admin.id,
            type: 'TICKET_CREATED',
            title: 'New Support Ticket',
            content: `A new support ticket has been created: ${data?.subject}`,
            data: { ticketId, userId }
          })
        )
      }
      break

    case 'updated':
      // Notify user about ticket status change
      if (data?.statusChanged) {
        notifications.push(
          createNotification({
            userId,
            type: 'TICKET_UPDATED',
            title: 'Ticket Status Updated',
            content: `Your ticket status has been updated to: ${data.newStatus}`,
            data: { ticketId }
          })
        )
      }
      break

    case 'resolved':
      // Notify user about ticket resolution
      notifications.push(
        createNotification({
          userId,
          type: 'TICKET_RESOLVED',
          title: 'Ticket Resolved',
          content: 'Your support ticket has been resolved. Please check the details.',
          data: { ticketId }
        })
      )
      break

    case 'message_received':
      // Notify the other party about new message
      const targetUserId = data?.isAdminMessage ? userId : adminId
      if (targetUserId) {
        notifications.push(
          createNotification({
            userId: targetUserId,
            type: 'MESSAGE_RECEIVED',
            title: 'New Message',
            content: `You have received a new message on your support ticket`,
            data: { ticketId, messageId: data?.messageId }
          })
        )
      }
      break
  }

  // Execute all notifications
  await Promise.allSettled(notifications)
}

/**
 * Create notification for feedback response
 */
export async function createFeedbackNotification(
  userId: string,
  feedbackId: string,
  status: string
) {
  await createNotification({
    userId,
    type: 'FEEDBACK_RESPONSE',
    title: 'Feedback Update',
    content: `Your feedback has been ${status.toLowerCase()}. Thank you for your input!`,
    data: { feedbackId }
  })
}

/**
 * Create system announcement notification for all users
 */
export async function createSystemAnnouncement(
  title: string,
  content: string,
  data?: any
) {
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true }
  })

  const notifications = users.map(user =>
    createNotification({
      userId: user.id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title,
      content,
      data
    })
  )

  await Promise.allSettled(notifications)
}