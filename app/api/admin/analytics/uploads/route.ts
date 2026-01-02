import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { period, groupBy } = querySchema.parse({
      period: searchParams.get('period'),
      groupBy: searchParams.get('groupBy'),
    });

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const [
      uploadStats,
      uploadTrends,
      fileTypeDistribution,
      sizeDistribution,
      statusDistribution,
      topPortalsByUploads,
      averageFileSize,
      peakHours,
    ] = await Promise.all([
      // Basic upload statistics
      prisma.fileUpload.aggregate({
        _count: true,
        _sum: { fileSize: true },
        _avg: { fileSize: true },
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // Upload trends over time
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${groupBy}, "createdAt") as period,
          COUNT(*) as upload_count,
          SUM("fileSize") as total_size,
          AVG("fileSize") as avg_size
        FROM "FileUpload"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC(${groupBy}, "createdAt")
        ORDER BY period ASC
      `,
      
      // File type distribution
      prisma.fileUpload.groupBy({
        by: ['mimeType'],
        _count: true,
        _sum: { fileSize: true },
        where: {
          createdAt: { gte: startDate },
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      }),
      
      // File size distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN "fileSize" < 1048576 THEN 'Under 1MB'
            WHEN "fileSize" < 10485760 THEN '1-10MB'
            WHEN "fileSize" < 104857600 THEN '10-100MB'
            WHEN "fileSize" < 1073741824 THEN '100MB-1GB'
            ELSE 'Over 1GB'
          END as size_range,
          COUNT(*) as count,
          SUM("fileSize") as total_size
        FROM "FileUpload"
        WHERE "createdAt" >= ${startDate}
        GROUP BY size_range
        ORDER BY 
          CASE size_range
            WHEN 'Under 1MB' THEN 1
            WHEN '1-10MB' THEN 2
            WHEN '10-100MB' THEN 3
            WHEN '100MB-1GB' THEN 4
            WHEN 'Over 1GB' THEN 5
          END
      `,
      
      // Upload status distribution
      prisma.fileUpload.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // Top portals by upload count
      prisma.uploadPortal.findMany({
        take: 10,
        include: {
          _count: {
            select: {
              uploads: {
                where: {
                  createdAt: { gte: startDate },
                },
              },
            },
          },
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: {
          uploads: {
            _count: 'desc',
          },
        },
      }),
      
      // Average file size over time
      prisma.$queryRaw`
        SELECT AVG("fileSize") as avg_size
        FROM "FileUpload"
        WHERE "createdAt" >= ${startDate}
      `,
      
      // Peak upload hours
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "createdAt") as hour,
          COUNT(*) as upload_count
        FROM "FileUpload"
        WHERE "createdAt" >= ${startDate}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY upload_count DESC
        LIMIT 5
      `,
    ]);

    // Format the response
    const uploadAnalytics = {
      summary: {
        totalUploads: uploadStats._count,
        totalSize: uploadStats._sum.fileSize || 0,
        totalSizeGB: Math.round(((uploadStats._sum.fileSize || 0) / (1024 * 1024 * 1024)) * 100) / 100,
        averageSize: Math.round((uploadStats._avg.fileSize || 0) / 1024), // in KB
        period,
        groupBy,
      },
      trends: {
        uploads: (uploadTrends as any[]).map((trend: any) => ({
          period: trend.period,
          uploadCount: Number(trend.upload_count),
          totalSize: Number(trend.total_size),
          averageSize: Math.round(Number(trend.avg_size) / 1024), // in KB
        })),
      },
      distribution: {
        fileTypes: fileTypeDistribution.map(item => ({
          mimeType: item.mimeType,
          count: item._count,
          totalSize: item._sum.fileSize || 0,
          percentage: Math.round((item._count / uploadStats._count) * 100),
        })),
        fileSizes: (sizeDistribution as any[]).map((item: any) => ({
          range: item.size_range,
          count: Number(item.count),
          totalSize: Number(item.total_size),
        })),
        status: statusDistribution.map(item => ({
          status: item.status,
          count: item._count,
          percentage: Math.round((item._count / uploadStats._count) * 100),
        })),
      },
      topPortals: topPortalsByUploads
        .filter(portal => portal._count.uploads > 0)
        .map(portal => ({
          id: portal.id,
          name: portal.name,
          ownerName: portal.user.name,
          ownerEmail: portal.user.email,
          uploadCount: portal._count.uploads,
          createdAt: portal.createdAt,
        })),
      insights: {
        averageFileSize: (averageFileSize as any[])[0]?.avg_size ? 
          Math.round(Number((averageFileSize as any[])[0].avg_size) / 1024) : 0, // in KB
        peakHours: (peakHours as any[]).map((hour: any) => ({
          hour: Number(hour.hour),
          uploadCount: Number(hour.upload_count),
        })),
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(uploadAnalytics);
  } catch (error) {
    console.error('Upload analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload analytics' },
      { status: 500 }
    );
  }
}