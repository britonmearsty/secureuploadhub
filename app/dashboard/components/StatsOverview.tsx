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
  disablePolling?: boolean
}

export default function StatsOverview({ initialStats, onStatsUpdate, disablePolling = false }: StatsOverviewProps) {
  const [stats, setStats] = useState<Stats>(initialStats || {
    totalPortals: 0,
    activePortals: 0,
    totalUploads: 0,
    recentUploads: 0
  })
  const [loading, setLoading] = useState(!initialStats)

  useEffect(() => {
    if (disablePolling) return;

    // Initial fetch if needed
    if (!initialStats) {
      fetchStats()
    }

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [disablePolling, initialStats]) // Add dependencies

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
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Active Portals",
      value: stats.activePortals,
      icon: Activity,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Files Received",
      value: stats.totalUploads,
      icon: Inbox,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Recent Activity",
      value: stats.recentUploads,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-label="Loading statistics">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted border border-border rounded-3xl animate-pulse" role="status" />
        ))}
      </div>
    )
  }

  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="group relative bg-card rounded-2xl border border-border p-6 hover:border-muted-foreground hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} bg-opacity-50`} aria-hidden="true">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground mt-1 order-2">
                  {card.title}
                </dt>
                <dd className="text-3xl font-bold text-foreground tracking-tighter tabular-nums order-1">
                  {card.value}
                </dd>
              </div>
            </div>
          </motion.div>
        )
      })}
    </dl>
  )
}
