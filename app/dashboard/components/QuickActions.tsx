"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, FolderOpen, Settings, Cloud, ArrowRight } from "lucide-react"

const quickActions = [
  {
    title: "New Portal",
    href: "/dashboard/portals/new",
    icon: Plus,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "group-hover:border-blue-200"
  },
  {
    title: "All Portals",
    href: "/dashboard/portals",
    icon: FolderOpen,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "group-hover:border-purple-200"
  },
  {
    title: "Integrations",
    href: "/dashboard/integrations",
    icon: Cloud,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "group-hover:border-emerald-200"
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "group-hover:border-slate-200"
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
            className={`group flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 ${action.border}`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl ${action.bg} ${action.color} transition-colors`}>
                <Icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:-rotate-45 transition-all duration-300" />
            </div>

            <span className="font-bold text-slate-700 text-sm group-hover:text-slate-900 transition-colors">
              {action.title}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
