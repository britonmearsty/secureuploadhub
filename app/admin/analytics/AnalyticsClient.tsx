"use client"

import { useState, useEffect } from "react"
import {
    Users,
    FolderOpen,
    Upload,
    CreditCard,
    TrendingUp,
    HardDrive,
    AlertCircle,
    Loader,
    Download,
    Calendar,
    X,
} from "lucide-react"
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts"

interface AnalyticsData {
    overview: {
        totalUsers: number
        activeUsers: number
        totalPortals: number
        activePortals: number
        totalUploads: number
        uploadsThisMonth: number
        totalSubscriptions: number
        activeSubscriptions: number
        totalRevenue: number
        revenueThisMonth: number
        failedUploads: number
        totalStorageGB: number
        averageFileSize: number
    }
    charts: {
        dailyUploads: Array<{ date: string; uploads: number; users: number; revenue: number }>
        dailyUsers: Array<{ date: string; newUsers: number; activeUsers: number }>
    }
    topPortals: Array<{
        name: string
        uploads: number
        owner: string
    }>
    revenueByPlan: Array<{
        name: string
        subscriptions: number
        price: number
    }>
    storageBreakdown: Array<{
        name: string
        value: number
    }>
}

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: string | number
    subtext?: string
    color: "blue" | "green" | "purple" | "orange" | "red"
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
    const colors = {
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        purple: "bg-purple-100 text-purple-700",
        orange: "bg-orange-100 text-orange-700",
        red: "bg-red-100 text-red-700"
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
        </div>
    )
}

const COLORS = [
    "#0f172a",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
]

export default function AnalyticsClient() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
    })
    const [showDatePicker, setShowDatePicker] = useState(false)

    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end,
            })
            const res = await fetch(`/api/admin/analytics?${params}`)
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data)
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error)
        } finally {
            setLoading(false)
        }
    }

    const exportAnalytics = () => {
        if (!analytics) return

        const report = {
            generatedAt: new Date().toISOString(),
            dateRange: dateRange,
            overview: analytics.overview,
            topPortals: analytics.topPortals,
            revenueByPlan: analytics.revenueByPlan,
            charts: {
                dailyUploads: analytics.charts.dailyUploads,
                dailyUsers: analytics.charts.dailyUsers,
            },
        }

        const csv = generateCSV(report)
        downloadFile(csv, `analytics-report-${new Date().toISOString().split("T")[0]}.csv`)
    }

    const generateCSV = (report: any) => {
        let csv = "Analytics Report\n"
        csv += `Generated: ${report.generatedAt}\n`
        csv += `Date Range: ${report.dateRange.start} to ${report.dateRange.end}\n\n`

        csv += "Overview Metrics\n"
        csv += Object.entries(report.overview)
            .map(([key, value]) => `${key},${value}`)
            .join("\n")
        csv += "\n\n"

        csv += "Daily Uploads\n"
        csv += "Date,Uploads,Users,Revenue\n"
        csv += report.charts.dailyUploads
            .map((d: any) => `${d.date},${d.uploads},${d.users},${d.revenue}`)
            .join("\n")
        csv += "\n\n"

        csv += "Top Portals\n"
        csv += "Name,Owner,Uploads\n"
        csv += report.topPortals.map((p: any) => `"${p.name}","${p.owner}",${p.uploads}`).join("\n")

        return csv
    }

    const downloadFile = (content: string, filename: string) => {
        const blob = new Blob([content], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading analytics...</p>
                </div>
            </div>
        )
    }

    if (!analytics) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800">Failed to load analytics data</p>
                    </div>
                </div>
            </div>
        )
    }

    const { overview, topPortals, revenueByPlan, storageBreakdown, charts } = analytics

    return (
        <div className="p-8">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
                        <p className="text-slate-600 mt-1">System metrics and statistics</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <Calendar className="w-4 h-4" />
                            {dateRange.start} to {dateRange.end}
                        </button>
                        <button
                            onClick={exportAnalytics}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Date Range Picker */}
                {showDatePicker && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">Start Date</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) =>
                                        setDateRange({ ...dateRange, start: e.target.value })
                                    }
                                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">End Date</label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) =>
                                        setDateRange({ ...dateRange, end: e.target.value })
                                    }
                                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total Users"
                    value={overview.totalUsers}
                    subtext={`+${overview.activeUsers} this month`}
                    color="blue"
                />
                <StatCard
                    icon={<FolderOpen className="w-6 h-6" />}
                    label="Upload Portals"
                    value={overview.totalPortals}
                    subtext={`${overview.activePortals} active`}
                    color="purple"
                />
                <StatCard
                    icon={<Upload className="w-6 h-6" />}
                    label="Total Uploads"
                    value={overview.totalUploads}
                    subtext={`${overview.uploadsThisMonth} this month`}
                    color="green"
                />
                <StatCard
                    icon={<CreditCard className="w-6 h-6" />}
                    label="Total Revenue"
                    value={`$${overview.totalRevenue.toFixed(2)}`}
                    subtext={`$${overview.revenueThisMonth.toFixed(2)} this month`}
                    color="orange"
                />
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Active Subscriptions"
                    value={overview.activeSubscriptions}
                    subtext={`of ${overview.totalSubscriptions} total`}
                    color="green"
                />
                <StatCard
                    icon={<HardDrive className="w-6 h-6" />}
                    label="Storage Used"
                    value={`${overview.totalStorageGB.toFixed(2)} GB`}
                    subtext={`Avg file: ${(overview.averageFileSize / 1024 / 1024).toFixed(2)} MB`}
                    color="blue"
                />
                <StatCard
                    icon={<AlertCircle className="w-6 h-6" />}
                    label="Failed Uploads"
                    value={overview.failedUploads}
                    subtext={`${((overview.failedUploads / overview.totalUploads) * 100).toFixed(2)}% failure rate`}
                    color={overview.failedUploads > 0 ? "red" : "green"}
                />
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Success Rate"
                    value={`${(((overview.totalUploads - overview.failedUploads) / overview.totalUploads) * 100).toFixed(1)}%`}
                    subtext={`${overview.totalUploads - overview.failedUploads} successful`}
                    color="green"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                {/* Daily Uploads and Revenue Line Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Uploads & Revenue Trend</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={charts.dailyUploads}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="uploads"
                                stroke="#3b82f6"
                                name="Uploads"
                                dot={false}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10b981"
                                name="Revenue ($)"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Users Trend */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">User Growth</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts.dailyUsers}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="newUsers" fill="#8b5cf6" name="New Users" />
                            <Bar dataKey="activeUsers" fill="#3b82f6" name="Active Users" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Subscription Plans Pie Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Subscription Distribution</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={revenueByPlan}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) =>
                                    `${entry.name}: ${entry.subscriptions}`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="subscriptions"
                            >
                                {revenueByPlan.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Storage Breakdown Pie Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Storage Breakdown</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={storageBreakdown}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) =>
                                    `${name}: ${(value as number).toFixed(2)}GB`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {storageBreakdown.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => `${(value as number).toFixed(2)}GB`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Two Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Portals */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Top Portals</h2>
                    <div className="space-y-4">
                        {topPortals.map((portal, idx) => (
                            <div key={idx} className="flex items-center justify-between pb-4 border-b border-slate-200 last:pb-0 last:border-0">
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">{portal.name}</p>
                                    <p className="text-sm text-slate-500">{portal.owner}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-slate-900">{portal.uploads}</p>
                                    <p className="text-xs text-slate-500">uploads</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Revenue by Plan */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Plans Performance</h2>
                    <div className="space-y-4">
                        {revenueByPlan.map((plan, idx) => (
                            <div key={idx} className="pb-4 border-b border-slate-200 last:pb-0 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-slate-900">{plan.name}</p>
                                    <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                        ${plan.price}/mo
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-slate-900 h-2 rounded-full"
                                            style={{
                                                width: `${(plan.subscriptions / Math.max(...revenueByPlan.map(p => p.subscriptions), 1)) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 w-8 text-right">
                                        {plan.subscriptions}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    )
}
