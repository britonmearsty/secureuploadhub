"use client"

import { useState, useEffect } from "react"
import { Users, FolderOpen, Upload, AlertTriangle, TrendingUp, Activity, Zap, ArrowUpRight, ArrowDownRight, RefreshCw, Bell, Gauge } from "lucide-react"
import PaginatedList from "./components/PaginatedList"
import CacheIndicator from "./components/CacheIndicator"
import RateLimitIndicator from "./components/RateLimitIndicator"
import PerformanceMonitor from "./components/PerformanceMonitor"
import SystemHealthStatus from "./components/SystemHealthStatus"
import DateRangeFilter from "./components/DateRangeFilter"

interface AdminDashboardClientProps {
    stats: {
        totalUsers: number
        totalPortals: number
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
    trendData?: {
        daily: Array<{ date: string; users: number; uploads: number; revenue: number }>
    }
    systemAlerts?: Array<{
        id: string
        type: "warning" | "error" | "info"
        title: string
        message: string
        timestamp: Date
    }>
    activityLog?: Array<{
        id: string
        action: string
        resource: string
        userName?: string
        status: string
        timestamp: Date
    }>
    cacheInfo?: {
        lastUpdated: Date
        dataAge: string
    }
    rateLimit?: {
        remaining: number
        limit: number
        resetTime: Date
    }
}

export default function AdminDashboardClient({ 
    stats, 
    recentUsers,
    trendData = { daily: [] },
    systemAlerts = [],
    activityLog = [],
    cacheInfo,
    rateLimit
}: AdminDashboardClientProps) {
    const [selectedMetric, setSelectedMetric] = useState<"users" | "uploads">("uploads")
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(cacheInfo?.lastUpdated || new Date())
    const [dateRangeFilter, setDateRangeFilter] = useState<{ start: Date | null; end: Date | null }>({
        start: null,
        end: null
    })

    // Calculate growth metrics
    const last7Days = trendData.daily.slice(-7)
    const usersGrowth = last7Days.length >= 2 
        ? ((last7Days[last7Days.length - 1].users - last7Days[0].users) / last7Days[0].users * 100).toFixed(1)
        : "0"
    const uploadsGrowth = last7Days.length >= 2
        ? ((last7Days[last7Days.length - 1].uploads - last7Days[0].uploads) / last7Days[0].uploads * 100).toFixed(1)
        : "0"

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const response = await fetch("/api/admin/dashboard-refresh", {
                method: "POST"
            })
            if (response.ok) {
                setLastUpdated(new Date())
                // In a real app, you'd also update the dashboard data here
                // For now, just show the refresh animation
            }
        } catch (error) {
            console.error("Failed to refresh dashboard:", error)
        } finally {
            setIsRefreshing(false)
        }
    }

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            color: "bg-blue-500",
            growth: usersGrowth,
            trend: "up"
        },
        {
            title: "Total Portals",
            value: stats.totalPortals,
            icon: FolderOpen,
            color: "bg-purple-500",
            growth: "0",
            trend: "neutral"
        },
        {
            title: "Total Uploads",
            value: stats.totalUploads,
            icon: Upload,
            color: "bg-green-500",
            growth: uploadsGrowth,
            trend: "up"
        },
    ]

    const getAlertColor = (type: string) => {
        switch (type) {
            case "error":
                return "bg-red-50 border-red-200 text-red-800"
            case "warning":
                return "bg-yellow-50 border-yellow-200 text-yellow-800"
            default:
                return "bg-blue-50 border-blue-200 text-blue-800"
        }
    }

    const getAlertIcon = (type: string) => {
        switch (type) {
            case "error":
                return <AlertTriangle className="w-5 h-5 text-red-600" />
            case "warning":
                return <AlertTriangle className="w-5 h-5 text-yellow-600" />
            default:
                return <Bell className="w-5 h-5 text-blue-600" />
        }
    }

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-slate-500 mt-1">Manage your entire platform at a glance</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* Dashboard Filters */}
                <div className="flex items-center gap-3">
                    <DateRangeFilter
                        label="Filter by Date Range"
                        onFilter={(start, end) => setDateRangeFilter({ start, end })}
                        onClear={() => setDateRangeFilter({ start: null, end: null })}
                    />
                    {dateRangeFilter.start && dateRangeFilter.end && (
                        <span className="text-xs text-slate-500">
                            Showing data from {dateRangeFilter.start.toLocaleDateString()} to {dateRangeFilter.end.toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-slate-900">View Users</span>
                    </div>
                    <p className="text-sm text-slate-500">Manage all users</p>
                </button>
                <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <FolderOpen className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-slate-900">View Portals</span>
                    </div>
                    <p className="text-sm text-slate-500">Manage portals</p>
                </button>
                <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-slate-900">View Logs</span>
                    </div>
                    <p className="text-sm text-slate-500">System activity</p>
                </button>
                <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all text-left group">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-slate-900">Analytics</span>
                    </div>
                    <p className="text-sm text-slate-500">View reports</p>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    const isPositive = parseFloat(stat.growth) >= 0
                    return (
                        <div
                            key={stat.title}
                            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                {stat.growth !== "0" && (
                                    <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                        {stat.growth}%
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Recent Users - Full Width on Left */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">Recent Users</h2>
                            {cacheInfo && (
                                <CacheIndicator 
                                    lastUpdated={lastUpdated}
                                    isLoading={isRefreshing}
                                    onRefresh={handleRefresh}
                                />
                            )}
                        </div>
                        <PaginatedList
                            items={recentUsers}
                            itemsPerPage={5}
                            emptyMessage="No recent users"
                            renderItem={(user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                >
                                    {user.image ? (
                                        <img
                                            src={user.image}
                                            alt={user.name || "User"}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{user.name || "Unnamed User"}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
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
                            )}
                        />
                    </div>
                </div>

                {/* System Alerts & Monitoring */}
                <div className="space-y-6">
                    {/* Rate Limit */}
                    {rateLimit && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <RateLimitIndicator
                                remaining={rateLimit.remaining}
                                limit={rateLimit.limit}
                                resetTime={rateLimit.resetTime}
                                severity={
                                    rateLimit.remaining / rateLimit.limit < 0.2 ? "critical"
                                        : rateLimit.remaining / rateLimit.limit < 0.5 ? "warning"
                                        : "ok"
                                }
                            />
                        </div>
                    )}

                    {/* System Alerts */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            System Alerts
                        </h2>
                        {systemAlerts.length > 0 ? (
                            <div className="space-y-3">
                                {systemAlerts.slice(0, 5).map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                                    >
                                        <div className="flex items-start gap-2 mb-1">
                                            {getAlertIcon(alert.type)}
                                            <span className="font-semibold text-sm">{alert.title}</span>
                                        </div>
                                        <p className="text-xs opacity-75 ml-7">{alert.message}</p>
                                        <p className="text-xs opacity-60 ml-7 mt-1">
                                            {new Date(alert.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-lg">✓</span>
                                </div>
                                <p className="text-slate-600 text-sm font-medium">All systems operational</p>
                                <p className="text-slate-400 text-xs mt-1">No alerts at this time</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* System Health & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <SystemHealthStatus />
                </div>
                <div>
                    <PerformanceMonitor />
                </div>
            </div>

            {/* Activity Log & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Recent Activity
                        </h2>
                        {activityLog.length > 0 ? (
                            <div className="space-y-3">
                                {activityLog.slice(0, 8).map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-slate-900 text-sm">{log.action}</p>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                    {log.resource}
                                                </span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                    log.status === "success"
                                                        ? "bg-green-100 text-green-700"
                                                        : log.status === "error"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            {log.userName && (
                                                <p className="text-xs text-slate-500">by {log.userName}</p>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 whitespace-nowrap ml-4">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm py-8 text-center">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
