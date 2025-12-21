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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white rounded-3xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all overflow-hidden"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.trend}</span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{card.title}</p>
              </div>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-slate-50 rounded-full blur-2xl group-hover:bg-slate-100 transition-colors" />
          </motion.div>
        )
      })}
    </div>
  )
}
