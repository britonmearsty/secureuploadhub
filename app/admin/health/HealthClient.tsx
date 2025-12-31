"use client"

import { useState, useEffect } from "react"
import {
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Database,
    Cpu,
    HardDrive,
    Clock,
    Activity,
    Loader,
    TrendingUp,
} from "lucide-react"

interface HealthData {
    status: string
    timestamp: Date
    uptime: {
        seconds: number
        formatted: string
    }
    database: {
        status: string
        latency: string
        records: {
            users: number
            portals: number
            uploads: number
        }
    }
    system: {
        cpu: {
            cores: number
            loadAverage: string
        }
        memory: {
            total: string
            used: string
            free: string
            usagePercent: string
        }
    }
    storage: {
        usedBytes: number
        usedGB: string
    }
    responseTime: string
    checks: {
        database: boolean
        memory: boolean
        diskSpace: boolean
    }
}

interface StatusIndicatorProps {
    status: "healthy" | "warning" | "critical"
    label: string
}

function StatusIndicator({ status, label }: StatusIndicatorProps) {
    const colors = {
        healthy: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-700",
        critical: "bg-red-100 text-red-700"
    }

    const icons = {
        healthy: "CheckCircle",
        warning: "AlertCircle",
        critical: "AlertCircle"
    }

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
            {status === "healthy" && <CheckCircle className="w-4 h-4" />}
            {(status === "warning" || status === "critical") && <AlertCircle className="w-4 h-4" />}
            {label}
        </div>
    )
}

interface MetricCardProps {
    icon: React.ReactNode
    title: string
    value: string | number
    subtext?: string
    status?: "healthy" | "warning" | "critical"
}

function MetricCard({ icon, title, value, subtext, status }: MetricCardProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="text-slate-400">
                    {icon}
                </div>
                {status && <StatusIndicator status={status} label="" />}
            </div>
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
        </div>
    )
}

export default function HealthClient() {
    const [health, setHealth] = useState<HealthData | null>(null)
    const [loading, setLoading] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(true)

    useEffect(() => {
        fetchHealth()
        const interval = autoRefresh ? setInterval(fetchHealth, 10000) : undefined
        return () => clearInterval(interval)
    }, [autoRefresh])

    const fetchHealth = async () => {
        try {
            const res = await fetch("/api/admin/health")
            if (res.ok) {
                const data = await res.json()
                setHealth(data)
            }
        } catch (error) {
            console.error("Failed to fetch health:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading system health...</p>
                </div>
            </div>
        )
    }

    if (!health) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800">Failed to load system health data</p>
                    </div>
                </div>
            </div>
        )
    }

    const getMemoryStatus = (): "healthy" | "warning" | "critical" => {
        const usage = parseFloat(health.system.memory.usagePercent)
        if (usage > 90) return "critical"
        if (usage > 70) return "warning"
        return "healthy"
    }

    const getDbStatus = (): "healthy" | "warning" | "critical" => {
        return health.database.status === "healthy" ? "healthy" : "critical"
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
                    <p className="text-slate-600 mt-1">Monitor system performance and health status</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-600">Auto-refresh (10s)</span>
                    </label>
                    <button
                        onClick={fetchHealth}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Overall Status</p>
                        <div className="flex items-center gap-3">
                            {health.status === "healthy" ? (
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : (
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            )}
                            <p className="text-3xl font-bold text-slate-900 capitalize">
                                {health.status}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 mb-2">Last Updated</p>
                        <p className="text-slate-900">
                            {new Date(health.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    icon={<Clock className="w-6 h-6" />}
                    title="Uptime"
                    value={health.uptime.formatted}
                    subtext={`${health.uptime.seconds.toFixed(0)} seconds`}
                    status="healthy"
                />
                <MetricCard
                    icon={<Database className="w-6 h-6" />}
                    title="Database"
                    value={health.database.latency}
                    subtext={`Status: ${health.database.status}`}
                    status={getDbStatus()}
                />
                <MetricCard
                    icon={<Cpu className="w-6 h-6" />}
                    title="CPU Load"
                    value={health.system.cpu.loadAverage}
                    subtext={`${health.system.cpu.cores} cores`}
                />
                <MetricCard
                    icon={<Activity className="w-6 h-6" />}
                    title="Response Time"
                    value={health.responseTime}
                    subtext="Last health check"
                    status="healthy"
                />
            </div>

            {/* Database Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Users</p>
                    <p className="text-3xl font-bold text-slate-900">{health.database.records.users.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Portals</p>
                    <p className="text-3xl font-bold text-slate-900">{health.database.records.portals.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Uploads</p>
                    <p className="text-3xl font-bold text-slate-900">{health.database.records.uploads.toLocaleString()}</p>
                </div>
            </div>

            {/* System Resources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Memory */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Memory Usage</h3>
                        <StatusIndicator status={getMemoryStatus()} label="" />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-600">Used</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {health.system.memory.used} / {health.system.memory.total}
                                </p>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        getMemoryStatus() === "critical"
                                            ? "bg-red-600"
                                            : getMemoryStatus() === "warning"
                                                ? "bg-yellow-600"
                                                : "bg-green-600"
                                    }`}
                                    style={{ width: `${health.system.memory.usagePercent}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {health.system.memory.usagePercent}% used
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Free</p>
                                <p className="font-semibold text-slate-900">{health.system.memory.free}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Total</p>
                                <p className="font-semibold text-slate-900">{health.system.memory.total}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Storage */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">File Storage</h3>
                        <HardDrive className="w-6 h-6 text-slate-400" />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-slate-600 mb-2">Total Used</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {health.storage.usedGB} GB
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Size</p>
                            <p className="text-sm font-mono text-slate-600">
                                {(health.storage.usedBytes / 1024 / 1024 / 1024).toFixed(2)} GB
                                ({(health.storage.usedBytes / 1024 / 1024).toFixed(0)} MB)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Checks */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Health Checks</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            {health.checks.database ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium text-slate-900">Database Connection</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            health.checks.database
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}>
                            {health.checks.database ? "Operational" : "Failed"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            {health.checks.memory ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            )}
                            <span className="font-medium text-slate-900">Memory Usage</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            health.checks.memory
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                        }`}>
                            {health.checks.memory ? "Normal" : "High"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            {health.checks.diskSpace ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium text-slate-900">Disk Space</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            health.checks.diskSpace
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}>
                            {health.checks.diskSpace ? "Available" : "Low"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
