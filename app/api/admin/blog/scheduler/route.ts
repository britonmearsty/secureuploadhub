import { NextRequest, NextResponse } from 'next/server'
import { authenticateAPI } from '@/lib/api-auth'
import { unfeatureExpiredArticles, getFeaturedArticlesStatus } from '@/lib/blog-scheduler'

export async function POST(request: NextRequest) {
  const authResult = await authenticateAPI('admin')
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }

  try {
    const result = await unfeatureExpiredArticles()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error running blog scheduler:', error)
    return NextResponse.json(
      { error: 'Failed to run scheduler' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateAPI('admin')
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode }
    )
  }

  try {
    const result = await getFeaturedArticlesStatus()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting featured articles status:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}