import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication, canAccessTicket, canModifyTicket } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { TicketStatus, Priority } from '@/lib/communication-types'

// GET /api/communication/tickets/[id] - Get ticket details
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

    // Fetch ticket with full details
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        messages: {
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
          }
        },
        attachments: true,
        _count: {
          select: {
            messages: true,
            attachments: true
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

    return NextResponse.json({ data: ticket })
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// PUT /api/communication/tickets/[id] - Update ticket
export async function PUT(
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

    // Check modification permissions
    const canModify = await canModifyTicket(authResult.user!.id, ticketId, authResult.user!.role)
    if (!canModify) {
      return NextResponse.json(
        { error: 'Cannot modify this ticket' },
        { status: 403 }
      )
    }

    // Get current ticket
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    })

    if (!currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    // Users can only update certain fields
    if (!isAdmin) {
      if (body.subject) updateData.subject = body.subject.trim()
      if (body.description) updateData.description = body.description.trim()
      if (body.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority)) {
        updateData.priority = body.priority
      }
    } else {
      // Admins can update more fields
      if (body.subject) updateData.subject = body.subject.trim()
      if (body.description) updateData.description = body.description.trim()
      if (body.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority)) {
        updateData.priority = body.priority
      }
      if (body.status && ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].includes(body.status)) {
        updateData.status = body.status
        if (body.status === 'CLOSED' || body.status === 'RESOLVED') {
          updateData.closedAt = new Date()
        }
      }
      if (body.adminId) {
        updateData.adminId = body.adminId
      }
      if (body.category) updateData.category = body.category.trim()
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
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
        },
        _count: {
          select: {
            messages: true,
            attachments: true
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authResult.user!.id,
        action: 'ticket_updated',
        resource: 'ticket',
        resourceId: ticketId,
        details: {
          changes: updateData,
          previousStatus: currentTicket.status,
          newStatus: updatedTicket.status
        }
      }
    })

    // TODO: Send notifications for status changes
    // TODO: Send email notifications

    return NextResponse.json({ data: updatedTicket })
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}

// DELETE /api/communication/tickets/[id] - Delete ticket (users only, and only if no admin responses)
export async function DELETE(
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

    // Only users can delete their own tickets, and only if no admin has responded
    if (isAdmin) {
      return NextResponse.json(
        { error: 'Admins cannot delete tickets' },
        { status: 403 }
      )
    }

    // Check if ticket exists and belongs to user
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId: authResult.user!.id
      },
      include: {
        messages: {
          where: {
            isAdmin: true
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

    // Check if admin has responded
    if (ticket.messages.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete ticket with admin responses' },
        { status: 403 }
      )
    }

    // Delete ticket (cascade will handle messages and attachments)
    await prisma.ticket.delete({
      where: { id: ticketId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authResult.user!.id,
        action: 'ticket_deleted',
        resource: 'ticket',
        resourceId: ticketId,
        details: {
          subject: ticket.subject,
          category: ticket.category
        }
      }
    })

    return NextResponse.json({ message: 'Ticket deleted successfully' })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    )
  }
}