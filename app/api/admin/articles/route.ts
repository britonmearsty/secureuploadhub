import { NextRequest, NextResponse } from 'next/server'
import { authenticateAPI } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await authenticateAPI('admin')
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (featured === 'true') {
      where.isFeatured = true
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
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

export async function POST(request: NextRequest) {
  const authResult = await authenticateAPI('admin')
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }

  try {
    const body = await request.json()
    const {
      title,
      slug,
      excerpt,
      content,
      status,
      isFeatured,
      categoryIds = [],
      tagIds = []
    } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!slug?.trim()) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug }
    })

    if (existingArticle) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }

    // Handle featured article limit (max 2)
    if (isFeatured) {
      const featuredCount = await prisma.article.count({
        where: { isFeatured: true }
      })

      if (featuredCount >= 2) {
        // Unfeature the oldest featured article
        const oldestFeatured = await prisma.article.findFirst({
          where: { isFeatured: true },
          orderBy: { featuredAt: 'asc' }
        })

        if (oldestFeatured) {
          await prisma.article.update({
            where: { id: oldestFeatured.id },
            data: { 
              isFeatured: false,
              featuredAt: null
            }
          })
        }
      }
    }

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        status,
        isFeatured,
        featuredAt: isFeatured ? new Date() : null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        authorId: authResult.user!.id,
        categories: {
          create: categoryIds.map((categoryId: string) => ({
            categoryId
          }))
        },
        tags: {
          create: tagIds.map((tagId: string) => ({
            tagId
          }))
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}