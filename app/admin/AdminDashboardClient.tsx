"use client"

import { Users, Upload } from "lucide-react"

interface AdminDashboardClientProps {
    stats: {
        totalUsers: number
        totalUploads: number
    }
    recentUsers: Array<{
        id: string
        name: string | null
        email: string
        image: string | null
        role: string
        createdAt: Date
    }>
}

export default function AdminDashboardClient({ stats, recentUsers }: AdminDashboardClientProps) {
    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            color: "bg-blue-500",
        },
        {
            title: "Total Uploads",
            value: stats.totalUploads,
            icon: Upload,
            color: "bg-green-500",
        },
    ]

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500 mt-1">Manage your entire platform</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.title}
                            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Users</h2>
                <div className="space-y-4">
                    {recentUsers.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors"
                        >
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
                            <div className="flex-1">
                                <p className="font-semibold text-slate-900">{user.name || "Unnamed User"}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${user.role === "admin"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}>
                                    {user.role}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
