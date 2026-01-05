"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, FolderOpen, Settings, Cloud, ArrowRight } from "lucide-react"

const quickActions = [
  {
    title: "New Portal",
    href: "/dashboard/portals/new",
    icon: Plus,
    color: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
    hoverShadow: "hover:shadow-emerald-500/10"
  },
  {
    title: "All Portals",
    href: "/dashboard/portals",
    icon: FolderOpen,
    color: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
    hoverShadow: "hover:shadow-blue-500/10"
  },
  {
    title: "Integrations",
    href: "/dashboard/integrations",
    icon: Cloud,
    color: "text-violet-600 dark:text-violet-400",
    hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
    hoverShadow: "hover:shadow-violet-500/10"
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-500/10"
  }
]

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map((action, index) => {
        const Icon = action.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Link
              href={action.href}
              className={`group flex flex-col gap-3 p-4 bg-card rounded-2xl border border-border ${action.hoverBorder} hover:shadow-lg ${action.hoverShadow} transition-all duration-300`}
            >
              <div className={`${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">
                  {action.title}
                </span>
                <ArrowRight className={`w-4 h-4 ${action.color} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300`} />
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
