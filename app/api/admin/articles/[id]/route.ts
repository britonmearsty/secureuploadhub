import { NextRequest, NextResponse } from 'next/server'
import { authenticateAPI } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await authenticateAPI('admin')
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }

  try {
    const article = await prisma.article.findUnique({
      where: { id },
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

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
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

    // Check if slug already exists (excluding current article)
    const existingArticle = await prisma.article.findFirst({
      where: { 
        slug,
        NOT: { id }
      }
    })

    if (existingArticle) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }

    // Get current article to check if it was featured
    const currentArticle = await prisma.article.findUnique({
      where: { id }
    })

    if (!currentArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Handle featured article limit (max 2)
    if (isFeatured && !currentArticle.isFeatured) {
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

    // Update article with transaction to handle categories and tags
    const article = await prisma.$transaction(async (tx) => {
      // Delete existing category and tag relationships
      await tx.articleCategory.deleteMany({
        where: { articleId: id }
      })
      
      await tx.articleTag.deleteMany({
        where: { articleId: id }
      })

      // Update the article
      return await tx.article.update({
        where: { id },
        data: {
          title,
          slug,
          excerpt,
          content,
          status,
          isFeatured,
          featuredAt: isFeatured && !currentArticle.isFeatured ? new Date() : 
                     !isFeatured && currentArticle.isFeatured ? null : 
                     currentArticle.featuredAt,
          publishedAt: status === 'PUBLISHED' && currentArticle.status !== 'PUBLISHED' ? new Date() : 
                      status !== 'PUBLISHED' ? null : 
                      currentArticle.publishedAt,
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
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await authenticateAPI('admin')
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }

  try {
    const article = await prisma.article.findUnique({
      where: { id }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    await prisma.article.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}