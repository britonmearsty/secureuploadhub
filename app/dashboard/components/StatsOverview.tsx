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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="group relative bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300"
          >
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} bg-opacity-50`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.trend && (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {card.trend}
                  </span>
                )}
              </div>

              <div>
                <p className="text-3xl font-bold text-slate-900 tracking-tighter tabular-nums">
                  {card.value}
                </p>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {card.title}
                </p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
