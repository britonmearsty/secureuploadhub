import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { FeedbackStatus } from '@/lib/communication-types'

// PUT /api/admin/communication/feedback/[id] - Update feedback (admin)
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

    const { id: feedbackId } = await params
    const body = await request.json()

    // Get current feedback
    const currentFeedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
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

    if (!currentFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (body.status && ['PENDING', 'REVIEWED', 'IMPLEMENTED', 'REJECTED'].includes(body.status)) {
      updateData.status = body.status
    }
    
    if (body.adminNotes !== undefined) {
      updateData.adminNotes = body.adminNotes?.trim() || null
    }

    // Update feedback
    const updatedFeedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authResult.user!.id,
        action: 'admin_feedback_updated',
        resource: 'feedback',
        resourceId: feedbackId,
        details: {
          changes: updateData,
          previousStatus: currentFeedback.status,
          newStatus: updatedFeedback.status,
          feedbackUserId: currentFeedback.userId
        }
      }
    })

    // TODO: Send notification to user if status changed
    // TODO: Send email notification

    return NextResponse.json({ data: updatedFeedback })
  } catch (error) {
    console.error('Error updating admin feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}