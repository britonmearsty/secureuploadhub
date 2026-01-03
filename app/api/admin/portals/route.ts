import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication with fresh user data validation
    const user = await getAuthenticatedUser('admin');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    // Fetch portals with owner and stats
    const [portals, totalCount] = await Promise.all([
      prisma.uploadPortal.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          maxFileSize: true,
          allowedFileTypes: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          _count: {
            select: {
              uploads: true,
              chunkedUploads: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      prisma.uploadPortal.count({ where })
    ]);

    // Get upload statistics for each portal
    const portalIds = portals.map(p => p.id);
    const uploadStats = await prisma.fileUpload.groupBy({
      by: ['portalId', 'status'],
      where: {
        portalId: { in: portalIds }
      },
      _count: {
        status: true
      },
      _sum: {
        fileSize: true
      }
    });

    // Organize stats by portal
    const statsMap = uploadStats.reduce((acc, stat) => {
      if (!acc[stat.portalId]) {
        acc[stat.portalId] = {
          totalUploads: 0,
          completedUploads: 0,
          totalSize: 0
        };
      }
      
      acc[stat.portalId].totalUploads += stat._count.status;
      if (stat.status === 'completed') {
        acc[stat.portalId].completedUploads += stat._count.status;
        acc[stat.portalId].totalSize += stat._sum.fileSize || 0;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Add stats to portals
    const portalsWithStats = portals.map(portal => ({
      ...portal,
      stats: statsMap[portal.id] || {
        totalUploads: 0,
        completedUploads: 0,
        totalSize: 0
      }
    }));

    return NextResponse.json({
      portals: portalsWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    // If error is already a NextResponse (from authentication), return it
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error('Error fetching portals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portals' },
      { status: 500 }
    );
  }
}