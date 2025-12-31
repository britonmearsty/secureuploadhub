"use client"

import { Clock, Loader } from "lucide-react"
import { useEffect, useState } from "react"

interface CacheIndicatorProps {
    lastUpdated: Date
    isLoading?: boolean
    onRefresh?: () => Promise<void>
}

export default function CacheIndicator({ lastUpdated, isLoading = false, onRefresh }: CacheIndicatorProps) {
    const [timeAgo, setTimeAgo] = useState("")
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        const updateTimeAgo = () => {
            const now = new Date()
            const diffMs = now.getTime() - lastUpdated.getTime()
            const diffSecs = Math.floor(diffMs / 1000)
            const diffMins = Math.floor(diffSecs / 60)
            const diffHours = Math.floor(diffMins / 60)
            const diffDays = Math.floor(diffHours / 24)

            if (diffSecs < 60) {
                setTimeAgo("just now")
            } else if (diffMins < 60) {
                setTimeAgo(`${diffMins}m ago`)
            } else if (diffHours < 24) {
                setTimeAgo(`${diffHours}h ago`)
            } else {
                setTimeAgo(`${diffDays}d ago`)
            }
        }

        updateTimeAgo()
        const interval = setInterval(updateTimeAgo, 30000) // Update every 30 seconds

        return () => clearInterval(interval)
    }, [lastUpdated])

    const handleRefresh = async () => {
        if (onRefresh && !isRefreshing) {
            setIsRefreshing(true)
            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
            }
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">
                {isLoading || isRefreshing ? (
                    <span className="flex items-center gap-1">
                        <Loader className="w-3 h-3 animate-spin" />
                        Updating...
                    </span>
                ) : (
                    <>Updated {timeAgo}</>
                )}
            </span>
            {onRefresh && (
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoading}
                    className="text-xs px-2 py-0.5 rounded-full hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition-colors"
                >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
            )}
        </div>
    )
}
