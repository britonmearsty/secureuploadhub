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
    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
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
    const { name, color } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Check if slug already exists
    const existingTag = await prisma.tag.findUnique({
      where: { slug }
    })

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        color: color || '#64748b'
      }
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}