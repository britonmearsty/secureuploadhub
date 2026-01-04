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

    // Initialize default response with empty arrays
    let uploadAnalytics = {
      summary: {
        totalUploads: 0,
        totalSize: 0,
        totalSizeGB: 0,
        averageSize: 0,
        period,
        groupBy,
      },
      trends: {
        uploads: [] as Array<{
          period: string;
          uploadCount: number;
          totalSize: number;
          averageSize: number;
        }>,
      },
      distribution: {
        fileTypes: [] as Array<{
          mimeType: string;
          count: number;
          totalSize: number;
          percentage: number;
        }>,
        fileSizes: [] as Array<{
          range: string;
          count: number;
          totalSize: number;
        }>,
        status: [] as Array<{
          status: string;
          count: number;
          percentage: number;
        }>,
      },
      topPortals: [] as Array<{
        id: string;
        name: string;
        ownerName: string;
        ownerEmail: string;
        uploadCount: number;
        createdAt: string;
      }>,
      insights: {
        averageFileSize: 0,
        peakHours: [] as Array<{
          hour: number;
          uploadCount: number;
        }>,
      },
      generatedAt: new Date().toISOString(),
    };

    // Generate date range for trends
    const generateDateRange = (start: Date, end: Date, groupBy: string) => {
      const dates: Date[] = [];
      const current = new Date(start);
      const endDate = new Date(end);
      
      if (groupBy === 'day') {
        current.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      } else if (groupBy === 'week') {
        current.setDate(current.getDate() - current.getDay());
        current.setHours(0, 0, 0, 0);
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 7);
        }
      } else { // month
        current.setDate(1);
        current.setHours(0, 0, 0, 0);
        while (current <= endDate) {
          dates.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
        }
      }
      return dates;
    };

    const dateRange = generateDateRange(startDate, now, groupBy);
    
    // Initialize trends with empty data
    uploadAnalytics.trends.uploads = dateRange.map(date => ({
      period: date.toISOString().split('T')[0],
      uploadCount: 0,
      totalSize: 0,
      averageSize: 0
    }));

    try {
      // Get basic upload statistics
      const uploadStats = await prisma.fileUpload.aggregate({
        _count: true,
        _sum: { fileSize: true },
        _avg: { fileSize: true },
        where: {
          createdAt: { gte: startDate },
        },
      });

      uploadAnalytics.summary.totalUploads = uploadStats._count;
      uploadAnalytics.summary.totalSize = uploadStats._sum.fileSize || 0;
      uploadAnalytics.summary.totalSizeGB = Math.round(((uploadStats._sum.fileSize || 0) / (1024 * 1024 * 1024)) * 100) / 100;
      uploadAnalytics.summary.averageSize = Math.round((uploadStats._avg.fileSize || 0) / 1024); // in KB

      // Get upload trends
      try {
        let uploadTrends;
        if (groupBy === 'day') {
          uploadTrends = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('day', "createdAt") as period,
              COUNT(*)::int as upload_count,
              COALESCE(SUM("fileSize"), 0)::bigint as total_size,
              COALESCE(AVG("fileSize"), 0)::bigint as avg_size
            FROM "FileUpload"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY period ASC
          `;
        } else if (groupBy === 'week') {
          uploadTrends = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('week', "createdAt") as period,
              COUNT(*)::int as upload_count,
              COALESCE(SUM("fileSize"), 0)::bigint as total_size,
              COALESCE(AVG("fileSize"), 0)::bigint as avg_size
            FROM "FileUpload"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('week', "createdAt")
            ORDER BY period ASC
          `;
        } else {
          uploadTrends = await prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('month', "createdAt") as period,
              COUNT(*)::int as upload_count,
              COALESCE(SUM("fileSize"), 0)::bigint as total_size,
              COALESCE(AVG("fileSize"), 0)::bigint as avg_size
            FROM "FileUpload"
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY period ASC
          `;
        }

        uploadAnalytics.trends.uploads = (uploadTrends as any[]).map((trend: any) => {
          // Format period date as ISO string if it's a Date object
          let periodValue = trend.period;
          if (trend.period instanceof Date) {
            periodValue = trend.period.toISOString().split('T')[0];
          } else if (typeof trend.period === 'string' && trend.period.includes('T')) {
            periodValue = trend.period.split('T')[0];
          }
          
          return {
            period: periodValue,
            uploadCount: Number(trend.upload_count),
            totalSize: Number(trend.total_size),
            averageSize: Math.round(Number(trend.avg_size) / 1024), // in KB
          };
        });
      } catch (trendsError) {
        console.log('Upload trends not available:', trendsError);
      }

      // Get file type distribution
      try {
        const fileTypeDistribution = await prisma.fileUpload.groupBy({
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
        });

        uploadAnalytics.distribution.fileTypes = fileTypeDistribution.map(item => ({
          mimeType: item.mimeType,
          count: item._count,
          totalSize: item._sum.fileSize || 0,
          percentage: uploadAnalytics.summary.totalUploads > 0 ? 
            Math.round((item._count / uploadAnalytics.summary.totalUploads) * 100) : 0,
        }));
      } catch (fileTypesError) {
        console.log('File type distribution not available:', fileTypesError);
      }

      // Get file size distribution
      try {
        const sizeDistribution = await prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN "fileSize" < 1048576 THEN 'Under 1MB'
              WHEN "fileSize" < 10485760 THEN '1-10MB'
              WHEN "fileSize" < 104857600 THEN '10-100MB'
              WHEN "fileSize" < 1073741824 THEN '100MB-1GB'
              ELSE 'Over 1GB'
            END as size_range,
            COUNT(*)::int as count,
            COALESCE(SUM("fileSize"), 0)::bigint as total_size
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
        `;

        uploadAnalytics.distribution.fileSizes = (sizeDistribution as any[]).map((item: any) => ({
          range: item.size_range,
          count: Number(item.count),
          totalSize: Number(item.total_size),
        }));
      } catch (sizeDistError) {
        console.log('File size distribution not available:', sizeDistError);
      }

      // Get upload status distribution
      try {
        const statusDistribution = await prisma.fileUpload.groupBy({
          by: ['status'],
          _count: true,
          where: {
            createdAt: { gte: startDate },
          },
        });

        uploadAnalytics.distribution.status = statusDistribution.map(item => ({
          status: item.status,
          count: item._count,
          percentage: uploadAnalytics.summary.totalUploads > 0 ? 
            Math.round((item._count / uploadAnalytics.summary.totalUploads) * 100) : 0,
        }));
      } catch (statusError) {
        console.log('Status distribution not available:', statusError);
      }

      // Get top portals by upload count
      try {
        const topPortalsByUploads = await prisma.uploadPortal.findMany({
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
        });

        uploadAnalytics.topPortals = topPortalsByUploads
          .filter(portal => portal._count.uploads > 0)
          .map(portal => ({
            id: portal.id,
            name: portal.name,
            ownerName: portal.user.name || 'Unknown',
            ownerEmail: portal.user.email,
            uploadCount: portal._count.uploads,
            createdAt: portal.createdAt.toISOString(),
          }));
      } catch (topPortalsError) {
        console.log('Top portals not available:', topPortalsError);
      }

      // Get insights
      try {
        const averageFileSize = await prisma.$queryRaw`
          SELECT COALESCE(AVG("fileSize"), 0)::bigint as avg_size
          FROM "FileUpload"
          WHERE "createdAt" >= ${startDate}
        `;
        const avgSize = (averageFileSize as any[])[0];
        uploadAnalytics.insights.averageFileSize = avgSize ? 
          Math.round(Number(avgSize.avg_size) / 1024) : 0; // in KB
      } catch (avgSizeError) {
        console.log('Average file size not available:', avgSizeError);
      }

      try {
        const peakHours = await prisma.$queryRaw`
          SELECT 
            EXTRACT(HOUR FROM "createdAt")::int as hour,
            COUNT(*)::int as upload_count
          FROM "FileUpload"
          WHERE "createdAt" >= ${startDate}
          GROUP BY EXTRACT(HOUR FROM "createdAt")
          ORDER BY upload_count DESC
          LIMIT 5
        `;
        uploadAnalytics.insights.peakHours = (peakHours as any[]).map((hour: any) => ({
          hour: Number(hour.hour),
          uploadCount: Number(hour.upload_count),
        }));
      } catch (peakHoursError) {
        console.log('Peak hours not available:', peakHoursError);
      }

    } catch (error) {
      console.error('Error collecting upload analytics:', error);
    }

    return NextResponse.json(uploadAnalytics);
  } catch (error) {
    console.error('Upload analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}