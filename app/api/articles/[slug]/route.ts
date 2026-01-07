import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params

  try {
    const article = await prisma.article.findUnique({
      where: { 
        slug,
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
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