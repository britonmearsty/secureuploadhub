import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Testing performance metrics table...');

    // Test 1: Check if we can count performance metrics
    console.log('Test 1: Counting performance metrics...');
    const totalMetrics = await prisma.performanceMetric.count();
    console.log('✅ Total performance metrics:', totalMetrics);

    // Test 2: Try to get a few sample records
    console.log('Test 2: Getting sample records...');
    const sampleMetrics = await prisma.performanceMetric.findMany({
      take: 3,
      orderBy: { recordedAt: 'desc' }
    });
    console.log('✅ Sample metrics count:', sampleMetrics.length);

    // Test 3: Try a simple aggregate
    console.log('Test 3: Testing aggregation...');
    const avgResponseTime = await prisma.performanceMetric.aggregate({
      _avg: { responseTime: true },
      _count: true
    });
    console.log('✅ Average response time:', avgResponseTime._avg.responseTime);
    console.log('✅ Count from aggregate:', avgResponseTime._count);

    // Test 4: Try groupBy (this might be where it fails)
    console.log('Test 4: Testing groupBy...');
    try {
      const statusGroups = await prisma.performanceMetric.groupBy({
        by: ['statusCode'],
        _count: true,
        orderBy: { statusCode: 'asc' },
        take: 5
      });
      console.log('✅ Status code groups:', statusGroups.length);
    } catch (groupByError) {
      console.error('❌ GroupBy failed:', groupByError);
      return NextResponse.json({
        success: false,
        error: 'GroupBy operation failed',
        details: groupByError instanceof Error ? groupByError.message : 'Unknown groupBy error',
        tests: {
          totalMetrics,
          sampleCount: sampleMetrics.length,
          avgResponseTime: avgResponseTime._avg.responseTime,
          groupByFailed: true
        }
      });
    }

    // Test 5: Try a date filter
    console.log('Test 5: Testing date filter...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentMetrics = await prisma.performanceMetric.count({
      where: {
        recordedAt: { gte: yesterday }
      }
    });
    console.log('✅ Recent metrics (last 24h):', recentMetrics);

    return NextResponse.json({
      success: true,
      message: 'All performance metrics tests passed',
      tests: {
        totalMetrics,
        sampleCount: sampleMetrics.length,
        avgResponseTime: avgResponseTime._avg.responseTime,
        totalCount: avgResponseTime._count,
        recentMetrics,
        sampleData: sampleMetrics.map(m => ({
          endpoint: m.endpoint,
          method: m.method,
          statusCode: m.statusCode,
          responseTime: m.responseTime,
          recordedAt: m.recordedAt
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Performance test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}