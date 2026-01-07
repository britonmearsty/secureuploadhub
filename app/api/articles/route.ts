import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {
      status: 'PUBLISHED'
    }
    
    if (featured === 'true') {
      where.isFeatured = true
    }
    
    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category
          }
        }
      }
    }
    
    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag
          }
        }
      }
    }

    const articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        createdAt: true,
        isFeatured: true,
        author: {
          select: {
            name: true,
            email: true
          }
        },
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true
              }
            }
          }
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    const total = await prisma.article.count({ where })

    return NextResponse.json({
      articles,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}