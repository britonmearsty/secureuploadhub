import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'

// PUT /api/communication/notifications/[id]/read - Mark notification as read
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

    const { id: notificationId } = await params

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: authResult.user!.id
      }
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    })

    return NextResponse.json({ data: updatedNotification })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}