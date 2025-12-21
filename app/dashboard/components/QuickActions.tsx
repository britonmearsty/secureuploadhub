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
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-slate-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                className="group relative block p-5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${action.bg} ${action.accent} transition-colors`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
