/**
 * Communication system email templates
 */

import { sendEmail } from './email-service'
import { TicketCreatedEmail } from '@/emails/TicketCreatedEmail'
import { TicketReplyEmail } from '@/emails/TicketReplyEmail'
import { TicketStatusEmail } from '@/emails/TicketStatusEmail'
import { FeedbackResponseEmail } from '@/emails/FeedbackResponseEmail'

export interface SendTicketCreatedEmailOptions {
  to: string
  userName: string
  ticketId: string
  subject: string
  category: string
  priority: string
  dashboardUrl?: string
}

export interface SendTicketReplyEmailOptions {
  to: string
  userName: string
  ticketId: string
  subject: string
  message: string
  isAdminReply: boolean
  senderName: string
  dashboardUrl?: string
}

export interface SendTicketStatusEmailOptions {
  to: string
  userName: string
  ticketId: string
  subject: string
  oldStatus: string
  newStatus: string
  adminName?: string
  dashboardUrl?: string
}

export interface SendFeedbackResponseEmailOptions {
  to: string
  userName: string
  feedbackId: string
  category: string
  rating: number
  status: string
  adminNotes?: string
  dashboardUrl?: string
}

/**
 * Send ticket created confirmation email
 */
export async function sendTicketCreatedEmail(options: SendTicketCreatedEmailOptions) {
  try {
    return await sendEmail({
      to: options.to,
      subject: `Ticket Created: ${options.subject}`,
      react: (
        <TicketCreatedEmail
          userName={options.userName}
          ticketId={options.ticketId}
          subject={options.subject}
          category={options.category}
          priority={options.priority}
          dashboardUrl={options.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication`}
        />
      )
    })
  } catch (error) {
    console.error('Error sending ticket created email:', error)
    throw error
  }
}

/**
 * Send ticket reply notification email
 */
export async function sendTicketReplyEmail(options: SendTicketReplyEmailOptions) {
  try {
    return await sendEmail({
      to: options.to,
      subject: `Re: ${options.subject}`,
      react: (
        <TicketReplyEmail
          userName={options.userName}
          ticketId={options.ticketId}
          subject={options.subject}
          message={options.message}
          isAdminReply={options.isAdminReply}
          senderName={options.senderName}
          dashboardUrl={options.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication`}
        />
      )
    })
  } catch (error) {
    console.error('Error sending ticket reply email:', error)
    throw error
  }
}

/**
 * Send ticket status change notification email
 */
export async function sendTicketStatusEmail(options: SendTicketStatusEmailOptions) {
  try {
    return await sendEmail({
      to: options.to,
      subject: `Ticket Status Updated: ${options.subject}`,
      react: (
        <TicketStatusEmail
          userName={options.userName}
          ticketId={options.ticketId}
          subject={options.subject}
          oldStatus={options.oldStatus}
          newStatus={options.newStatus}
          adminName={options.adminName}
          dashboardUrl={options.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication`}
        />
      )
    })
  } catch (error) {
    console.error('Error sending ticket status email:', error)
    throw error
  }
}

/**
 * Send feedback response notification email
 */
export async function sendFeedbackResponseEmail(options: SendFeedbackResponseEmailOptions) {
  try {
    return await sendEmail({
      to: options.to,
      subject: 'Thank you for your feedback',
      react: (
        <FeedbackResponseEmail
          userName={options.userName}
          feedbackId={options.feedbackId}
          category={options.category}
          rating={options.rating}
          status={options.status}
          adminNotes={options.adminNotes}
          dashboardUrl={options.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/communication`}
        />
      )
    })
  } catch (error) {
    console.error('Error sending feedback response email:', error)
    throw error
  }
}