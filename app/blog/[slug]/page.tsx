import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, User, ArrowLeft, Star } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import prisma from '@/lib/prisma'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: any
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  isFeatured: boolean
  author: {
    name: string | null
    email: string
  }
  categories: Array<{
    category: {
      id: string
      name: string
      slug: string
      color: string | null
    }
  }>
  tags: Array<{
    tag: {
      id: string
      name: string
      slug: string
      color: string | null
    }
  }>
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string): Promise<Article | null> {
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

    return article
  } catch (error) {
    console.error('Error fetching article:', error)
    return null
  }
}

export async function generateStaticParams() {
  try {
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED'
      },
      select: {
        slug: true
      }
    })

    return articles.map((article) => ({
      slug: article.slug
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  
  if (!article) {
    return {
      title: 'Article Not Found - SecureUploadHub',
    }
  }

  return {
    title: `${article.title} - SecureUploadHub Blog`,
    description: article.excerpt || `Read ${article.title} on the SecureUploadHub blog.`,
    openGraph: {
      title: article.title,
      description: article.excerpt || '',
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author.name || 'SecureUploadHub'],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
          
          <div className="mb-6">
            {article.isFeatured && (
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-yellow-600">Featured Article</span>
              </div>
            )}
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>
            
            {article.excerpt && (
              <p className="text-xl text-gray-600 leading-relaxed">
                {article.excerpt}
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{article.author.name || 'Anonymous'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                Published {format(new Date(article.publishedAt || article.createdAt), 'MMMM d, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span>
                {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { 
                  addSuffix: true 
                })}
              </span>
            </div>
          </div>
          
          {/* Categories and Tags */}
          <div className="flex flex-wrap gap-4 mt-6">
            {article.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.categories.map(({ category }) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: `${category.color || '#6B7280'}20`,
                      color: category.color || '#6B7280'
                    }}
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}
            
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{ 
                      borderColor: tag.color || '#6B7280',
                      color: tag.color || '#6B7280'
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:text-gray-700"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </article>
        
        {/* Back to Blog */}
        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
        </div>
      </div>
    </div>
  )
}