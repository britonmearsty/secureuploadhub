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

      // Get upload trends using Prisma groupBy
      try {
        const uploadData = await prisma.fileUpload.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: startDate }
          },
          _count: {
            id: true
          },
          _sum: {
            fileSize: true
          },
          _avg: {
            fileSize: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Process the data based on groupBy parameter
        const trendsMap = new Map<string, { uploadCount: number; totalSize: number; avgSize: number; count: number }>();
        
        uploadData.forEach(item => {
          let periodKey: string;
          const date = new Date(item.createdAt);
          
          if (groupBy === 'day') {
            periodKey = date.toISOString().split('T')[0];
          } else if (groupBy === 'week') {
            // Get start of week (Sunday)
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            periodKey = startOfWeek.toISOString().split('T')[0];
          } else { // month
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          }
          
          const existing = trendsMap.get(periodKey) || { uploadCount: 0, totalSize: 0, avgSize: 0, count: 0 };
          existing.uploadCount += item._count.id;
          existing.totalSize += Number(item._sum.fileSize) || 0;
          existing.avgSize += Number(item._avg.fileSize) || 0;
          existing.count += 1;
          trendsMap.set(periodKey, existing);
        });

        // Convert to array and calculate final averages
        uploadAnalytics.trends.uploads = Array.from(trendsMap.entries()).map(([period, data]) => ({
          period,
          uploadCount: data.uploadCount,
          totalSize: data.totalSize,
          averageSize: data.count > 0 ? Math.round((data.avgSize / data.count) / 1024) : 0, // in KB
        })).sort((a, b) => a.period.localeCompare(b.period));
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

      // Get file size distribution using application logic
      try {
        const allUploads = await prisma.fileUpload.findMany({
          where: {
            createdAt: { gte: startDate }
          },
          select: {
            fileSize: true
          }
        });

        // Categorize file sizes in application logic
        const sizeCategories = {
          'Under 1MB': { count: 0, totalSize: 0 },
          '1-10MB': { count: 0, totalSize: 0 },
          '10-100MB': { count: 0, totalSize: 0 },
          '100MB-1GB': { count: 0, totalSize: 0 },
          'Over 1GB': { count: 0, totalSize: 0 }
        };

        allUploads.forEach(upload => {
          const size = Number(upload.fileSize) || 0;
          let category: keyof typeof sizeCategories;
          
          if (size < 1048576) category = 'Under 1MB';
          else if (size < 10485760) category = '1-10MB';
          else if (size < 104857600) category = '10-100MB';
          else if (size < 1073741824) category = '100MB-1GB';
          else category = 'Over 1GB';
          
          sizeCategories[category].count++;
          sizeCategories[category].totalSize += size;
        });

        uploadAnalytics.distribution.fileSizes = Object.entries(sizeCategories).map(([range, data]) => ({
          range,
          count: data.count,
          totalSize: data.totalSize,
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

      // Get insights using Prisma aggregate
      try {
        const avgSizeResult = await prisma.fileUpload.aggregate({
          where: {
            createdAt: { gte: startDate }
          },
          _avg: {
            fileSize: true
          }
        });
        
        uploadAnalytics.insights.averageFileSize = avgSizeResult._avg.fileSize ? 
          Math.round(Number(avgSizeResult._avg.fileSize) / 1024) : 0; // in KB
      } catch (avgSizeError) {
        console.log('Average file size not available:', avgSizeError);
      }

      try {
        // Get peak hours using application logic
        const allUploads = await prisma.fileUpload.findMany({
          where: {
            createdAt: { gte: startDate }
          },
          select: {
            createdAt: true
          }
        });

        // Count uploads by hour
        const hourCounts = new Map<number, number>();
        allUploads.forEach(upload => {
          const hour = upload.createdAt.getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        });

        // Convert to array and sort by count
        uploadAnalytics.insights.peakHours = Array.from(hourCounts.entries())
          .map(([hour, uploadCount]) => ({ hour, uploadCount }))
          .sort((a, b) => b.uploadCount - a.uploadCount)
          .slice(0, 5);
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