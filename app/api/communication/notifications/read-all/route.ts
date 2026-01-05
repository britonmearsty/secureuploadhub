import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'

// PUT /api/communication/notifications/read-all - Mark all notifications as read
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateCommunication()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      )
    }

    // Mark all user notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        userId: authResult.user!.id,
        read: false
      },
      data: {
        read: true
      }
    })

    return NextResponse.json({ 
      message: 'All notifications marked as read',
      count: result.count 
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}