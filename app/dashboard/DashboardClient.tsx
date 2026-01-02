"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import StatsOverview from "./components/StatsOverview"
import QuickActions from "./components/QuickActions"
import PortalList from "./components/PortalList"
import RecentUploads from "./components/RecentUploads"
import PostHogIdentify from "./components/PostHogIdentify"
import {
    ArrowUpRight,
    Plus,
    ArrowRight
} from "lucide-react"
import Link from "next/link"

interface DashboardClientProps {
    user: any
    stats: any
    portals: any[]
    uploads: any[]
}

export default function DashboardClient({ user, stats: initialStats, portals: initialPortals, uploads: initialUploads }: DashboardClientProps) {
    const [greeting, setGreeting] = useState("Good afternoon");
    const [stats, setStats] = useState(initialStats);
    const [portals, setPortals] = useState(initialPortals);
    const [uploads, setUploads] = useState(initialUploads);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch("/api/dashboard");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                    setPortals(data.portals);
                    setUploads(data.uploads);
                }
            } catch (error) {
                console.error("Error polling dashboard data:", error);
            }
        };

        const interval = setInterval(fetchDashboardData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* PostHog User Identification */}
            <PostHogIdentify
                userId={user.id!}
                email={user.email}
                name={user.name}
            />

            {/* Header Section */}
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
                        {greeting}, {user.name?.split(" ")[0]}
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg">
                        Manage your secure file collection and track client uploads in real-time.
                    </p>
                </div>

                <nav className="flex items-center gap-3" aria-label="Primary Actions">
                    <Link
                        href="/dashboard/portals/new"
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 active:scale-95 font-bold text-sm"
                        aria-label="Create a new secure portal"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        Create Portal
                    </Link>
                </nav>
            </header>

            {/* Stats Grid */}
            <section aria-label="Dashboard Statistics">
                <StatsOverview initialStats={stats} disablePolling={true} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left Column: Active Portals (Main Focus) */}
                <section className="lg:col-span-2 flex flex-col gap-6" aria-labelledby="active-portals-heading">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 id="active-portals-heading" className="text-lg font-bold text-foreground">Active Client Portals</h2>
                        </div>
                        <Link
                            href="/dashboard/portals"
                            className="group flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="View all portals"
                        >
                            View All Portals
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                        </Link>
                    </div>

                    <PortalList
                        initialPortals={portals.slice(0, 4)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        disablePolling={true}
                    />

                    {portals.length > 4 && (
                        <Link
                            href="/dashboard/portals"
                            className="flex items-center justify-center py-4 bg-card rounded-2xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-sm font-bold"
                            aria-label={`View ${portals.length - 4} more active portals`}
                        >
                            View {portals.length - 4} more portals
                        </Link>
                    )}
                </section>

                {/* Right Column: Quick Actions & Activity */}
                <aside className="lg:col-span-1 flex flex-col gap-8">
                    <nav className="space-y-4" aria-labelledby="quick-actions-heading">
                        <h2 id="quick-actions-heading" className="text-sm font-bold text-foreground px-1">Quick Actions</h2>
                        <QuickActions />
                    </nav>

                    <section className="space-y-4" aria-labelledby="recent-activity-heading">
                        <div className="flex items-center justify-between px-1">
                            <h2 id="recent-activity-heading" className="text-sm font-bold text-foreground">Recent Activity</h2>
                            <Link
                                href="/dashboard/assets"
                                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="View all file activity"
                            >
                                View All
                            </Link>
                        </div>
                        <RecentUploads uploads={uploads} />
                    </section>
                </aside>
            </div>
        </main>
    )
}
