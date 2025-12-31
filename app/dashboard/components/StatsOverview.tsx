"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FolderOpen, Upload, Users, Activity, BarChart3, TrendingUp, Inbox, Target } from "lucide-react"

interface Stats {
  totalPortals: number
  activePortals: number
  totalUploads: number
  recentUploads: number
}

interface StatsOverviewProps {
  initialStats?: Stats
  onStatsUpdate?: (stats: Stats) => void
}

export default function StatsOverview({ initialStats, onStatsUpdate }: StatsOverviewProps) {
  const [stats, setStats] = useState<Stats>(initialStats || {
    totalPortals: 0,
    activePortals: 0,
    totalUploads: 0,
    recentUploads: 0
  })
  const [loading, setLoading] = useState(!initialStats)

  useEffect(() => {
    if (!initialStats) {
      fetchStats()
      const interval = setInterval(fetchStats, 30000)
      return () => clearInterval(interval)
    }
  }, [initialStats])

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats)
      setLoading(false)
    }
  }, [initialStats])

  async function fetchStats() {
    try {
      const res = await fetch("/api/dashboard")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        onStatsUpdate?.(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Portals",
      value: stats.totalPortals,
      icon: FolderOpen,
      color: "text-blue-500",
      bg: "bg-blue-50",
      trend: "+2 this month"
    },
    {
      title: "Active Today",
      value: stats.activePortals,
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      trend: "All systems live"
    },
    {
      title: "Total Uploads",
      value: stats.totalUploads,
      icon: Inbox,
      color: "text-purple-500",
      bg: "bg-purple-50",
      trend: "Lifetime volume"
    },
    {
      title: "Weekly Growth",
      value: stats.recentUploads,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-50",
      trend: "Recent activity"
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${card.bg} ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${card.bg} ${card.color.replace('text-', 'text-')}`}>
                {card.trend}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{card.value}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mt-1">
                {card.title}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
