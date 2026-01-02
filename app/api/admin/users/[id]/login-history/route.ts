import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get user's login history from sessions
    const [sessions, totalCount] = await Promise.all([
      prisma.session.findMany({
        where: { userId: id },
        select: {
          sessionToken: true,
          createdAt: true,
          expires: true,
          // Note: You might want to add these fields to track more login details
          // ipAddress: true,
          // userAgent: true,
          // location: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      prisma.session.count({
        where: { userId: id }
      })
    ]);

    // Get user's OAuth accounts for login method information
    const accounts = await prisma.account.findMany({
      where: { userId: id },
      select: {
        provider: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Calculate login statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      recentLogins30Days,
      recentLogins7Days,
      activeSessions
    ] = await Promise.all([
      prisma.session.count({
        where: {
          userId: id,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),

      prisma.session.count({
        where: {
          userId: id,
          createdAt: { gte: sevenDaysAgo }
        }
      }),

      prisma.session.count({
        where: {
          userId: id,
          expires: { gt: now }
        }
      })
    ]);

    const loginHistory = {
      sessions: sessions.map(session => ({
        id: session.sessionToken, // Use sessionToken as ID
        loginTime: session.createdAt,
        expiresAt: session.expires,
        isActive: session.expires > now,
        // Add more details when available
        // ipAddress: session.ipAddress,
        // userAgent: session.userAgent,
        // location: session.location
      })),
      accounts,
      statistics: {
        totalLogins: totalCount,
        recentLogins30Days,
        recentLogins7Days,
        activeSessions,
        lastLogin: sessions[0]?.createdAt || null
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };

    return NextResponse.json({ loginHistory });

  } catch (error) {
    console.error('Error fetching login history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch login history' },
      { status: 500 }
    );
  }
}