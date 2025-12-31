"use client"

import { useState, useEffect } from "react"
import { Activity, Zap, Clock, AlertCircle } from "lucide-react"

interface PerformanceMetric {
    label: string
    value: string | number
    unit: string
    status: "healthy" | "warning" | "critical"
    icon: React.ReactNode
}

interface PerformanceMonitorProps {
    metrics?: PerformanceMetric[]
}

export default function PerformanceMonitor({ metrics = [] }: PerformanceMonitorProps) {
    const defaultMetrics: PerformanceMetric[] = [
        {
            label: "API Response Time",
            value: 45,
            unit: "ms",
            status: "healthy",
            icon: <Clock className="w-4 h-4" />
        },
        {
            label: "Database Queries/sec",
            value: 156,
            unit: "q/s",
            status: "healthy",
            icon: <Zap className="w-4 h-4" />
        },
        {
            label: "Cache Hit Rate",
            value: 94,
            unit: "%",
            status: "healthy",
            icon: <Activity className="w-4 h-4" />
        },
        {
            label: "Error Rate",
            value: 0.2,
            unit: "%",
            status: "healthy",
            icon: <AlertCircle className="w-4 h-4" />
        }
    ]

    const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "bg-green-100 text-green-800 border-green-200"
            case "warning":
                return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case "critical":
                return "bg-red-100 text-red-800 border-red-200"
            default:
                return "bg-slate-100 text-slate-800 border-slate-200"
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "healthy":
                return "✓ Healthy"
            case "warning":
                return "⚠ Warning"
            case "critical":
                return "✗ Critical"
            default:
                return "Normal"
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayMetrics.map((metric, idx) => (
                    <div
                        key={idx}
                        className={`rounded-lg border p-4 ${getStatusColor(metric.status)}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {metric.icon}
                                <span className="font-medium text-sm">{metric.label}</span>
                            </div>
                            <span className="text-xs font-bold">{getStatusBadge(metric.status)}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">{metric.value}</span>
                            <span className="text-sm opacity-75">{metric.unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
