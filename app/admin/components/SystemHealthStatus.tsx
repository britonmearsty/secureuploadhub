"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, Clock, Database, Zap } from "lucide-react"

interface HealthStatus {
    service: string
    status: "healthy" | "degraded" | "down"
    responseTime?: number
    uptime?: number
    details?: string
    lastChecked?: Date
}

interface SystemHealthStatusProps {
    statuses?: HealthStatus[]
}

export default function SystemHealthStatus({ statuses = [] }: SystemHealthStatusProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [lastCheck, setLastCheck] = useState(new Date())

    // Default health statuses if none provided
    const defaultStatuses: HealthStatus[] = [
        {
            service: "API Server",
            status: "healthy",
            responseTime: 45,
            uptime: 99.98,
            details: "All systems operational",
            lastChecked: new Date()
        },
        {
            service: "Database",
            status: "healthy",
            responseTime: 12,
            uptime: 99.99,
            details: "PostgreSQL - All connections healthy",
            lastChecked: new Date()
        },
        {
            service: "Cache",
            status: "healthy",
            responseTime: 5,
            uptime: 99.95,
            details: "Redis - Cache hit rate 94%",
            lastChecked: new Date()
        },
        {
            service: "Storage",
            status: "healthy",
            responseTime: 78,
            uptime: 99.9,
            details: "S3 backend - 45GB used",
            lastChecked: new Date()
        }
    ]

    const displayStatuses = statuses.length > 0 ? statuses : defaultStatuses

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle className="w-5 h-5 text-green-600" />
            case "degraded":
                return <AlertCircle className="w-5 h-5 text-yellow-600" />
            case "down":
                return <AlertCircle className="w-5 h-5 text-red-600" />
            default:
                return null
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "bg-green-50 border-green-200"
            case "degraded":
                return "bg-yellow-50 border-yellow-200"
            case "down":
                return "bg-red-50 border-red-200"
            default:
                return "bg-slate-50 border-slate-200"
        }
    }

    const getServiceIcon = (service: string) => {
        switch (service.toLowerCase()) {
            case "api server":
                return <Zap className="w-4 h-4" />
            case "database":
                return <Database className="w-4 h-4" />
            case "cache":
                return <Zap className="w-4 h-4" />
            case "storage":
                return <Clock className="w-4 h-4" />
            default:
                return <CheckCircle className="w-4 h-4" />
        }
    }

    const handleRefreshStatus = async () => {
        setIsLoading(true)
        try {
            // In production, call actual health check endpoint
            await new Promise(resolve => setTimeout(resolve, 1000))
            setLastCheck(new Date())
        } finally {
            setIsLoading(false)
        }
    }

    // Calculate overall system status
    const overallStatus = displayStatuses.every(s => s.status === "healthy") 
        ? "healthy"
        : displayStatuses.some(s => s.status === "down")
        ? "down"
        : "degraded"

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">System Health</h3>
                    <div className="flex items-center gap-1">
                        {getStatusIcon(overallStatus)}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            overallStatus === "healthy"
                                ? "bg-green-100 text-green-700"
                                : overallStatus === "degraded"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                        }`}>
                            {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleRefreshStatus}
                    disabled={isLoading}
                    className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? "Checking..." : "Check Status"}
                </button>
            </div>

            <div className="space-y-3 mb-4">
                {displayStatuses.map((status, idx) => (
                    <div
                        key={idx}
                        className={`border rounded-lg p-3 ${getStatusColor(status.status)}`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {getServiceIcon(status.service)}
                                <span className="font-semibold text-sm text-slate-900">
                                    {status.service}
                                </span>
                            </div>
                            {getStatusIcon(status.status)}
                        </div>

                        {status.details && (
                            <p className="text-xs text-slate-600 mb-2">{status.details}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs">
                            {status.responseTime !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 opacity-50" />
                                    <span className="opacity-75">
                                        {status.responseTime}ms
                                    </span>
                                </div>
                            )}
                            {status.uptime !== undefined && (
                                <div className="flex items-center gap-1">
                                    <span className="opacity-75">
                                        {status.uptime}% uptime
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-xs text-slate-500 text-right">
                Last checked: {lastCheck.toLocaleTimeString()}
            </div>
        </div>
    )
}
