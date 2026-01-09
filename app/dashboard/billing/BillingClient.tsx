"use client"

import { useEffect, useState } from "react"
import {
    CreditCard,
    History,
    Zap,
    CheckCircle2,
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
    const [subscribing, setSubscribing] = useState<string | null>(null)
    const [canceling, setCanceling] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error" | "info", text: string } | null>(null)

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

    const checkSubscriptionStatus = async (reference?: string, retryCount = 0) => {
        if (!subscription || (subscription.status === 'active' && !reference)) return

        setCheckingStatus(true)
        try {
            const response = await fetch('/api/billing/subscription/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.updated) {
                    setMessage({ type: "success", text: "Subscription activated! Refreshing..." })
                    setTimeout(() => window.location.reload(), 1500)
                } else if (reference && retryCount < 5) {
                    // If we have a reference but it's not updated yet, poll again
                    setMessage({
                        type: "info",
                        text: `Payment verified. Still waiting for subscription activation (attempt ${retryCount + 1}/5)...`
                    })
                    setTimeout(() => checkSubscriptionStatus(reference, retryCount + 1), 3000)
                } else if (!reference) {
                    setMessage({ type: "info", text: "Status checked. No changes found yet." })
                } else {
                    setMessage({
                        type: "error",
                        text: "Verification is taking longer than usual. Please refresh the page in a moment."
                    })
                }
            } else {
                throw new Error('Failed to check status')
            }
        } catch (error) {
            console.error('Error checking status:', error)
            if (reference && retryCount < 3) {
                setTimeout(() => checkSubscriptionStatus(reference, retryCount + 1), 5000)
            }
        } finally {
            if (retryCount >= 5 || !reference) {
                setCheckingStatus(false)
            }
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const status = params.get("status")
        const reference = params.get("reference") || params.get("trxref")

        if (status === "success") {
            setMessage({ type: "success", text: "Payment successful. Verifying subscription..." })
            checkSubscriptionStatus(reference || undefined)
        } else if (status === "failed") {
            setMessage({ type: "error", text: "Payment failed. Please try again." })
        }

        if (status) {
            window.history.replaceState({}, "", window.location.pathname)
        }
    }, [])

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
                    window.location.href = data.paymentLink
                } else {
                    window.location.reload()
                }
            } else {
                setErrorModal({
                    isOpen: true,
                    title: "Error",
                    message: data.error || "Failed to start subscription"
                })
            }
        } catch (error) {
            setErrorModal({
                isOpen: true,
                title: "Error",
                message: "Something went wrong. Please try again."
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
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Billing & Plans</h1>
                <p className="text-muted-foreground">Manage your subscription and usage</p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' :
                    message.type === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-10">
                {/* 1. CURRENT SUBSCRIPTION & USAGE */}
                <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Current Plan
                    </h2>
                    <div className="bg-card rounded-xl border p-6">
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
                </section>

                {/* 2. AVAILABLE PLANS */}
                <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Available Plans
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = subscription?.plan.id === plan.id || (!subscription && plan.id === 'free')
                            return (
                                <div key={plan.id} className={`p-6 rounded-xl border flex flex-col ${isCurrent ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-card'}`}>
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
                </section>

                {/* 3. BILLING HISTORY */}
                {subscription && subscription.payments.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Billing History
                        </h2>
                        <div className="bg-card rounded-xl border overflow-hidden">
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
                                                    className="text-primary hover:underline font-medium"
                                                >
                                                    Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

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
        </div>
    )
}
