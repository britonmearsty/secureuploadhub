"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TiptapEditor from "@/components/blog/TiptapEditor"
import { Save, Eye, ArrowLeft, Star, Calendar } from "lucide-react"
import Link from "next/link"

interface Category {
  id: string
  name: string
  slug: string
}

interface Tag {
  id: string
  name: string
  slug: string
}

interface ArticleData {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: any
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isFeatured: boolean
  categories: Array<{ category: Category }>
  tags: Array<{ tag: Tag }>
}

interface ArticleFormProps {
  article?: ArticleData
}

export default function ArticleForm({ article }: ArticleFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  
  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    content: article?.content || '',
    status: article?.status || 'DRAFT' as const,
    isFeatured: article?.isFeatured || false,
    categoryIds: article?.categories.map(c => c.category.id) || [],
    tagIds: article?.tags.map(t => t.tag.id) || []
  })

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Update slug when title changes
  useEffect(() => {
    if (formData.title && !article) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(prev.title)
      }))
    }
  }, [formData.title, article])

  // Fetch categories and tags
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          fetch('/api/admin/categories'),
          fetch('/api/admin/tags')
        ])
        
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData)
        }
        
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          setTags(tagsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }

    if (!formData.slug.trim()) {
      alert('Please enter a slug')
      return
    }

    setLoading(true)

    try {
      const url = article ? `/api/admin/articles/${article.id}` : '/api/admin/articles'
      const method = article ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status,
          content: formData.content
        }),
      })

      if (response.ok) {
        router.push('/admin/blog')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save article')
      }
    } catch (error) {
      console.error('Error saving article:', error)
      alert('Failed to save article')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = () => {
    // Store current content in sessionStorage for preview
    sessionStorage.setItem('articlePreview', JSON.stringify(formData))
    window.open('/admin/blog/preview', '_blank')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <Link
            href="/admin/blog"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Articles
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye size={16} />
              Preview
            </button>
            
            <button
              onClick={() => handleSubmit('DRAFT')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              Save Draft
            </button>
            
            <button
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Calendar size={16} />
              {formData.status === 'PUBLISHED' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter article title..."
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="article-slug"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL: /blog/{formData.slug || 'article-slug'}
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the article..."
            />
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              checked={formData.isFeatured}
              onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="featured" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Star size={16} className="text-yellow-500" />
              Featured Article
            </label>
            <span className="text-sm text-gray-500">
              (Featured for 24 hours, max 2 articles)
            </span>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          categoryIds: [...prev.categoryIds, category.id]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          categoryIds: prev.categoryIds.filter(id => id !== category.id)
                        }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.tagIds.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          tagIds: [...prev.tagIds, tag.id]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          tagIds: prev.tagIds.filter(id => id !== tag.id)
                        }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{tag.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <TiptapEditor
              content={typeof formData.content === 'string' ? formData.content : ''}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              placeholder="Start writing your article..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}