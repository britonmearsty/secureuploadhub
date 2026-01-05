import { NextRequest, NextResponse } from 'next/server'
import { authenticateCommunication } from '@/lib/communication-auth'
import prisma from '@/lib/prisma'

// GET /api/admin/communication/analytics - Get communication analytics (admin only)
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
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get basic statistics
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory,
      recentTickets,
      totalFeedback,
      avgRating,
      feedbackByRating,
      feedbackByCategory
    ] = await Promise.all([
      // Total tickets
      prisma.ticket.count(),
      
      // Open tickets
      prisma.ticket.count({
        where: { status: 'OPEN' }
      }),
      
      // Resolved tickets in period
      prisma.ticket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          updatedAt: { gte: startDate }
        }
      }),
      
      // Tickets by status
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      
      // Tickets by priority
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: { id: true }
      }),
      
      // Tickets by category
      prisma.ticket.groupBy({
        by: ['category'],
        _count: { id: true }
      }),
      
      // Recent tickets (last 7 days)
      prisma.ticket.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total feedback
      prisma.feedback.count(),
      
      // Average rating
      prisma.feedback.aggregate({
        _avg: { rating: true }
      }),
      
      // Feedback by rating
      prisma.feedback.groupBy({
        by: ['rating'],
        _count: { id: true }
      }),
      
      // Feedback by category
      prisma.feedback.groupBy({
        by: ['category'],
        _count: { id: true }
      })
    ])

    const analytics = {
      overview: {
        totalTickets,
        openTickets,
        resolvedTickets,
        recentTickets,
        avgResponseTimeHours: 0, // TODO: Implement response time calculation
        totalFeedback,
        avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 100) / 100 : 0
      },
      tickets: {
        byStatus: ticketsByStatus.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item._count.id
          return acc
        }, {}),
        byPriority: ticketsByPriority.reduce((acc: Record<string, number>, item: any) => {
          acc[item.priority] = item._count.id
          return acc
        }, {}),
        byCategory: ticketsByCategory.reduce((acc: Record<string, number>, item: any) => {
          acc[item.category] = item._count.id
          return acc
        }, {}),
        dailyTrend: [] // TODO: Implement daily trend
      },
      feedback: {
        byRating: feedbackByRating.reduce((acc: Record<number, number>, item: any) => {
          acc[item.rating] = item._count.id
          return acc
        }, {}),
        byCategory: feedbackByCategory.reduce((acc: Record<string, number>, item: any) => {
          acc[item.category] = item._count.id
          return acc
        }, {}),
        dailyTrend: [] // TODO: Implement daily trend
      },
      period: {
        days,
        startDate,
        endDate: new Date()
      }
    }

    return NextResponse.json({ data: analytics })
  } catch (error) {
    console.error('Error fetching communication analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}