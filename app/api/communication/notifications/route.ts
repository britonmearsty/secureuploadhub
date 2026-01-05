import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { NotificationType } from '@/lib/communication-types'

// GET /api/communication/notifications - Get user notifications
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type') as NotificationType | null
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: authResult.user!.id
    }
    
    if (unreadOnly) {
      where.read = false
    }
    
    if (type) {
      where.type = type
    }

    // Fetch notifications
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          data: true,
          read: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: authResult.user!.id,
          read: false
        }
      })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}