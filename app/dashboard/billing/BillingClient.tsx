"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CreditCard,
    History,
    Zap,
    CheckCircle2,
    ChevronRight,
    AlertCircle,
    ShieldCheck,
    TrendingUp,
    Clock,
    ArrowUpRight
} from "lucide-react"

interface BillingPlan {
    id: string
    name: string
    description: string | null
    price: number
    currency: string
    features: string[]
    maxPortals: number
    maxStorageGB: number
    maxUploadsMonth: number
}

interface Subscription {
    id: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    plan: BillingPlan
    payments: Array<{
        id: string
        amount: number
        currency: string
        status: string
        createdAt: Date
    }>
}

interface BillingClientProps {
    plans: BillingPlan[]
    subscription: Subscription | null
    fallbackPlan: BillingPlan
    initialUsage: {
        uploads: number
        storageMB: number
        portals: number
    }
}

export default function BillingClient({ plans, subscription, fallbackPlan, initialUsage }: BillingClientProps) {
    const [activeTab, setActiveTab] = useState("overview")
    const [subscribing, setSubscribing] = useState<string | null>(null)
    const [canceling, setCanceling] = useState(false)
    const [banner, setBanner] = useState<{ type: "success" | "error" | "info", message: string } | null>(null)

    const currentPlan = subscription?.plan || fallbackPlan

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const status = params.get("status") || params.get("status_code")
        const reference = params.get("reference")

        if (status === "success") {
            setBanner({ type: "success", message: "Payment successful. Your subscription is active." })
        } else if (status === "failed") {
            setBanner({ type: "error", message: "Payment failed. Please try again." })
        } else if (status === "processing") {
            setBanner({ type: "info", message: "Payment is processing. Refresh after a moment to see updates." })
        }

        if (status || reference) {
            params.delete("status")
            params.delete("status_code")
            params.delete("reference")
            const next = params.toString()
            const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
            window.history.replaceState({}, "", url)
        }
    }, [])

    const tabs = [
        { id: "overview", name: "Overview", icon: CreditCard, description: "Your current plan and status" },
        { id: "plans", name: "Plans", icon: Zap, description: "Manage your subscription" },
        { id: "history", name: "Billing History", icon: History, description: "View your past payments" },
    ]

    const handleSubscribe = async (planId: string) => {
        setSubscribing(planId)
        try {
            const response = await fetch("/api/billing/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId })
            })

            const data = await response.json()

            if (response.ok && data.paymentLink) {
                window.location.href = data.paymentLink
            } else {
                alert(data.error || "Failed to create subscription")
            }
        } catch (error) {
            console.error("Error subscribing:", error)
            alert("Failed to create subscription")
        } finally {
            setSubscribing(null)
        }
    }

    const handleCancelSubscription = async () => {
        if (!confirm("Are you sure you want to cancel? Your plan remains active until the end of the period.")) {
            return
        }

        setCanceling(true)
        try {
            const response = await fetch("/api/billing/subscription", { method: "DELETE" })
            if (response.ok) {
                window.location.reload()
            } else {
                const data = await response.json()
                alert(data.error || "Failed to cancel")
            }
        } catch (error) {
            alert("Failed to cancel subscription")
        } finally {
            setCanceling(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing</h1>
                <p className="text-slate-500 mt-1 text-lg">Manage your subscription, invoices, and usage.</p>
            </div>

            {banner && (
                <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${banner.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : banner.type === "error"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}>
                    {banner.message}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Nav */}
                <aside className="lg:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? "bg-white shadow-sm border border-slate-200 text-slate-900"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`} />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                    {isActive && (
                                        <motion.div layoutId="billing-active" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </aside>

                {/* content */}
                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-xl font-semibold text-slate-900">
                                        {tabs.find(t => t.id === activeTab)?.name}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-8">
                                    {/* OVERVIEW TAB */}
                                    {activeTab === "overview" && (
                                        <div className="space-y-8">
                                            {/* Subscription Info */}
                                            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white">
                                                <div className="relative z-10">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div>
                                                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Current Plan</p>
                                                            <h3 className="text-3xl font-bold mb-2">
                                                        {currentPlan.name}
                                                            </h3>
                                                            <p className="text-slate-300 text-lg">
                                                        {`${currentPlan.currency} ${currentPlan.price}/month`}
                                                            </p>
                                                        </div>

                                                        {subscription && (
                                                            <div className="flex flex-col items-start md:items-end gap-2">
                                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${subscription.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                                    }`}>
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    {subscription.status}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                                    <Clock className="w-4 h-4" />
                                                                    Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                        {subscription && !subscription.cancelAtPeriodEnd && (
                                                        <div className="mt-8 flex gap-4">
                                                            <button
                                                                onClick={handleCancelSubscription}
                                                                disabled={canceling}
                                                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/10"
                                                            >
                                                                {canceling ? "Processing..." : "Cancel Subscription"}
                                                            </button>
                                                        </div>
                                                    )}

                                                        {subscription?.cancelAtPeriodEnd && (
                                                        <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                                                            <AlertCircle className="w-5 h-5 text-orange-400" />
                                                            <p className="text-sm text-orange-200">
                                                                Your plan will be downgraded on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Decorative Gradient */}
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50" />
                                            </div>

                                            {/* Usage Section */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <TrendingUp className="w-5 h-5 text-slate-900" />
                                                    <h3 className="text-lg font-semibold text-slate-900">Current Usage</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {[
                                                        { label: "Portals", used: initialUsage.portals, max: currentPlan.maxPortals, unit: "" },
                                                        { label: "Storage", used: initialUsage.storageMB, max: currentPlan.maxStorageGB * 1024, unit: "MB" },
                                                        { label: "Uploads", used: initialUsage.uploads, max: currentPlan.maxUploadsMonth, unit: "" },
                                                    ].map((stat) => {
                                                        const percent = Math.min((stat.used / stat.max) * 100, 100)
                                                        return (
                                                            <div key={stat.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                                <div className="flex justify-between items-end mb-2">
                                                                    <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                                                                    <span className="text-sm font-bold text-slate-900">
                                                                        {stat.used}{stat.unit} / {stat.max}{stat.unit}
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${percent}%` }}
                                                                        className={`h-full ${percent > 90 ? 'bg-red-500' : 'bg-slate-900'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* PLANS TAB */}
                                    {activeTab === "plans" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {plans.map((plan) => {
                                                const isCurrent = subscription?.plan.id === plan.id
                                                return (
                                                    <div
                                                        key={plan.id}
                                                        className={`flex flex-col p-6 rounded-2xl border-2 transition-all duration-200 ${isCurrent
                                                                ? "border-slate-900 bg-slate-50 ring-4 ring-slate-900/5 relative"
                                                                : "border-slate-100 bg-white hover:border-slate-200"
                                                            }`}
                                                    >
                                                        {isCurrent && (
                                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                                                Current Plan
                                                            </div>
                                                        )}
                                                        <div className="mb-6">
                                                            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                                            <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                                                        </div>
                                                        <div className="mb-8">
                                                            <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                                                            <span className="text-slate-500 text-sm ml-1">/mo</span>
                                                        </div>
                                                        <ul className="space-y-4 mb-8 flex-1">
                                                            {plan.features.map((feature, i) => (
                                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <button
                                                            onClick={() => handleSubscribe(plan.id)}
                                                            disabled={isCurrent || subscribing === plan.id}
                                                            className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isCurrent
                                                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-95"
                                                                }`}
                                                        >
                                                            {subscribing === plan.id ? (
                                                                <Clock className="w-4 h-4 animate-spin" />
                                                            ) : isCurrent ? (
                                                                "Current Plan"
                                                            ) : (
                                                                <>Upgrade Now <ArrowUpRight className="w-4 h-4" /></>
                                                            )}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* HISTORY TAB */}
                                    {activeTab === "history" && (
                                        <div className="overflow-x-auto">
                                            {subscription && subscription.payments.length > 0 ? (
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                                            <th className="pb-4 pt-1">Date</th>
                                                            <th className="pb-4 pt-1">Amount</th>
                                                            <th className="pb-4 pt-1">Status</th>
                                                            <th className="pb-4 pt-1 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {subscription.payments.map((p) => (
                                                            <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-4 text-sm text-slate-600">
                                                                    {new Date(p.createdAt).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-4 text-sm font-semibold text-slate-900">
                                                                    {p.currency} {p.amount.toFixed(2)}
                                                                </td>
                                                                <td className="py-4">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' :
                                                                            p.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                                                'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-right">
                                                                    <button className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
                                                                        Download PDF
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                                                        <History className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <h4 className="text-slate-900 font-semibold">No billing history</h4>
                                                    <p className="text-slate-500 text-sm mt-1">Your past payments will appear here.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
