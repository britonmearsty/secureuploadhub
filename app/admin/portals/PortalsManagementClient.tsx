"use client"

import { useState } from "react"
import {
    Search,
    Plus,
    Eye,
    Trash2,
    X,
    Loader,
    Edit2,
    ToggleLeft,
} from "lucide-react"

interface Portal {
    id: string
    userId: string
    name: string
    slug: string
    description: string | null
    isActive: boolean
    maxFileSize: number
    allowedFileTypes: string[]
    requireClientName?: boolean
    requireClientEmail?: boolean
    createdAt: Date
    user: {
        id: string
        name: string | null
        email: string
    }
    _count: {
        uploads: number
    }
}

interface PortalDetails extends Portal {
    uploads: Array<{
        id: string
        fileName: string
        fileSize: number
        clientName: string | null
        clientEmail: string | null
        status: string
        createdAt: Date
    }>
}

interface PortalsManagementClientProps {
    portals: Portal[]
}

export default function PortalsManagementClient({
    portals: initialPortals,
}: PortalsManagementClientProps) {
    const [portals, setPortals] = useState<Portal[]>(initialPortals)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedPortal, setSelectedPortal] = useState<PortalDetails | null>(null)
    const [editingPortal, setEditingPortal] = useState<PortalDetails | null>(null)
    const [loading, setLoading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newPortal, setNewPortal] = useState({
        userId: "",
        name: "",
        slug: "",
        description: ""
    })

    const filteredPortals = portals.filter((portal) => {
        const query = searchQuery.toLowerCase()
        return (
            portal.name.toLowerCase().includes(query) ||
            portal.slug.toLowerCase().includes(query) ||
            portal.user.email.toLowerCase().includes(query)
        )
    })

    const viewPortalDetails = async (portalId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/portals/${portalId}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedPortal(data)
            }
        } catch (error) {
            console.error("Failed to fetch portal details:", error)
        } finally {
            setLoading(false)
        }
    }

    const createPortal = async () => {
        if (!newPortal.userId || !newPortal.name || !newPortal.slug) {
            alert("Please fill in all required fields")
            return
        }

        try {
            const res = await fetch("/api/admin/portals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPortal)
            })

            if (res.ok) {
                const data = await res.json()
                setPortals([data, ...portals])
                setNewPortal({ userId: "", name: "", slug: "", description: "" })
                setShowCreateForm(false)
            } else {
                const error = await res.json()
                alert(error.error || "Failed to create portal")
            }
        } catch (error) {
            console.error("Failed to create portal:", error)
        }
    }

    const updatePortal = async () => {
        if (!editingPortal) return

        try {
            const res = await fetch(`/api/admin/portals/${editingPortal.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editingPortal.name,
                    description: editingPortal.description,
                    isActive: editingPortal.isActive,
                    maxFileSize: editingPortal.maxFileSize,
                    allowedFileTypes: editingPortal.allowedFileTypes,
                    requireClientName: editingPortal.requireClientName,
                    requireClientEmail: editingPortal.requireClientEmail
                })
            })

            if (res.ok) {
                const data = await res.json()
                setPortals(portals.map(p => (p.id === data.id ? data : p)))
                setSelectedPortal(data)
                setEditingPortal(null)
            }
        } catch (error) {
            console.error("Failed to update portal:", error)
        }
    }

    const toggleActive = async (portalId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/portals/${portalId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus })
            })

            if (res.ok) {
                const data = await res.json()
                setPortals(portals.map(p => (p.id === data.id ? data : p)))
                if (selectedPortal?.id === portalId) {
                    setSelectedPortal({ ...selectedPortal, isActive: !currentStatus })
                }
            }
        } catch (error) {
            console.error("Failed to toggle portal status:", error)
        }
    }

    const deletePortal = async (portalId: string) => {
        try {
            const res = await fetch(`/api/admin/portals/${portalId}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setPortals(portals.filter(p => p.id !== portalId))
                setSelectedPortal(null)
                setDeleteConfirm(null)
            }
        } catch (error) {
            console.error("Failed to delete portal:", error)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Portals Management</h1>
                    <p className="text-slate-600 mt-1">Manage all upload portals</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Portal
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search portals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Portals Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Portal Name
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Owner
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Uploads
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredPortals.map((portal) => (
                                <tr key={portal.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900">{portal.name}</p>
                                            <p className="text-sm text-slate-500">/{portal.slug}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{portal.user.name}</p>
                                            <p className="text-sm text-slate-500">{portal.user.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-900 font-medium">
                                        {portal._count.uploads}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${portal.isActive
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-700"
                                                }`}
                                        >
                                            {portal.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {new Date(portal.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                        <button
                                            onClick={() => viewPortalDetails(portal.id)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(portal.id, portal.isActive)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title={portal.isActive ? "Deactivate" : "Activate"}
                                        >
                                            <ToggleLeft
                                                className={`w-4 h-4 ${portal.isActive ? "text-green-500" : "text-slate-400"}`}
                                            />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(portal.id)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Delete portal"
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

            {filteredPortals.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No portals found</p>
                </div>
            )}

            {/* Create Portal Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Create New Portal</h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Owner Email *
                                </label>
                                <input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={newPortal.userId}
                                    onChange={(e) =>
                                        setNewPortal({ ...newPortal, userId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Enter the user ID or email of the portal owner
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Portal Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="My Upload Portal"
                                    value={newPortal.name}
                                    onChange={(e) =>
                                        setNewPortal({ ...newPortal, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Portal Slug *
                                </label>
                                <input
                                    type="text"
                                    placeholder="my-upload-portal"
                                    value={newPortal.slug}
                                    onChange={(e) =>
                                        setNewPortal({ ...newPortal, slug: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Description
                                </label>
                                <textarea
                                    placeholder="Portal description..."
                                    value={newPortal.description}
                                    onChange={(e) =>
                                        setNewPortal({ ...newPortal, description: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPortal}
                                className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                Create Portal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Portal Details Modal */}
            {selectedPortal && !editingPortal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                            <h2 className="text-2xl font-bold text-slate-900">{selectedPortal.name}</h2>
                            <button
                                onClick={() => setSelectedPortal(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Slug</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">/{selectedPortal.slug}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Uploads</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">{selectedPortal._count.uploads}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
                                    <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${selectedPortal.isActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-slate-200 text-slate-600"
                                        }`}>
                                        {selectedPortal.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Max File Size</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">
                                        {(selectedPortal.maxFileSize / 1024 / 1024).toFixed(0)} MB
                                    </p>
                                </div>
                            </div>

                            {selectedPortal.description && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-slate-900 mb-2">Description</p>
                                    <p className="text-sm text-slate-600">{selectedPortal.description}</p>
                                </div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm font-semibold text-slate-900 mb-3">Owner</p>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900">{selectedPortal.user.name}</p>
                                        <p className="text-sm text-slate-500">{selectedPortal.user.email}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedPortal.uploads.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-3">Recent Uploads ({selectedPortal._count.uploads})</h4>
                                    <div className="space-y-2">
                                        {selectedPortal.uploads.map(upload => (
                                            <div key={upload.id} className="p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900">{upload.fileName}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {upload.clientName && `${upload.clientName} • `}
                                                            {(upload.fileSize / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${upload.status === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : upload.status === "pending"
                                                            ? "bg-yellow-100 text-yellow-700"
                                                            : "bg-red-100 text-red-700"
                                                        }`}>
                                                        {upload.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => setEditingPortal(selectedPortal)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Portal
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(selectedPortal.id)}
                                    className="flex-1 py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                                >
                                    Delete Portal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Portal Modal */}
            {editingPortal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Portal</h2>
                            <button
                                onClick={() => setEditingPortal(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Portal Name
                                </label>
                                <input
                                    type="text"
                                    value={editingPortal.name}
                                    onChange={(e) =>
                                        setEditingPortal({ ...editingPortal, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={editingPortal.description || ""}
                                    onChange={(e) =>
                                        setEditingPortal({ ...editingPortal, description: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">
                                    Max File Size (MB)
                                </label>
                                <input
                                    type="number"
                                    value={editingPortal.maxFileSize / 1024 / 1024}
                                    onChange={(e) =>
                                        setEditingPortal({
                                            ...editingPortal,
                                            maxFileSize: parseInt(e.target.value) * 1024 * 1024
                                        })
                                    }
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingPortal.requireClientName}
                                        onChange={(e) =>
                                            setEditingPortal({
                                                ...editingPortal,
                                                requireClientName: e.target.checked
                                            })
                                        }
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-slate-900">Require Client Name</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingPortal.requireClientEmail}
                                        onChange={(e) =>
                                            setEditingPortal({
                                                ...editingPortal,
                                                requireClientEmail: e.target.checked
                                            })
                                        }
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-slate-900">Require Client Email</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingPortal(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updatePortal}
                                className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Portal?</h3>
                        <p className="text-slate-600 mb-6">
                            This action cannot be undone. All uploads associated with this portal will also be deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deletePortal(deleteConfirm)}
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
