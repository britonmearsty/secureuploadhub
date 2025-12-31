"use client"

import { useState } from "react"
import { Search, Plus, Edit2, Trash2, X, Eye } from "lucide-react"

interface BlogPost {
    id: string
    title: string
    slug: string
    content: string
    excerpt: string | null
    featuredImage: string | null
    author: string
    status: string
    seoTitle: string | null
    seoDescription: string | null
    seoKeywords: string | null
    publishedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

interface BlogsClientProps {
    blogs: BlogPost[]
}

export default function BlogsClient({ blogs: initialBlogs }: BlogsClientProps) {
    const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        excerpt: "",
        status: "draft",
        seoTitle: "",
        seoDescription: "",
        seoKeywords: "",
        featuredImage: ""
    })

    const filteredBlogs = blogs.filter((blog) => {
        const query = searchQuery.toLowerCase()
        const matchesSearch = (
            blog.title.toLowerCase().includes(query) ||
            blog.slug.toLowerCase().includes(query) ||
            blog.author.toLowerCase().includes(query)
        )
        const matchesStatus = statusFilter === "all" || blog.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const publishedCount = blogs.filter(b => b.status === "published").length

    const handleEdit = (blog: BlogPost) => {
        setSelectedBlog(blog)
        setFormData({
            title: blog.title,
            content: blog.content,
            excerpt: blog.excerpt || "",
            status: blog.status,
            seoTitle: blog.seoTitle || "",
            seoDescription: blog.seoDescription || "",
            seoKeywords: blog.seoKeywords || "",
            featuredImage: blog.featuredImage || ""
        })
        setIsEditing(true)
    }

    const handleSave = async () => {
        if (!selectedBlog) return

        setLoading(true)
        try {
            const res = await fetch(`/api/admin/blogs/${selectedBlog.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                const { blog } = await res.json()
                setBlogs(blogs.map(b => b.id === blog.id ? blog : b))
                setSelectedBlog(blog)
                setIsEditing(false)
            }
        } catch (error) {
            console.error("Failed to save blog:", error)
        } finally {
            setLoading(false)
        }
    }

    const deleteBlog = async (blogId: string) => {
        try {
            const res = await fetch(`/api/admin/blogs/${blogId}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setBlogs(blogs.filter(b => b.id !== blogId))
                setSelectedBlog(null)
                setDeleteConfirm(null)
            }
        } catch (error) {
            console.error("Failed to delete blog:", error)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Blog Posts</h1>
                <p className="text-slate-500 mt-1">Manage blog posts and content</p>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Total Posts</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{blogs.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Published</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{publishedCount}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Drafts</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{blogs.length - publishedCount}</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Blogs Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Author
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredBlogs.map((blog) => (
                                <tr key={blog.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900">{blog.title}</p>
                                            <p className="text-sm text-slate-500">/{blog.slug}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {blog.author}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                                            blog.status === "published"
                                                ? "bg-green-100 text-green-700"
                                                : blog.status === "draft"
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {blog.status.charAt(0).toUpperCase() + blog.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {blog.status === "published" && blog.publishedAt
                                            ? new Date(blog.publishedAt).toLocaleDateString()
                                            : new Date(blog.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                        <button
                                            onClick={() => handleEdit(blog)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Edit post"
                                        >
                                            <Edit2 className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(blog.id)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Delete post"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredBlogs.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No blog posts found</p>
                </div>
            )}

            {/* Blog Editor Modal */}
            {isEditing && selectedBlog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Post</h2>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>

                            {/* Excerpt */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Excerpt (optional)
                                </label>
                                <textarea
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Content
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows={12}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            {/* SEO Section */}
                            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold text-slate-900">SEO Metadata</h3>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        SEO Title (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.seoTitle}
                                        onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                                        placeholder="Custom SEO title"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Meta Description (optional)
                                    </label>
                                    <textarea
                                        value={formData.seoDescription}
                                        onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                                        placeholder="Meta description for search engines"
                                        rows={2}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Keywords (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.seoKeywords}
                                        onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
                                        placeholder="Comma-separated keywords"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Post?</h3>
                        <p className="text-slate-600 mb-6">
                            This action cannot be undone. The blog post will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteBlog(deleteConfirm)}
                                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
