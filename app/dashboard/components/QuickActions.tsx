"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, FolderOpen, Settings, Cloud, Zap, ArrowUpRight } from "lucide-react"

const quickActions = [
  {
    title: "Create Portal",
    description: "Set up a new branding destination",
    href: "/dashboard/portals/new",
    icon: Plus,
    accent: "text-blue-500",
    bg: "bg-blue-50"
  },
  {
    title: "View Portals",
    description: "Manage your existing portals",
    href: "/dashboard/portals",
    icon: FolderOpen,
    accent: "text-purple-500",
    bg: "bg-purple-50"
  },
  {
    title: "Integrations",
    description: "Connect cloud storage accounts",
    href: "/dashboard/integrations",
    icon: Cloud,
    accent: "text-emerald-500",
    bg: "bg-emerald-50"
  },
  {
    title: "Settings",
    description: "Configure your account",
    href: "/dashboard/settings",
    icon: Settings,
    accent: "text-slate-500",
    bg: "bg-slate-50"
  }
]

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {quickActions.map((action, index) => {
        const Icon = action.icon
        return (
          <motion.div
            key={index}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href={action.href}
              className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 opacity-30 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.bg} ${action.accent} mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                {action.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {action.description}
              </p>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
