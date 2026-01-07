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
    const categories = await prisma.category.findMany({
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

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
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
    const { name, description, color } = body

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
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        color: color || '#6366f1'
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}