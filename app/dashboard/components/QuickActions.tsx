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
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
    hoverShadow: "hover:shadow-emerald-500/10",
    label: "Create",
    labelColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
  },
  {
    title: "All Portals",
    href: "/dashboard/portals",
    icon: FolderOpen,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
    hoverShadow: "hover:shadow-blue-500/10",
    label: "Manage",
    labelColor: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
  },
  {
    title: "Integrations",
    href: "/dashboard/integrations",
    icon: Cloud,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-500/20",
    hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
    hoverShadow: "hover:shadow-violet-500/10",
    label: "Connect",
    labelColor: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400"
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/20",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-500/10",
    label: "Configure",
    labelColor: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
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
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${action.bg} ${action.color} transition-colors`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.labelColor}`}>
                  {action.label}
                </span>
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
