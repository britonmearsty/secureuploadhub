"use client"

import { motion } from "framer-motion"
import StatsOverview from "./components/StatsOverview"
import QuickActions from "./components/QuickActions"
import PortalList from "./components/PortalList"
import RecentUploads from "./components/RecentUploads"
import PostHogIdentify from "./components/PostHogIdentify"
import {
    Plus,
    FolderOpen,
    ArrowRight,
    Sparkles,
    Zap,
    Inbox
} from "lucide-react"
import Link from "next/link"

interface DashboardClientProps {
    user: any
    stats: any
    portals: any[]
    uploads: any[]
}

export default function DashboardClient({ user, stats, portals, uploads }: DashboardClientProps) {
    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {/* PostHog User Identification */}
                <PostHogIdentify
                    userId={user.id!}
                    email={user.email}
                    name={user.name}
                />

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                <span className="material-icons-outlined text-xs">dashboard</span> Overview
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            Hello, {user.name?.split(" ")[0]}
                            <motion.span
                                animate={{ rotate: [0, 20, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                                className="origin-bottom-right text-3xl"
                            >
                                👋
                            </motion.span>
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Your secure upload ecosystem is running smoothly.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/portals/new"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            New Portal
                        </Link>
                        <Link
                            href="/dashboard/billing"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-lg shadow-slate-900/20 text-sm font-medium"
                        >
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            Upgrade Plan
                        </Link>
                    </div>
                </header>

                {/* Stats Grid */}
                <StatsOverview initialStats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Actions & Portals */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {/* Quick Actions Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-400 font-medium">
                                <Zap className="w-5 h-5" />
                                <h2 className="uppercase text-xs tracking-wider">Quick Actions</h2>
                            </div>
                            <QuickActions />
                        </div>

                        {/* Active Portals Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                                    <FolderOpen className="w-5 h-5" />
                                    <h2 className="uppercase text-xs tracking-wider">Active Portals</h2>
                                </div>
                                <Link
                                    href="/dashboard/portals"
                                    className="group flex items-center gap-1.5 text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                                >
                                    Manage All Portals
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>

                            {portals.length > 0 ? (
                                <>
                                    <PortalList
                                        initialPortals={portals}
                                        className="grid grid-cols-1 gap-4"
                                    />
                                </>
                            ) : (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500">
                                        <FolderOpen className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Build your first portal</h3>
                                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                                        Start collecting files from clients with a branded portal. It takes less than a minute.
                                    </p>
                                    <Link
                                        href="/dashboard/portals/new"
                                        className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all hover:scale-105"
                                    >
                                        Create Portal
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Recent Activity */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                <Inbox className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Recent Activity</h2>
                            </div>
                            <RecentUploads uploads={uploads} />
                        </div>
                    </div>
                </div>

                {/* View All Activity Button */}
                <div className="mt-8">
                    <Link
                        href="/dashboard/assets"
                        className="w-full py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        View All Activity
                    </Link>
                </div>
            </div>
        </div>
    )
}
