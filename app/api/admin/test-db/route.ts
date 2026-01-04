import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    // Check authentication first
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Authentication successful');
    
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Test basic queries
    console.log('Testing basic queries...');
    
    const userCount = await prisma.user.count();
    console.log('✅ User count:', userCount);
    
    const portalCount = await prisma.uploadPortal.count();
    console.log('✅ Portal count:', portalCount);
    
    const uploadCount = await prisma.fileUpload.count();
    console.log('✅ Upload count:', uploadCount);
    
    // Test analytics data
    console.log('Testing analytics data...');
    const analyticsCount = await prisma.analyticsData.count();
    console.log('✅ Analytics count:', analyticsCount);
    
    const performanceCount = await prisma.performanceMetric.count();
    console.log('✅ Performance metrics count:', performanceCount);
    
    // Test a simple query with date filtering
    console.log('Testing date filtering...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: { gte: startDate }
      }
    });
    console.log('✅ Recent users count:', recentUsers);
    
    // Test a join query
    console.log('Testing join query...');
    const uploadsWithPortals = await prisma.fileUpload.findMany({
      take: 3,
      include: {
        portal: {
          select: { name: true }
        }
      }
    });
    console.log('✅ Uploads with portals:', uploadsWithPortals.length);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection and queries successful',
      data: {
        userCount,
        portalCount,
        uploadCount,
        analyticsCount,
        performanceCount,
        recentUsers,
        uploadsWithPortals: uploadsWithPortals.map(u => ({
          id: u.id,
          fileName: u.fileName,
          portalName: u.portal.name
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    return NextResponse.json({
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}