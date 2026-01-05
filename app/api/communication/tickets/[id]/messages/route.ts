import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication, canAccessTicket } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { createTicketNotifications } from '@/lib/communication-notifications'
import { sendTicketReplyEmail } from '@/lib/communication-emails'

// GET /api/communication/tickets/[id]/messages - Get ticket messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateCommunication()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const { id: ticketId } = await params
    const isAdmin = authResult.user!.role === 'admin'

    // Check access permissions
    const hasAccess = await canAccessTicket(authResult.user!.id, ticketId, isAdmin)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Fetch messages
    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: { ticketId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true
            }
          },
          attachments: true
        },
        orderBy: {
          createdAt: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.message.count({ where: { ticketId } })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: messages,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/communication/tickets/[id]/messages - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateCommunication()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const { id: ticketId } = await params
    const isAdmin = authResult.user!.role === 'admin'
    const body = await request.json()
    const { content } = body

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Check access permissions
    const hasAccess = await canAccessTicket(authResult.user!.id, ticketId, isAdmin)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      )
    }

    // Check if ticket exists and is not closed
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
        userId: true,
        adminId: true,
        subject: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Don't allow messages on closed tickets unless admin
    if (ticket.status === 'CLOSED' && !isAdmin) {
      return NextResponse.json(
        { error: 'Cannot send messages to closed tickets' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        ticketId,
        senderId: authResult.user!.id,
        content: content.trim(),
        isAdmin
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true
          }
        },
        attachments: true
      }
    })

    // Update ticket status if needed
    let ticketUpdate: any = {}
    
    if (isAdmin) {
      // Admin replied - assign ticket if not assigned and set to IN_PROGRESS
      if (!ticket.adminId) {
        ticketUpdate.adminId = authResult.user!.id
      }
      if (ticket.status === 'OPEN' || ticket.status === 'WAITING_FOR_USER') {
        ticketUpdate.status = 'IN_PROGRESS'
      }
    } else {
      // User replied - set to WAITING_FOR_USER if it was IN_PROGRESS
      if (ticket.status === 'IN_PROGRESS') {
        ticketUpdate.status = 'WAITING_FOR_USER'
      }
    }

    // Apply ticket updates if any
    if (Object.keys(ticketUpdate).length > 0) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: ticketUpdate
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authResult.user!.id,
        action: 'message_sent',
        resource: 'message',
        resourceId: message.id,
        details: {
          ticketId,
          isAdmin,
          contentLength: content.length
        }
      }
    })

    // Send notification to the other party
    try {
      await createTicketNotifications(
        ticketId,
        ticket.userId,
        ticket.adminId,
        'message_received',
        { 
          isAdminMessage: isAdmin,
          messageId: message.id
        }
      )
    } catch (error) {
      console.error('Error creating message notifications:', error)
    }

    // Send email notification
    try {
      const recipientEmail = isAdmin ? ticket.user.email : ticket.admin?.email
      const recipientName = isAdmin ? ticket.user.name : ticket.admin?.name
      
      if (recipientEmail && recipientName) {
        await sendTicketReplyEmail({
          to: recipientEmail,
          userName: recipientName,
          ticketId,
          subject: ticket.subject,
          message: content,
          isAdminReply: isAdmin,
          senderName: authResult.user!.name || 'User'
        })
      }
    } catch (error) {
      console.error('Error sending ticket reply email:', error)
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}