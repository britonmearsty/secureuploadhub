"use client"

import { AlertCircle, Zap } from "lucide-react"

interface RateLimitIndicatorProps {
    remaining: number
    limit: number
    resetTime?: Date
    severity?: "ok" | "warning" | "critical"
}

export default function RateLimitIndicator({
    remaining,
    limit,
    resetTime,
    severity = "ok"
}: RateLimitIndicatorProps) {
    const percentage = (remaining / limit) * 100
    
    const getColor = () => {
        if (severity === "critical") return "bg-red-100 text-red-800 border-red-200"
        if (severity === "warning") return "bg-yellow-100 text-yellow-800 border-yellow-200"
        return "bg-green-100 text-green-800 border-green-200"
    }

    const getProgressColor = () => {
        if (severity === "critical") return "bg-red-500"
        if (severity === "warning") return "bg-yellow-500"
        return "bg-green-500"
    }

    const getIcon = () => {
        if (severity === "critical") return <AlertCircle className="w-4 h-4" />
        return <Zap className="w-4 h-4" />
    }

    const getStatus = () => {
        if (severity === "critical") return "Critical"
        if (severity === "warning") return "Warning"
        return "OK"
    }

    const resetTimeStr = resetTime ? new Date(resetTime).toLocaleTimeString() : null

    return (
        <div className={`rounded-lg border p-4 ${getColor()}`}>
            <div className="flex items-center gap-2 mb-2">
                {getIcon()}
                <span className="font-semibold text-sm">API Rate Limit</span>
                <span className="ml-auto text-xs font-bold">{getStatus()}</span>
            </div>

            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium">{remaining} / {limit} remaining</span>
                    <span className="text-xs font-medium">{percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full ${getProgressColor()} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {resetTimeStr && (
                <p className="text-xs opacity-75">Resets at {resetTimeStr}</p>
            )}
        </div>
    )
}
