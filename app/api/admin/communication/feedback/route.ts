import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'
import { FeedbackCategory, FeedbackStatus } from '@/lib/communication-types'

// GET /api/admin/communication/feedback - List all feedback (admin only)
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
    const category = searchParams.get('category') as FeedbackCategory | null
    const status = searchParams.get('status') as FeedbackStatus | null
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : null
    const search = searchParams.get('search') || null
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (category) {
      where.category = category
    }
    
    if (status) {
      where.status = status
    }
    
    if (rating) {
      where.rating = rating
    }
    
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { adminNotes: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Fetch feedback with user data
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
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
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

    // Get summary stats
    const [statusStats, categoryStats, ratingStats] = await Promise.all([
      prisma.feedback.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.feedback.groupBy({
        by: ['category'],
        _count: { id: true }
      }),
      prisma.feedback.groupBy({
        by: ['rating'],
        _count: { id: true },
        _avg: { rating: true }
      })
    ])

    const stats = {
      total: totalCount,
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id
        return acc
      }, {} as Record<string, number>),
      byCategory: categoryStats.reduce((acc, stat) => {
        acc[stat.category] = stat._count.id
        return acc
      }, {} as Record<string, number>),
      byRating: ratingStats.reduce((acc, stat) => {
        acc[stat.rating] = stat._count.id
        return acc
      }, {} as Record<number, number>),
      averageRating: ratingStats.length > 0 
        ? ratingStats.reduce((sum, stat) => sum + (stat._avg.rating || 0), 0) / ratingStats.length
        : 0
    }

    return NextResponse.json({
      data: feedback,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching admin feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}