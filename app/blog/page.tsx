import { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, User, Star, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = {
  title: 'Blog - SecureUploadHub',
  description: 'Latest articles, tutorials, and insights about secure file sharing and cloud storage.',
}

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  createdAt: string
  isFeatured: boolean
  author: {
    name: string
    email: string
  }
  categories: Array<{
    category: {
      id: string
      name: string
      slug: string
      color: string
    }
  }>
  tags: Array<{
    tag: {
      id: string
      name: string
      slug: string
      color: string
    }
  }>
}

async function getArticles(): Promise<{ articles: Article[]; total: number }> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/articles?limit=20`, {
      next: { revalidate: 300 } // Revalidate every 5 minutes
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch articles')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching articles:', error)
    return { articles: [], total: 0 }
  }
}

export default async function BlogPage() {
  const { articles } = await getArticles()
  
  const featuredArticles = articles.filter(article => article.isFeatured)
  const regularArticles = articles.filter(article => !article.isFeatured)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              SecureUploadHub Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Latest articles, tutorials, and insights about secure file sharing, 
              cloud storage, and digital collaboration.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <h2 className="text-2xl font-bold text-gray-900">Featured Articles</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {featuredArticles.map((article) => (
                <FeaturedArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* Regular Articles */}
        {regularArticles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {featuredArticles.length > 0 ? 'Latest Articles' : 'All Articles'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {articles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Calendar size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-600">Check back soon for our latest content!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FeaturedArticleCard({ article }: { article: Article }) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-yellow-500 fill-current" />
          <span className="text-sm font-medium text-yellow-600">Featured</span>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
          <Link 
            href={`/blog/${article.slug}`}
            className="hover:text-blue-600 transition-colors"
          >
            {article.title}
          </Link>
        </h2>
        
        {article.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-4">
          {article.categories.slice(0, 2).map(({ category }) => (
            <span
              key={category.id}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${category.color}20`,
                color: category.color 
              }}
            >
              {category.name}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>{article.author.name || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>
                {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { 
                  addSuffix: true 
                })}
              </span>
            </div>
          </div>
          
          <Link
            href={`/blog/${article.slug}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
          >
            Read more
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
          <Link 
            href={`/blog/${article.slug}`}
            className="hover:text-blue-600 transition-colors"
          >
            {article.title}
          </Link>
        </h2>
        
        {article.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-4">
          {article.categories.slice(0, 2).map(({ category }) => (
            <span
              key={category.id}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${category.color}20`,
                color: category.color 
              }}
            >
              {category.name}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>
              {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { 
                addSuffix: true 
              })}
            </span>
          </div>
          
          <Link
            href={`/blog/${article.slug}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
          >
            Read more
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  )
}