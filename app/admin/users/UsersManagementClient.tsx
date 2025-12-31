"use client"

import { useState, useEffect } from "react"
import { Search, Eye, Trash2, Shield, X, Loader, Download, Mail, Filter, ChevronDown } from "lucide-react"

interface User {
    id: string
    name: string | null
    email: string
    image: string | null
    role: string
    createdAt: Date
    emailVerified: Date | null
    lastLogin?: Date | null
    _count: {
        uploadPortals: number
        subscriptions: number
    }
}

interface UserDetails extends User {
    uploadPortals: Array<{
        id: string
        name: string
        slug: string
        isActive: boolean
        createdAt: Date
        _count: { uploads: number }
    }>
    subscriptions: Array<{
        id: string
        status: string
        plan: { name: string; price: number }
    }>
    activityLogs?: Array<{
        id: string
        action: string
        resource: string
        status: string
        ipAddress?: string
        createdAt: Date
    }>
}

interface UsersManagementClientProps {
    users: User[]
}

export default function UsersManagementClient({ users: initialUsers }: UsersManagementClientProps) {
    const [users, setUsers] = useState<User[]>(initialUsers)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
    const [loading, setLoading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
    const [bulkAction, setBulkAction] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        role: "" as string | "",
        status: "" as string | "", // verified, unverified, active, inactive
        dateFrom: "",
        dateTo: ""
    })
    const [detailsTab, setDetailsTab] = useState<"info" | "activity">("info")

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
            user.name?.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)

        if (!matchesSearch) return false

        // Role filter
        if (filters.role && user.role !== filters.role) return false

        // Status filter
        if (filters.status === "verified" && !user.emailVerified) return false
        if (filters.status === "unverified" && user.emailVerified) return false

        // Date filters
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom)
            if (new Date(user.createdAt) < fromDate) return false
        }
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo)
            if (new Date(user.createdAt) > toDate) return false
        }

        return true
    })

    const viewUserDetails = async (userId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${userId}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedUser(data)
            }
        } catch (error) {
            console.error("Failed to fetch user details:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleAdmin = async (userId: string, currentRole: string) => {
        try {
            const newRole = currentRole === "admin" ? "user" : "admin"
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole })
            })

            if (res.ok) {
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, role: newRole } : u
                ))
                if (selectedUser?.id === userId) {
                    setSelectedUser({ ...selectedUser, role: newRole })
                }
            }
        } catch (error) {
            console.error("Failed to update user role:", error)
        }
    }

    const deleteUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setUsers(users.filter(u => u.id !== userId))
                setSelectedUser(null)
                setDeleteConfirm(null)
            }
        } catch (error) {
            console.error("Failed to delete user:", error)
        }
    }

    const handleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers)
        if (newSelected.has(userId)) {
            newSelected.delete(userId)
        } else {
            newSelected.add(userId)
        }
        setSelectedUsers(newSelected)
    }

    const handleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set())
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
        }
    }

    const executeBulkAction = async (action: string) => {
        if (selectedUsers.size === 0) return

        try {
            if (action === "delete") {
                const res = await fetch("/api/admin/users/bulk-delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: Array.from(selectedUsers) })
                })
                if (res.ok) {
                    setUsers(users.filter(u => !selectedUsers.has(u.id)))
                    setSelectedUsers(new Set())
                }
            } else if (action === "role") {
                const res = await fetch("/api/admin/users/bulk-role", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: Array.from(selectedUsers), role: "admin" })
                })
                if (res.ok) {
                    setUsers(users.map(u =>
                        selectedUsers.has(u.id) ? { ...u, role: "admin" } : u
                    ))
                    setSelectedUsers(new Set())
                }
            } else if (action === "export") {
                const exportUsers = users.filter(u => selectedUsers.has(u.id))
                const csv = "Name,Email,Role,Created At,Email Verified\n" +
                    exportUsers.map(u =>
                        `"${u.name || ''}","${u.email}","${u.role}","${new Date(u.createdAt).toISOString()}","${u.emailVerified ? 'Yes' : 'No'}"`
                    ).join("\n")

                const blob = new Blob([csv], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
            } else if (action === "resend-verification") {
                const res = await fetch("/api/admin/users/bulk-resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: Array.from(selectedUsers) })
                })
                if (res.ok) {
                    alert("Verification emails sent to " + selectedUsers.size + " user(s)")
                    setSelectedUsers(new Set())
                }
            }
            setBulkAction(null)
        } catch (error) {
            console.error("Failed to execute bulk action:", error)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                <p className="text-slate-500 mt-1">Manage all users on the platform</p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-3 border border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Role</label>
                            <select
                                value={filters.role}
                                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Email Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                                <option value="">All Status</option>
                                <option value="verified">Verified</option>
                                <option value="unverified">Unverified</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">From Date</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">To Date</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-blue-900">{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setBulkAction("role")}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Shield className="w-4 h-4 inline mr-2" />
                            Make Admin
                        </button>
                        <button
                            onClick={() => setBulkAction("resend-verification")}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <Mail className="w-4 h-4 inline mr-2" />
                            Resend Verification
                        </button>
                        <button
                            onClick={() => executeBulkAction("export")}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4 inline mr-2" />
                            Export
                        </button>
                        <button
                            onClick={() => setBulkAction("delete")}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                            <Trash2 className="w-4 h-4 inline mr-2" />
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.size > 0 && selectedUsers.size === filteredUsers.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Portals
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${selectedUsers.has(user.id) ? "bg-blue-50" : ""}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.has(user.id)}
                                            onChange={() => handleSelectUser(user.id)}
                                            className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {user.image ? (
                                                <img
                                                    src={user.image}
                                                    alt={user.name || "User"}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-slate-900">{user.name || "Unnamed User"}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${user.role === "admin"
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-slate-100 text-slate-700"
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-900">
                                        {user._count.uploadPortals}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${user.emailVerified
                                                ? "bg-green-100 text-green-700"
                                                : "bg-yellow-100 text-yellow-700"
                                            }`}>
                                            {user.emailVerified ? "Verified" : "Unverified"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                        <button
                                            onClick={() => viewUserDetails(user.id)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => toggleAdmin(user.id, user.role)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title={user.role === "admin" ? "Remove admin" : "Make admin"}
                                        >
                                            <Shield className={`w-4 h-4 ${user.role === "admin" ? "text-purple-500" : "text-slate-400"}`} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(user.id)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Delete user"
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

            {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No users found</p>
                </div>
            )}

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                            <h2 className="text-2xl font-bold text-slate-900">User Details</h2>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 sticky top-16 bg-white">
                            <button
                                onClick={() => setDetailsTab("info")}
                                className={`flex-1 py-4 px-6 font-medium text-sm border-b-2 transition-colors ${detailsTab === "info"
                                        ? "border-b-slate-900 text-slate-900"
                                        : "border-b-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                Information
                            </button>
                            <button
                                onClick={() => setDetailsTab("activity")}
                                className={`flex-1 py-4 px-6 font-medium text-sm border-b-2 transition-colors ${detailsTab === "activity"
                                        ? "border-b-slate-900 text-slate-900"
                                        : "border-b-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                Activity History
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {detailsTab === "info" && (
                                <>

                                    {/* User Info */}
                                    <div className="flex items-center gap-4">
                                        {selectedUser.image ? (
                                            <img
                                                src={selectedUser.image}
                                                alt={selectedUser.name || "User"}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                                                {selectedUser.name?.charAt(0).toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{selectedUser.name || "Unnamed User"}</h3>
                                            <p className="text-slate-500">{selectedUser.email}</p>
                                            <p className="text-sm text-slate-400 mt-1">
                                                Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">{selectedUser.role}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Portals</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">{selectedUser.uploadPortals.length}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider">Subscriptions</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">{selectedUser.subscriptions.length}</p>
                                        </div>
                                    </div>

                                    {/* Email Status */}
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <p className="text-sm font-semibold text-slate-900 mb-2">Email Verification</p>
                                        <p className="text-sm text-slate-600">
                                            {selectedUser.emailVerified
                                                ? `Verified on ${new Date(selectedUser.emailVerified).toLocaleDateString()}`
                                                : "Not verified"}
                                        </p>
                                    </div>

                                    {/* Portals */}
                                    {selectedUser.uploadPortals.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-3">Upload Portals ({selectedUser.uploadPortals.length})</h4>
                                            <div className="space-y-2">
                                                {selectedUser.uploadPortals.map(portal => (
                                                    <div key={portal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-slate-900">{portal.name}</p>
                                                            <p className="text-sm text-slate-500">{portal._count.uploads} uploads</p>
                                                        </div>
                                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${portal.isActive
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-slate-200 text-slate-600"
                                                            }`}>
                                                            {portal.isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Subscriptions */}
                                    {selectedUser.subscriptions.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-3">Subscriptions</h4>
                                            <div className="space-y-2">
                                                {selectedUser.subscriptions.map(sub => (
                                                    <div key={sub.id} className="p-3 bg-slate-50 rounded-lg">
                                                        <p className="font-medium text-slate-900">{sub.plan.name}</p>
                                                        <p className="text-sm text-slate-500">Status: {sub.status}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4 border-t border-slate-200">
                                        <button
                                            onClick={() => toggleAdmin(selectedUser.id, selectedUser.role)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            <Shield className="w-4 h-4" />
                                            {selectedUser.role === "admin" ? "Remove Admin" : "Make Admin"}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(selectedUser.id)}
                                            className="flex-1 py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                                        >
                                            Delete User
                                        </button>
                                    </div>
                                </>
                            )}

                            {detailsTab === "activity" && (
                                <>
                                    {/* Activity History */}
                                    {selectedUser.activityLogs && selectedUser.activityLogs.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedUser.activityLogs.map((log) => (
                                                <div key={log.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${log.status === "success" ? "bg-green-500" :
                                                                    log.status === "error" ? "bg-red-500" : "bg-yellow-500"
                                                                }`} />
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{log.action}</p>
                                                                <p className="text-sm text-slate-500">{log.resource}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${log.status === "success"
                                                                ? "bg-green-100 text-green-700"
                                                                : log.status === "error"
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-yellow-100 text-yellow-700"
                                                            }`}>
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                                                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-slate-500">No activity history available</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && !bulkAction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete User?</h3>
                        <p className="text-slate-600 mb-6">
                            This action cannot be undone. All associated data will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteUser(deleteConfirm)}
                                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Confirmation Modals */}
            {bulkAction === "delete" && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete {selectedUsers.size} Users?</h3>
                        <p className="text-slate-600 mb-6">
                            This action cannot be undone. All associated data will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBulkAction(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => executeBulkAction("delete")}
                                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {bulkAction === "role" && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Make {selectedUsers.size} Users Admin?</h3>
                        <p className="text-slate-600 mb-6">
                            These users will gain administrative privileges.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBulkAction(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => executeBulkAction("role")}
                                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {bulkAction === "resend-verification" && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Resend Verification Emails?</h3>
                        <p className="text-slate-600 mb-6">
                            Verification emails will be sent to {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBulkAction(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => executeBulkAction("resend-verification")}
                                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
