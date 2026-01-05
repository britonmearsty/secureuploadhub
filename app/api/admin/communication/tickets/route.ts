import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { TicketStatus, Priority } from '@/lib/communication-types'

// GET /api/admin/communication/tickets - List all tickets (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateCommunication('admin')
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') as TicketStatus | null
    const priority = searchParams.get('priority') as Priority | null
    const category = searchParams.get('category') || null
    const assignedTo = searchParams.get('assignedTo') || null
    const search = searchParams.get('search') || null
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (priority) {
      where.priority = priority
    }
    
    if (category) {
      where.category = category
    }
    
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        where.adminId = null
      } else {
        where.adminId = assignedTo
      }
    }
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Fetch tickets with related data
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
          },
          messages: {
            select: {
              createdAt: true,
              isAdmin: true,
              sender: {
                select: {
                  name: true,
                  role: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.ticket.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Get summary stats
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      data: tickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: {
        total: totalCount,
        byStatus: statusCounts
      }
    })
  } catch (error) {
    console.error('Error fetching admin tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}