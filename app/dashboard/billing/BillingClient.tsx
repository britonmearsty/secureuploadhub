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
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"

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
    const [checkingStatus, setCheckingStatus] = useState(false)

    // Modal states
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: "",
        message: ""
    })
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    })

    const currentPlan = subscription?.plan || fallbackPlan

    // Function to check subscription status
    const checkSubscriptionStatus = async () => {
        if (!subscription || subscription.status === 'active') return

        setCheckingStatus(true)
        try {
            const response = await fetch('/api/billing/subscription/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.updated) {
                    setBanner({ type: "success", message: data.message })
                    // Refresh the page to show updated subscription
                    setTimeout(() => window.location.reload(), 1000)
                } else {
                    setBanner({ type: "info", message: data.message })
                }
            }
        } catch (error) {
            console.error('Error checking subscription status:', error)
        } finally {
            setCheckingStatus(false)
        }
    }

    // Function to recover subscription
    const handleRecoverSubscription = async (paymentReference?: string) => {
        if (!subscription) return

        setCheckingStatus(true)
        try {
            const response = await fetch('/api/billing/subscription/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: subscription.id,
                    paymentReference
                })
            })

            const data = await response.json()

            if (response.ok && data.recovery.success) {
                setBanner({ type: "success", message: data.recovery.message })
                // Refresh the page to show updated subscription
                setTimeout(() => window.location.reload(), 1000)
            } else {
                setBanner({ type: "error", message: data.recovery?.message || data.error || "Recovery failed" })
            }
        } catch (error) {
            console.error('Error recovering subscription:', error)
            setBanner({ type: "error", message: "Failed to recover subscription" })
        } finally {
            setCheckingStatus(false)
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const status = params.get("status") || params.get("status_code")
        const reference = params.get("reference")

        if (status === "success") {
            setBanner({ type: "success", message: "Payment successful. Your subscription is active." })
            // Check subscription status after successful payment
            setTimeout(checkSubscriptionStatus, 2000)
        } else if (status === "failed") {
            setBanner({ type: "error", message: "Payment failed. Please try again." })
        } else if (status === "processing") {
            setBanner({ type: "info", message: "Payment is processing. Refresh after a moment to see updates." })
            // Check status periodically for processing payments
            setTimeout(checkSubscriptionStatus, 5000)
        }

        // Auto-check status if subscription is incomplete
        if (subscription?.status === 'incomplete') {
            setTimeout(checkSubscriptionStatus, 3000)
        }

        if (status || reference) {
            params.delete("status")
            params.delete("status_code")
            params.delete("reference")
            const next = params.toString()
            const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
            window.history.replaceState({}, "", url)
        }
    }, [subscription?.status])

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

            if (response.ok) {
                if (data.paymentLink) {
                    // Redirect to payment page
                    window.location.href = data.paymentLink
                } else {
                    // Subscription activated immediately, reload page
                    window.location.reload()
                }
            } else {
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || "Failed to create subscription")
                setErrorModal({
                    isOpen: true,
                    title: "Subscription Error",
                    message: errorMessage
                })
            }
        } catch (error) {
            console.error("Error subscribing:", error)
            setErrorModal({
                isOpen: true,
                title: "Subscription Error",
                message: "Failed to create subscription"
            })
        } finally {
            setSubscribing(null)
        }
    }

    const handleCancelSubscription = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Cancel Subscription",
            message: "Are you sure you want to cancel? Your plan remains active until the end of the period.",
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, isOpen: false })
                setCanceling(true)
                try {
                    const response = await fetch("/api/billing/subscription", { method: "DELETE" })
                    if (response.ok) {
                        window.location.reload()
                    } else {
                        const data = await response.json()
                        setErrorModal({
                            isOpen: true,
                            title: "Cancellation Error",
                            message: data.error || "Failed to cancel"
                        })
                    }
                } catch (error) {
                    setErrorModal({
                        isOpen: true,
                        title: "Cancellation Error",
                        message: "Failed to cancel subscription"
                    })
                } finally {
                    setCanceling(false)
                }
            }
        })
    }

    const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null)

    const handleDownloadInvoice = async (paymentId: string) => {
        setDownloadingInvoice(paymentId)
        try {
            const response = await fetch(`/api/billing/invoices/${paymentId}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `invoice-${paymentId}.pdf`
                document.body.appendChild(a)
                a.click()
                a.remove()
            } else {
                setErrorModal({
                    isOpen: true,
                    title: "Download Error",
                    message: "Failed to download invoice."
                })
            }
        } catch (error) {
            console.error("Error downloading invoice:", error)
            setErrorModal({
                isOpen: true,
                title: "Download Error",
                message: "Failed to download invoice."
            })
        } finally {
            setDownloadingInvoice(null)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Billing</h1>
                <p className="text-muted-foreground mt-1 text-lg">Manage your subscription, invoices, and usage.</p>
            </div>

            {banner && (
                <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${banner.type === "success"
                    ? "bg-success/10 border-success/20 text-success"
                    : banner.type === "error"
                        ? "bg-destructive/10 border-destructive/20 text-destructive"
                        : "bg-muted border-border text-muted-foreground"
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
                                        ? "bg-card shadow-sm border border-border text-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                    {isActive && (
                                        <motion.div layoutId="billing-active" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/30">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {tabs.find(t => t.id === activeTab)?.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-8">
                                    {/* OVERVIEW TAB */}
                                    {activeTab === "overview" && (
                                        <div className="space-y-8">
                                            {/* Subscription Info */}
                                            <div className="relative overflow-hidden rounded-2xl bg-muted border-2 border-border p-8">
                                                <div className="relative z-10">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div>
                                                            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Current Plan</p>
                                                            <h3 className="text-3xl font-bold text-foreground mb-2">
                                                                {currentPlan.name}
                                                            </h3>
                                                            <p className="text-muted-foreground text-lg">
                                                                {`${currentPlan.currency} ${currentPlan.price}/month`}
                                                            </p>
                                                        </div>

                                                        {subscription && (
                                                            <div className="flex flex-col items-start md:items-end gap-2">
                                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${subscription.status === 'active' ? 'bg-success/20 text-success' : subscription.status === 'incomplete' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'
                                                                    }`}>
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    {subscription.status}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                                    <Clock className="w-4 h-4" />
                                                                    Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                                                </div>
                                                                {subscription.status === 'incomplete' && (
                                                                    <button
                                                                        onClick={checkSubscriptionStatus}
                                                                        disabled={checkingStatus}
                                                                        className="text-xs px-2 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded transition-colors disabled:opacity-50"
                                                                    >
                                                                        {checkingStatus ? "Checking..." : "Check Status"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {subscription && !subscription.cancelAtPeriodEnd && (
                                                        <div className="mt-8 flex gap-4">
                                                            <button
                                                                onClick={handleCancelSubscription}
                                                                disabled={canceling}
                                                                className="px-6 py-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-lg text-sm font-medium transition-colors"
                                                            >
                                                                {canceling ? "Processing..." : "Cancel Subscription"}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {subscription?.cancelAtPeriodEnd && (
                                                        <div className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-3">
                                                            <AlertCircle className="w-5 h-5 text-warning" />
                                                            <p className="text-sm text-warning">
                                                                Your plan will be downgraded on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {subscription && (subscription.status === 'incomplete' || subscription.payments.some(p => p.status === 'pending' || p.status === 'processing')) && (
                                                        <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                                                            <AlertCircle className="w-5 h-5 text-primary" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-foreground mb-2">
                                                                    {subscription.status === 'incomplete'
                                                                        ? "Your subscription is being processed. If you've completed payment, it should activate shortly."
                                                                        : "You have a pending payment being processed. Click below to check its status."}
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={checkSubscriptionStatus}
                                                                        disabled={checkingStatus}
                                                                        className="text-xs px-3 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded transition-colors disabled:opacity-50"
                                                                    >
                                                                        {checkingStatus ? "Checking..." : "Check Status Now"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const paymentRef = prompt("If you have a payment reference from Paystack, enter it here to help recover your subscription:")
                                                                            if (paymentRef) {
                                                                                handleRecoverSubscription(paymentRef)
                                                                            } else {
                                                                                handleRecoverSubscription()
                                                                            }
                                                                        }}
                                                                        disabled={checkingStatus}
                                                                        className="text-xs px-3 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors disabled:opacity-50"
                                                                    >
                                                                        Recover Subscription
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Decorative Gradient */}
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50" />
                                            </div>

                                            {/* Usage Section */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                                                    <h3 className="text-lg font-semibold text-foreground">Current Usage</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {[
                                                        { label: "Portals", used: initialUsage.portals, max: currentPlan.maxPortals, unit: "" },
                                                        { label: "Storage", used: initialUsage.storageMB, max: currentPlan.maxStorageGB * 1024, unit: "MB" },
                                                        { label: "Uploads", used: initialUsage.uploads, max: currentPlan.maxUploadsMonth, unit: "" },
                                                    ].map((stat) => {
                                                        const percent = Math.min((stat.used / stat.max) * 100, 100)
                                                        return (
                                                            <div key={stat.label} className="p-4 rounded-2xl bg-muted border border-border">
                                                                <div className="flex justify-between items-end mb-2">
                                                                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                                                                    <span className="text-sm font-bold text-foreground">
                                                                        {stat.used}{stat.unit} / {stat.max}{stat.unit}
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${percent}%` }}
                                                                        className={`h-full ${percent > 90 ? 'bg-destructive' : 'bg-primary'}`}
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
                                                const isCurrent = subscription?.plan.id === plan.id || (subscription === null && plan.id === "free")
                                                const isFreePlan = plan.id === "free"
                                                return (
                                                    <div
                                                        key={plan.id}
                                                        className={`flex flex-col p-6 rounded-2xl border-2 transition-all duration-200 ${isCurrent
                                                            ? "border-primary bg-muted ring-4 ring-primary/5 relative"
                                                            : "border-border bg-card hover:border-muted-foreground"
                                                            }`}
                                                    >
                                                        {isCurrent && (
                                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                                                Current Plan
                                                            </div>
                                                        )}
                                                        <div className="mb-6">
                                                            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                                                            <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                                                        </div>
                                                        <div className="mb-8">
                                                            <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                                                            <span className="text-muted-foreground text-sm ml-1">/mo</span>
                                                        </div>
                                                        <ul className="space-y-4 mb-8 flex-1">
                                                            {plan.features.map((feature, i) => (
                                                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <button
                                                            onClick={() => handleSubscribe(plan.id)}
                                                            disabled={isCurrent || subscribing === plan.id || isFreePlan}
                                                            className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isCurrent || isFreePlan
                                                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm active:scale-95"
                                                                }`}
                                                        >
                                                            {subscribing === plan.id ? (
                                                                <Clock className="w-4 h-4 animate-spin" />
                                                            ) : isCurrent ? (
                                                                "Current Plan"
                                                            ) : isFreePlan ? (
                                                                "Free Plan"
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
                                                        <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                                                            <th className="pb-4 pt-1">Date</th>
                                                            <th className="pb-4 pt-1">Amount</th>
                                                            <th className="pb-4 pt-1">Status</th>
                                                            <th className="pb-4 pt-1 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {subscription.payments.map((p) => (
                                                            <tr key={p.id} className="group hover:bg-muted/50 transition-colors">
                                                                <td className="py-4 text-sm text-muted-foreground">
                                                                    {new Date(p.createdAt).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-4 text-sm font-semibold text-foreground">
                                                                    {p.currency} {p.amount.toFixed(2)}
                                                                </td>
                                                                <td className="py-4">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.status === 'succeeded' ? 'bg-success/20 text-success' :
                                                                        p.status === 'pending' ? 'bg-warning/20 text-warning' :
                                                                            'bg-destructive/20 text-destructive'
                                                                        }`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-right">
                                                                    <button
                                                                        onClick={() => handleDownloadInvoice(p.id)}
                                                                        disabled={downloadingInvoice === p.id}
                                                                        className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                                                    >
                                                                        {downloadingInvoice === p.id ? "Downloading..." : "Download PDF"}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <div className="p-4 bg-muted rounded-full mb-4">
                                                        <History className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                    <h4 className="text-foreground font-semibold">No billing history</h4>
                                                    <p className="text-muted-foreground text-sm mt-1">Your past payments will appear here.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Error Modal */}
                <ConfirmationModal
                    isOpen={errorModal.isOpen}
                    onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                    onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
                    title={errorModal.title}
                    message={errorModal.message}
                    confirmText="OK"
                    variant="danger"
                />

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Yes, Cancel"
                    cancelText="Keep Subscription"
                    variant="warning"
                    loading={canceling}
                />
            </div>
        </div>
    )
}
