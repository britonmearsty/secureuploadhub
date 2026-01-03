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
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role !== 'all') {
      where.role = role;
    }

    if (status !== 'all') {
      where.status = status;
    }

    // Fetch users with related data
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              uploadPortals: true,
              fileUploads: true,
              subscriptions: true,
              sessions: true
            }
          },
          subscriptions: {
            select: {
              id: true,
              status: true,
              plan: {
                select: {
                  name: true,
                  price: true,
                  currency: true
                }
              }
            },
            where: {
              status: 'active'
            },
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          },
          sessions: {
            select: {
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),

      prisma.user.count({ where })
    ]);

    // Add last login information
    const usersWithLastLogin = users.map(user => ({
      ...user,
      lastLogin: user.sessions[0]?.createdAt || null,
      sessions: undefined // Remove sessions from response
    }));

    return NextResponse.json({
      users: usersWithLastLogin,
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
    
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}