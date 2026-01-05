import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  endpoint: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { period, endpoint } = querySchema.parse({
      period: searchParams.get('period'),
      endpoint: searchParams.get('endpoint'),
    });

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

    const whereClause = {
      recordedAt: { gte: startDate },
      ...(endpoint && endpoint !== null && { endpoint }),
    };

    const [
      performanceStats,
      responseTimeDistribution,
      statusCodeDistribution,
      endpointPerformance,
      errorAnalysis,
      performanceTrends,
    ] = await Promise.all([
      // Basic performance statistics
      prisma.performanceMetric.aggregate({
        _count: true,
        _avg: { responseTime: true },
        _min: { responseTime: true },
        _max: { responseTime: true },
        where: whereClause,
      }),
      
      // Response time distribution
      endpoint && endpoint !== null ? 
        prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN "responseTime" < 100 THEN 'Under 100ms'
              WHEN "responseTime" < 500 THEN '100-500ms'
              WHEN "responseTime" < 1000 THEN '500ms-1s'
              WHEN "responseTime" < 5000 THEN '1-5s'
              ELSE 'Over 5s'
            END as response_range,
            COUNT(*) as count,
            AVG("responseTime") as avg_response_time
          FROM "PerformanceMetric"
          WHERE "recordedAt" >= ${startDate}
          AND "endpoint" = ${endpoint}
          GROUP BY response_range
          ORDER BY 
            CASE response_range
              WHEN 'Under 100ms' THEN 1
              WHEN '100-500ms' THEN 2
              WHEN '500ms-1s' THEN 3
              WHEN '1-5s' THEN 4
              WHEN 'Over 5s' THEN 5
            END
        ` :
        prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN "responseTime" < 100 THEN 'Under 100ms'
              WHEN "responseTime" < 500 THEN '100-500ms'
              WHEN "responseTime" < 1000 THEN '500ms-1s'
              WHEN "responseTime" < 5000 THEN '1-5s'
              ELSE 'Over 5s'
            END as response_range,
            COUNT(*) as count,
            AVG("responseTime") as avg_response_time
          FROM "PerformanceMetric"
          WHERE "recordedAt" >= ${startDate}
          GROUP BY response_range
          ORDER BY 
            CASE response_range
              WHEN 'Under 100ms' THEN 1
              WHEN '100-500ms' THEN 2
              WHEN '500ms-1s' THEN 3
              WHEN '1-5s' THEN 4
              WHEN 'Over 5s' THEN 5
            END
        `,
      
      // Status code distribution
      prisma.performanceMetric.groupBy({
        by: ['statusCode'],
        _count: true,
        _avg: { responseTime: true },
        where: whereClause,
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
      
      // Performance by endpoint
      prisma.performanceMetric.groupBy({
        by: ['endpoint', 'method'],
        _count: true,
        _avg: { responseTime: true },
        _min: { responseTime: true },
        _max: { responseTime: true },
        where: whereClause,
        orderBy: {
          _avg: {
            responseTime: 'desc',
          },
        },
        take: 20,
      }),
      
      // Error analysis
      prisma.performanceMetric.findMany({
        where: {
          ...whereClause,
          statusCode: { gte: 400 },
        },
        select: {
          endpoint: true,
          method: true,
          statusCode: true,
          errorMessage: true,
          responseTime: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
      
      // Performance trends over time
      endpoint && endpoint !== null ?
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('hour', "recordedAt") as hour,
            COUNT(*) as request_count,
            AVG("responseTime") as avg_response_time,
            COUNT(CASE WHEN "statusCode" >= 400 THEN 1 END) as error_count
          FROM "PerformanceMetric"
          WHERE "recordedAt" >= ${startDate}
          AND "endpoint" = ${endpoint}
          GROUP BY DATE_TRUNC('hour', "recordedAt")
          ORDER BY hour ASC
        ` :
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('hour', "recordedAt") as hour,
            COUNT(*) as request_count,
            AVG("responseTime") as avg_response_time,
            COUNT(CASE WHEN "statusCode" >= 400 THEN 1 END) as error_count
          FROM "PerformanceMetric"
          WHERE "recordedAt" >= ${startDate}
          GROUP BY DATE_TRUNC('hour', "recordedAt")
          ORDER BY hour ASC
        `,
    ]);

    // Calculate error rate
    const totalRequests = performanceStats._count;
    const errorCount = await prisma.performanceMetric.count({
      where: {
        ...whereClause,
        statusCode: { gte: 400 },
      },
    });
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
        endpoint: endpoint || 'all',
      },
      distribution: {
        responseTime: (responseTimeDistribution as any[]).map((item: any) => ({
          range: item.response_range,
          count: Number(item.count),
          averageTime: Math.round(Number(item.avg_response_time)),
        })),
        statusCodes: statusCodeDistribution.map(item => ({
          statusCode: item.statusCode,
          count: item._count,
          averageTime: Math.round(item._avg.responseTime || 0),
          percentage: Math.round((item._count / totalRequests) * 100),
        })),
      },
      endpoints: endpointPerformance.map(item => ({
        endpoint: item.endpoint,
        method: item.method,
        requestCount: item._count,
        averageTime: Math.round(item._avg.responseTime || 0),
        minTime: item._min.responseTime || 0,
        maxTime: item._max.responseTime || 0,
      })),
      errors: errorAnalysis.map(error => ({
        endpoint: error.endpoint,
        method: error.method,
        statusCode: error.statusCode,
        errorMessage: error.errorMessage,
        responseTime: error.responseTime,
        recordedAt: error.recordedAt,
      })),
      trends: (performanceTrends as any[]).map((trend: any) => ({
        hour: trend.hour,
        requestCount: Number(trend.request_count),
        averageResponseTime: Math.round(Number(trend.avg_response_time)),
        errorCount: Number(trend.error_count),
        errorRate: Number(trend.request_count) > 0 ? 
          Math.round((Number(trend.error_count) / Number(trend.request_count)) * 100) : 0,
      })),
      generatedAt: new Date().toISOString(),
    };

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

// POST endpoint to record performance metrics
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const metricSchema = z.object({
      endpoint: z.string(),
      method: z.string(),
      responseTime: z.number(),
      statusCode: z.number(),
      errorMessage: z.string().optional(),
      userId: z.string().optional(),
      ipAddress: z.string().optional(),
    });

    const metric = metricSchema.parse(body);

    await prisma.performanceMetric.create({
      data: {
        ...metric,
        userId: metric.userId || session.user.id,
        ipAddress: metric.ipAddress || request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 'unknown',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Performance metric recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record performance metric' },
      { status: 500 }
    );
  }
}