import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }

    console.log('Fetching performance metrics for period:', period);
    console.log('Date range:', startDate.toISOString(), 'to', now.toISOString());

    // Get basic performance statistics using simple Prisma queries
    const performanceStats = await prisma.performanceMetric.aggregate({
      _count: true,
      _avg: { responseTime: true },
      _min: { responseTime: true },
      _max: { responseTime: true },
      where: {
        recordedAt: { gte: startDate }
      }
    });

    console.log('Performance stats:', performanceStats);

    // Get status code distribution
    const statusCodeDistribution = await prisma.performanceMetric.groupBy({
      by: ['statusCode'],
      _count: true,
      _avg: { responseTime: true },
      where: {
        recordedAt: { gte: startDate }
      },
      orderBy: {
        _count: {
          statusCode: 'desc'
        }
      }
    });

    console.log('Status code distribution:', statusCodeDistribution);

    // Get endpoint performance
    const endpointPerformance = await prisma.performanceMetric.groupBy({
      by: ['endpoint', 'method'],
      _count: true,
      _avg: { responseTime: true },
      _min: { responseTime: true },
      _max: { responseTime: true },
      where: {
        recordedAt: { gte: startDate }
      },
      orderBy: {
        _avg: {
          responseTime: 'desc'
        }
      },
      take: 20
    });

    console.log('Endpoint performance:', endpointPerformance.length, 'endpoints');

    // Get recent errors
    const recentErrors = await prisma.performanceMetric.findMany({
      where: {
        recordedAt: { gte: startDate },
        statusCode: { gte: 400 }
      },
      select: {
        endpoint: true,
        method: true,
        statusCode: true,
        errorMessage: true,
        responseTime: true,
        recordedAt: true
      },
      orderBy: { recordedAt: 'desc' },
      take: 50
    });

    console.log('Recent errors:', recentErrors.length, 'errors');

    // Calculate error rate
    const totalRequests = performanceStats._count;
    const errorCount = recentErrors.length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Format the response
    const performanceAnalytics = {
      summary: {
        totalRequests,
        averageResponseTime: Math.round(performanceStats._avg.responseTime || 0),
        minResponseTime: performanceStats._min.responseTime || 0,
        maxResponseTime: performanceStats._max.responseTime || 0,
        errorRate: Math.round(errorRate * 100) / 100,
        errorCount,
        period,
      },
      distribution: {
        responseTime: [
          { range: 'Under 100ms', count: 0, averageTime: 0 },
          { range: '100-500ms', count: 0, averageTime: 0 },
          { range: '500ms-1s', count: 0, averageTime: 0 },
          { range: '1-5s', count: 0, averageTime: 0 },
          { range: 'Over 5s', count: 0, averageTime: 0 }
        ],
        statusCodes: statusCodeDistribution.map(item => ({
          statusCode: item.statusCode,
          count: item._count,
          averageTime: Math.round(item._avg.responseTime || 0),
          percentage: Math.round((item._count / totalRequests) * 100)
        }))
      },
      endpoints: endpointPerformance.map(item => ({
        endpoint: item.endpoint,
        method: item.method,
        requestCount: item._count,
        averageTime: Math.round(item._avg.responseTime || 0),
        minTime: item._min.responseTime || 0,
        maxTime: item._max.responseTime || 0
      })),
      errors: recentErrors.map(error => ({
        endpoint: error.endpoint,
        method: error.method,
        statusCode: error.statusCode,
        errorMessage: error.errorMessage,
        responseTime: error.responseTime,
        recordedAt: error.recordedAt
      })),
      trends: [], // Simplified for now
      generatedAt: new Date().toISOString()
    };

    console.log('Performance analytics generated successfully');

    return NextResponse.json(performanceAnalytics);
  } catch (error) {
    console.error('Performance analytics error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}