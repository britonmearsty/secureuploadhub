"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, FolderOpen, Settings, Cloud, ArrowRight } from "lucide-react"

const quickActions = [
  {
    title: "New Portal",
    href: "/dashboard/portals/new",
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "group-hover:border-blue-200 dark:group-hover:border-blue-800"
  },
  {
    title: "All Portals",
    href: "/dashboard/portals",
    icon: FolderOpen,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "group-hover:border-purple-200 dark:group-hover:border-purple-800"
  },
  {
    title: "Integrations",
    href: "/dashboard/integrations",
    icon: Cloud,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "group-hover:border-emerald-200 dark:group-hover:border-emerald-800"
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "group-hover:border-border"
  }
]

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map((action, index) => {
        const Icon = action.icon
        return (
          <Link
            key={index}
            href={action.href}
            className={`group flex flex-col gap-3 p-4 bg-card rounded-2xl border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:border-muted-foreground`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl ${action.bg} ${action.color} transition-colors`}>
                <Icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:-rotate-45 transition-all duration-300" />
            </div>

            <span className="font-bold text-muted-foreground text-sm group-hover:text-foreground transition-colors">
              {action.title}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
