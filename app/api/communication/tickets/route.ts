import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { TicketStatus, Priority } from '@/lib/communication-types'
import { createTicketNotifications } from '@/lib/communication-notifications'
import { sendTicketCreatedEmail } from '@/lib/communication-emails'

// GET /api/communication/tickets - List user tickets
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateCommunication()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') as TicketStatus | null
    const category = searchParams.get('category') || null
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: authResult.user!.id
    }
    
    if (status) {
      where.status = status
    }
    
    if (category) {
      where.category = category
    }

    // Fetch tickets with message counts
    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          subject: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          closedAt: true,
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
          },
          messages: {
            select: {
              createdAt: true,
              isAdmin: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.ticket.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: tickets,
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
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST /api/communication/tickets - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateCommunication()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const body = await request.json()
    const { subject, description, category, priority } = body

    // Validate required fields
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Subject, description, and category are required' },
        { status: 400 }
      )
    }

    // Validate priority
    const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        userId: authResult.user!.id,
        subject: subject.trim(),
        description: description.trim(),
        category: category.trim(),
        priority: priority || 'MEDIUM',
        status: 'OPEN'
      },
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
        action: 'ticket_created',
        resource: 'ticket',
        resourceId: ticket.id,
        details: {
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority
        }
      }
    })

    // Send notifications to admins
    try {
      await createTicketNotifications(
        ticket.id,
        authResult.user!.id,
        null,
        'created',
        { subject: ticket.subject }
      )
    } catch (error) {
      console.error('Error creating ticket notifications:', error)
    }

    // Send confirmation email to user
    try {
      await sendTicketCreatedEmail({
        to: authResult.user!.email,
        userName: authResult.user!.name || 'User',
        ticketId: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority
      })
    } catch (error) {
      console.error('Error sending ticket created email:', error)
    }

    return NextResponse.json({ data: ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}