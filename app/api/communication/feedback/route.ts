import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { FeedbackCategory } from '@/lib/communication-types'

// GET /api/communication/feedback - Get user feedback
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
    const category = searchParams.get('category') as FeedbackCategory | null
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: authResult.user!.id
    }
    
    if (category) {
      where.category = category
    }

    // Fetch feedback
    const [feedback, totalCount] = await Promise.all([
      prisma.feedback.findMany({
        where,
        select: {
          id: true,
          rating: true,
          comment: true,
          category: true,
          status: true,
          adminNotes: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.feedback.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: feedback,
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
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

// POST /api/communication/feedback - Submit feedback
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
    const { rating, comment, category } = body

    // Validate required fields
    if (!rating || !category) {
      return NextResponse.json(
        { error: 'Rating and category are required' },
        { status: 400 }
      )
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories: FeedbackCategory[] = ['GENERAL', 'BUG_REPORT', 'FEATURE_REQUEST', 'UI_UX', 'PERFORMANCE', 'BILLING']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId: authResult.user!.id,
        rating,
        comment: comment?.trim() || null,
        category,
        status: 'PENDING'
      },
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authResult.user!.id,
        action: 'feedback_submitted',
        resource: 'feedback',
        resourceId: feedback.id,
        details: {
          rating: feedback.rating,
          category: feedback.category,
          hasComment: !!feedback.comment
        }
      }
    })

    // TODO: Send notification to admins
    // TODO: Send confirmation email to user

    return NextResponse.json({ data: feedback }, { status: 201 })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}