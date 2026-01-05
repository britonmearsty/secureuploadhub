import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { TicketStatus, Priority } from '@/lib/communication-types'

// GET /api/admin/communication/tickets/[id] - Get ticket details (admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateCommunication('admin')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const { id: ticketId } = await params

    // Fetch ticket with full details
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            role: true,
            status: true
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
    console.error('Error fetching admin ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/communication/tickets/[id] - Update ticket (admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateCommunication('admin')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const { id: ticketId } = await params
    const body = await request.json()

    // Get current ticket
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.status && ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].includes(body.status)) {
      updateData.status = body.status
      if (body.status === 'CLOSED' || body.status === 'RESOLVED') {
        updateData.closedAt = new Date()
      } else if (currentTicket.closedAt) {
        updateData.closedAt = null
      }
    }
    
    if (body.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority)) {
      updateData.priority = body.priority
    }
    
    if (body.adminId !== undefined) {
      updateData.adminId = body.adminId || null
    }
    
    if (body.category) {
      updateData.category = body.category.trim()
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
        action: 'admin_ticket_updated',
        resource: 'ticket',
        resourceId: ticketId,
        details: {
          changes: updateData,
          previousStatus: currentTicket.status,
          newStatus: updatedTicket.status,
          ticketUserId: currentTicket.userId
        }
      }
    })

    // TODO: Send notifications to user for status changes
    // TODO: Send email notifications

    return NextResponse.json({ data: updatedTicket })
  } catch (error) {
    console.error('Error updating admin ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}