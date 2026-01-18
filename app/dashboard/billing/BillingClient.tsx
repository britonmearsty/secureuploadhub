"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CreditCard,
    History,
    Zap,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    TrendingUp,
    Clock,
    ArrowUpRight,
    Bug,
    ChevronRight,
    DollarSign,
    BarChart3,
    Download
} from "lucide-react"
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"
import { ToastComponent } from "@/components/ui/Toast"

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
    const [subscribing, setSubscribing] = useState<string | null>(null)
    const [canceling, setCanceling] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(false)
    const [debugInfo, setDebugInfo] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("overview")

    // Toast notification state
    const [toast, setToast] = useState<{
        isOpen: boolean;
        type: 'error' | 'success' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    })

    const showToast = (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
        setToast({
            isOpen: true,
            type,
            title,
            message
        })
    }

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
    const isFreePlan = !subscription

    const tabs = [
        { id: "overview", name: "Overview", icon: BarChart3, description: "Current plan and usage statistics" },
        { id: "plans", name: "Plans", icon: Zap, description: "Available subscription plans" },
        { id: "history", name: "History", icon: History, description: "Billing history and invoices" },
    ]

    const checkSubscriptionStatus = async (reference?: string, retryCount = 0, maxRetries = 10) => {
        if (!subscription || (subscription.status === 'active' && !reference)) return

        setCheckingStatus(true)
        try {
            // Add timeout protection - max 30 seconds of polling
            if (retryCount >= maxRetries) {
                showToast("error", "Verification Timeout", "Payment verification timed out. Please refresh the page or contact support if the issue persists.")
                setCheckingStatus(false)
                return
            }

            const response = await fetch('/api/billing/subscription/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference, retryCount })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.updated) {
                    showToast("success", "Success", "Subscription activated! Refreshing...")
                    setTimeout(() => window.location.reload(), 1500)
                    return
                } else if (data.alreadyActive) {
                    showToast("success", "Already Active", "Subscription is already active! Refreshing...")
                    setTimeout(() => window.location.reload(), 1500)
                    return
                } else if (reference && retryCount < maxRetries) {
                    // Progressive delay: 2s, 3s, 4s, then 5s intervals
                    const delay = Math.min(2000 + (retryCount * 1000), 5000)
                    showToast("info", "Verifying", `Verifying payment... (${retryCount + 1}/${maxRetries})`)
                    setTimeout(() => checkSubscriptionStatus(reference, retryCount + 1, maxRetries), delay)
                } else if (!reference) {
                    showToast("info", "Status Checked", "Status checked. No changes found yet.")
                    setCheckingStatus(false)
                } else {
                    showToast("error", "Verification Failed", "Payment verification timed out. Please refresh the page or contact support.")
                    setCheckingStatus(false)
                }
            } else {
                throw new Error('Failed to check status')
            }
        } catch (error) {
            console.error('Error checking status:', error)
            if (reference && retryCount < 3) {
                const delay = Math.min(5000 + (retryCount * 2000), 10000) // 5s, 7s, 9s
                showToast("info", "Retrying", `Connection error, retrying... (${retryCount + 1}/3)`)
                setTimeout(() => checkSubscriptionStatus(reference, retryCount + 1, maxRetries), delay)
            } else {
                showToast("error", "Connection Error", "Unable to verify payment status. Please refresh the page.")
                setCheckingStatus(false)
            }
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const status = params.get("status")
        const reference = params.get("reference") || params.get("trxref")

        if (status === "success") {
            showToast("success", "Payment Successful", "Payment successful. Verifying subscription...")
            checkSubscriptionStatus(reference || undefined)
        } else if (status === "failed") {
            showToast("error", "Payment Failed", "Payment failed. Please try again.")
        }

        if (status) {
            window.history.replaceState({}, "", window.location.pathname)
        }
    }, [])

    const testPaystackConnection = async () => {
        try {
            const response = await fetch('/api/billing/test-paystack')
            const data = await response.json()
            setDebugInfo(data)
            
            if (response.ok) {
                showToast("info", "Paystack Test", `Paystack test: ${data.paystack.initialized ? 'Working' : 'Failed'}`)
            } else {
                showToast("error", "Test Failed", `Paystack test failed: ${data.details}`)
            }
        } catch (error) {
            showToast("error", "Connection Error", "Failed to test Paystack connection")
        }
    }

    const handleSubscribe = async (planId: string) => {
        setSubscribing(planId)
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            if (subscribing === planId) {
                setErrorModal({
                    isOpen: true,
                    title: "Request Timeout",
                    message: "The request is taking longer than expected. Please try again or contact support if the issue persists."
                })
                setSubscribing(null)
            }
        }, 30000) // 30 second timeout

        try {
            const response = await fetch("/api/billing/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId })
            })

            const data = await response.json()

            if (response.ok) {
                clearTimeout(timeoutId)
                if (data.paymentLink) {
                    // Store the subscription ID for tracking
                    if (data.subscription?.id) {
                        sessionStorage.setItem('pendingSubscriptionId', data.subscription.id)
                    }
                    window.location.href = data.paymentLink
                } else if (data.message === "Resuming existing subscription setup") {
                    // Handle resuming existing setup
                    showToast("info", "Resuming Setup", "Resuming your previous subscription setup...")
                    if (data.paymentLink) {
                        window.location.href = data.paymentLink
                    } else {
                        window.location.reload()
                    }
                } else {
                    window.location.reload()
                }
            } else {
                clearTimeout(timeoutId)
                setErrorModal({
                    isOpen: true,
                    title: "Subscription Error",
                    message: data.error || "Failed to start subscription. Please try again."
                })
            }
        } catch (error) {
            clearTimeout(timeoutId)
            console.error('Subscription error:', error)
            setErrorModal({
                isOpen: true,
                title: "Connection Error",
                message: "Unable to connect to our servers. Please check your internet connection and try again."
            })
        } finally {
            setSubscribing(null)
        }
    }

    const handleCancelSubscription = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Cancel Subscription",
            message: "Are you sure you want to cancel? You will keep access until the end of your billing period.",
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, isOpen: false })
                setCanceling(true)
                try {
                    const response = await fetch("/api/billing/subscription", { method: "DELETE" })
                    if (response.ok) {
                        window.location.reload()
                    } else {
                        throw new Error("Failed to cancel")
                    }
                } catch (error) {
                    setErrorModal({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to cancel subscription"
                    })
                } finally {
                    setCanceling(false)
                }
            }
        })
    }

    const handleDownloadInvoice = async (paymentId: string) => {
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
                throw new Error("Download failed")
            }
        } catch (error) {
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Could not download invoice"
            })
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Billing & Plans</h1>
                <p className="text-muted-foreground mt-1 text-lg">Manage your subscription and monitor usage across all plans.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
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
                                        <motion.div
                                            layoutId="billing-active-indicator"
                                            className="ml-auto"
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "overview" && (
                                <div className="space-y-8">
                                    {/* Current Plan Card */}
                                    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                        <div className="p-6 border-b border-border bg-muted/30">
                                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                                <CreditCard className="w-5 h-5" />
                                                Current Plan
                                            </h2>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Your active subscription and usage details
                                            </p>
                                        </div>

                                        <div className="p-8">
                                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                                                <div>
                                                    <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                                                    <p className="text-muted-foreground">
                                                        {currentPlan.price > 0
                                                            ? `${currentPlan.currency} ${currentPlan.price}/month`
                                                            : 'Free Plan'}
                                                    </p>
                                                </div>

                                                {subscription ? (
                                                    <div className="text-right">
                                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {subscription.status}
                                                        </div>
                                                        {subscription.cancelAtPeriodEnd && (
                                                            <p className="text-xs text-red-600 mt-2">Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                                                        )}
                                                        {!subscription.cancelAtPeriodEnd && (
                                                            <p className="text-xs text-muted-foreground mt-2">Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-700">
                                                        Free Tier
                                                    </div>
                                                )}
                                            </div>

                                            {/* Interactive Actions */}
                                            {subscription && !subscription.cancelAtPeriodEnd && (
                                                <div className="mb-8">
                                                    <button
                                                        onClick={handleCancelSubscription}
                                                        disabled={canceling}
                                                        className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium"
                                                    >
                                                        {canceling ? "Processing..." : "Cancel Subscription"}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Usage Stats */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">Portals</p>
                                                    <p className="font-bold">{initialUsage.portals} / {currentPlan.maxPortals}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">Storage</p>
                                                    <p className="font-bold">{initialUsage.storageMB}MB / {currentPlan.maxStorageGB * 1024}MB</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">Uploads</p>
                                                    <p className="font-bold">{initialUsage.uploads} / {currentPlan.maxUploadsMonth}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "plans" && (
                                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                    <div className="p-6 border-b border-border bg-muted/30">
                                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                            <Zap className="w-5 h-5" />
                                            Available Plans
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Choose the plan that best fits your needs
                                        </p>
                                    </div>

                                    <div className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {plans.map((plan) => {
                                                const isCurrent = subscription?.plan.id === plan.id || (!subscription && plan.id === 'free')
                                                return (
                                                    <div key={plan.id} className={`p-6 rounded-xl border flex flex-col ${isCurrent ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-background'}`}>
                                                        <div className="mb-4">
                                                            <h3 className="font-bold text-lg">{plan.name}</h3>
                                                            <p className="text-2xl font-bold mt-2">${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                                                        </div>
                                                        <ul className="space-y-3 mb-8 flex-1">
                                                            {plan.features.map((feature, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <button
                                                            onClick={() => handleSubscribe(plan.id)}
                                                            disabled={isCurrent || !!subscribing}
                                                            className={`w-full py-2 px-4 rounded-lg font-bold text-sm transition-colors ${isCurrent
                                                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                                }`}
                                                        >
                                                            {subscribing === plan.id ? 'Processing...' : isCurrent ? 'Current Plan' : 'Upgrade'}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "history" && (
                                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                    <div className="p-6 border-b border-border bg-muted/30">
                                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                            <History className="w-5 h-5" />
                                            Billing History
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            View your payment history and download invoices
                                        </p>
                                    </div>

                                    <div className="p-8">
                                        {subscription && subscription.payments.length > 0 ? (
                                            <div className="overflow-hidden rounded-xl border border-border">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-muted">
                                                        <tr>
                                                            <th className="p-4 font-medium text-muted-foreground">Date</th>
                                                            <th className="p-4 font-medium text-muted-foreground">Amount</th>
                                                            <th className="p-4 font-medium text-muted-foreground">Status</th>
                                                            <th className="p-4 font-medium text-muted-foreground text-right">Invoice</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {subscription.payments.map((payment) => (
                                                            <tr key={payment.id}>
                                                                <td className="p-4">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                                                <td className="p-4">{payment.currency} {payment.amount.toFixed(2)}</td>
                                                                <td className="p-4 capitalize">{payment.status}</td>
                                                                <td className="p-4 text-right">
                                                                    <button
                                                                        onClick={() => handleDownloadInvoice(payment.id)}
                                                                        className="flex items-center gap-1 text-primary hover:underline font-medium text-sm ml-auto"
                                                                    >
                                                                        <Download className="w-3 h-3" />
                                                                        Download
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-foreground mb-2">No billing history</h3>
                                                <p className="text-muted-foreground">
                                                    {subscription ? "No payments have been processed yet." : "Subscribe to a plan to see your billing history here."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
                title={errorModal.title}
                message={errorModal.message}
                variant="danger"
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="warning"
                loading={canceling}
            />

            {/* Toast Notification */}
            <ToastComponent
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
                type={toast.type}
                title={toast.title}
                message={toast.message}
            />

            {/* Debug Info */}
            {debugInfo && (
                <div className="mt-8 p-4 bg-muted rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">Debug Information</h3>
                        <button
                            onClick={testPaystackConnection}
                            className="text-xs px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded border border-primary/20 transition-colors"
                        >
                            Test Paystack
                        </button>
                    </div>
                    <pre className="text-xs overflow-auto bg-background p-3 rounded border">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}
