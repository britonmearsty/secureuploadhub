import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFreshUserData } from "@/lib/session-validation"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { Plus, Edit, Trash2, Eye, Star, Calendar, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function AdminBlogPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const freshUser = await getFreshUserData(session.user.id)
  
  if (!freshUser || freshUser.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch articles with author info
  const articles = await prisma.article.findMany({
    include: {
      author: {
        select: {
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
      },
      _count: {
        select: {
          categories: true,
          tags: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'PUBLISHED').length,
    draft: articles.filter(a => a.status === 'DRAFT').length,
    featured: articles.filter(a => a.isFeatured).length
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-gray-600 mt-1">Create and manage your blog articles</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          New Article
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Edit className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Featured</p>
              <p className="text-2xl font-bold text-purple-600">{stats.featured}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Articles</h2>
        </div>
        
        {articles.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Edit size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first blog article.</p>
            <Link
              href="/admin/blog/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Create Article
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {article.title}
                            </p>
                            {article.isFeatured && (
                              <Star size={14} className="text-yellow-500 fill-current" />
                            )}
                          </div>
                          {article.excerpt && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {article.categories.slice(0, 2).map(({ category }) => (
                              <span
                                key={category.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {category.name}
                              </span>
                            ))}
                            {article.categories.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{article.categories.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <User size={14} className="text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {article.author.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {article.author.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        article.status === 'PUBLISHED' 
                          ? 'bg-green-100 text-green-800'
                          : article.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {article.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/blog/${article.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        {article.status === 'PUBLISHED' && (
                          <Link
                            href={`/blog/${article.slug}`}
                            target="_blank"
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                        )}
                        <button
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}