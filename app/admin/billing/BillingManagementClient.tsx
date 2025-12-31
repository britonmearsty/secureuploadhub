"use client"

import { useState, useEffect } from "react"
import {
    Search,
    Plus,
    Eye,
    Trash2,
    X,
    Edit2,
    DollarSign,
    Users,
    TrendingUp,
} from "lucide-react"

interface Plan {
    id: string
    name: string
    description: string | null
    price: number
    features: string[]
    maxPortals: number
    maxStorageGB: number
    maxUploadsMonth: number
    isActive: boolean
    _count: {
        subscriptions: number
    }
}

interface PlanDetails extends Plan {
    subscriptions: Array<{
        id: string
        status: string
        user: { id: string; name: string | null; email: string }
    }>
}

interface Subscription {
    id: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    user: { id: string; name: string | null; email: string }
    plan: { name: string; price: number }
}

interface Payment {
    id: string
    amount: number
    status: string
    createdAt: Date
    user: { id: string; name: string | null; email: string }
    subscription: { id: string; plan: { name: string } } | null
}

interface BillingManagementClientProps {
    plans: Plan[]
}

type Tab = "plans" | "subscriptions" | "payments"

export default function BillingManagementClient({
    plans: initialPlans,
}: BillingManagementClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("plans")
    const [plans, setPlans] = useState<Plan[]>(initialPlans)
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null)
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [subscriptionStatus, setSubscriptionStatus] = useState<string>("")
    const [paymentStatus, setPaymentStatus] = useState<string>("")

    const [newPlan, setNewPlan] = useState({
        name: "",
        description: "",
        price: 0,
        maxPortals: 1,
        maxStorageGB: 10,
        maxUploadsMonth: 1000,
        features: [""] as string[]
    })

    useEffect(() => {
        if (activeTab === "subscriptions") {
            fetchSubscriptions()
        } else if (activeTab === "payments") {
            fetchPayments()
        }
    }, [activeTab, subscriptionStatus, paymentStatus])

    const fetchSubscriptions = async () => {
        setLoading(true)
        try {
            const query = subscriptionStatus ? `?status=${subscriptionStatus}` : ""
            const res = await fetch(`/api/admin/billing/subscriptions${query}`)
            if (res.ok) {
                const data = await res.json()
                setSubscriptions(data.subscriptions)
            }
        } catch (error) {
            console.error("Failed to fetch subscriptions:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const query = paymentStatus ? `?status=${paymentStatus}` : ""
            const res = await fetch(`/api/admin/billing/payments${query}`)
            if (res.ok) {
                const data = await res.json()
                setPayments(data.payments)
            }
        } catch (error) {
            console.error("Failed to fetch payments:", error)
        } finally {
            setLoading(false)
        }
    }

    const viewPlanDetails = async (planId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/billing/plans/${planId}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedPlan(data)
            }
        } catch (error) {
            console.error("Failed to fetch plan details:", error)
        } finally {
            setLoading(false)
        }
    }

    const createPlan = async () => {
        if (!newPlan.name || newPlan.price < 0) {
            alert("Please fill in required fields")
            return
        }

        try {
            const res = await fetch("/api/admin/billing/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newPlan,
                    features: newPlan.features.filter(f => f.trim())
                })
            })

            if (res.ok) {
                const data = await res.json()
                setPlans([data, ...plans])
                setNewPlan({
                    name: "",
                    description: "",
                    price: 0,
                    maxPortals: 1,
                    maxStorageGB: 10,
                    maxUploadsMonth: 1000,
                    features: [""]
                })
                setShowCreateForm(false)
            }
        } catch (error) {
            console.error("Failed to create plan:", error)
        }
    }

    const updatePlan = async () => {
        if (!editingPlan) return

        try {
            const res = await fetch(`/api/admin/billing/plans/${editingPlan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editingPlan.name,
                    description: editingPlan.description,
                    price: editingPlan.price,
                    maxPortals: editingPlan.maxPortals,
                    maxStorageGB: editingPlan.maxStorageGB,
                    maxUploadsMonth: editingPlan.maxUploadsMonth,
                    features: editingPlan.features
                })
            })

            if (res.ok) {
                const data = await res.json()
                setPlans(plans.map(p => (p.id === data.id ? data : p)))
                setSelectedPlan(null)
                setEditingPlan(null)
            }
        } catch (error) {
            console.error("Failed to update plan:", error)
        }
    }

    const deletePlan = async (planId: string) => {
        try {
            const res = await fetch(`/api/admin/billing/plans/${planId}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setPlans(plans.filter(p => p.id !== planId))
                setSelectedPlan(null)
                setDeleteConfirm(null)
            }
        } catch (error) {
            console.error("Failed to delete plan:", error)
        }
    }

    const filteredPlans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.plan.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredPayments = payments.filter(payment =>
        payment.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Billing Management</h1>
                <p className="text-slate-600 mt-1">Manage subscriptions, invoices, and payments</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-200">
                {(["plans", "subscriptions", "payments"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === tab
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                    >
                        {tab === "plans" && "Billing Plans"}
                        {tab === "subscriptions" && "Subscriptions"}
                        {tab === "payments" && "Payments"}
                    </button>
                ))}
            </div>

            {/* PLANS TAB */}
            {activeTab === "plans" && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search plans..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors ml-4"
                        >
                            <Plus className="w-4 h-4" />
                            New Plan
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlans.map(plan => (
                            <div key={plan.id} className="bg-white border border-slate-200 rounded-xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                        <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${plan.isActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-slate-100 text-slate-600"
                                        }`}>
                                        {plan.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>

                                <div className="mb-4 pb-4 border-b border-slate-200">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                                        <span className="text-slate-500">/month</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 text-sm text-slate-600">
                                    <p>Max Portals: <span className="font-semibold">{plan.maxPortals}</span></p>
                                    <p>Storage: <span className="font-semibold">{plan.maxStorageGB}GB</span></p>
                                    <p>Uploads/Month: <span className="font-semibold">{plan.maxUploadsMonth}</span></p>
                                    <p className="pt-2">Subscribers: <span className="font-semibold text-slate-900">{plan._count.subscriptions}</span></p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => viewPlanDetails(plan.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(plan.id)}
                                        className="flex-1 py-2 px-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredPlans.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No plans found</p>
                        </div>
                    )}
                </div>
            )}

            {/* SUBSCRIPTIONS TAB */}
            {activeTab === "subscriptions" && (
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search subscriptions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                        <select
                            value={subscriptionStatus}
                            onChange={(e) => setSubscriptionStatus(e.target.value)}
                            className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Loading...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Plan</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Period</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredSubscriptions.map(sub => (
                                            <tr key={sub.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{sub.user.name}</p>
                                                        <p className="text-sm text-slate-500">{sub.user.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-900 font-medium">{sub.plan.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${sub.status === "active"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                        }`}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {new Date(sub.currentPeriodStart).toLocaleDateString()} - {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && filteredSubscriptions.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No subscriptions found</p>
                        </div>
                    )}
                </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && (
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search payments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                        <select
                            value={paymentStatus}
                            onChange={(e) => setPaymentStatus(e.target.value)}
                            className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Loading...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Plan</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredPayments.map(payment => (
                                                <tr key={payment.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{payment.user.name}</p>
                                                            <p className="text-sm text-slate-500">{payment.user.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-slate-900">${payment.amount.toFixed(2)}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {payment.subscription?.plan.name || "N/A"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${payment.status === "completed"
                                                            ? "bg-green-100 text-green-700"
                                                            : payment.status === "pending"
                                                                ? "bg-yellow-100 text-yellow-700"
                                                                : "bg-red-100 text-red-700"
                                                            }`}>
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {new Date(payment.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {!loading && filteredPayments.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No payments found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Plan Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Create New Plan</h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Plan Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Pro"
                                    value={newPlan.name}
                                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Description</label>
                                <textarea
                                    placeholder="Plan description..."
                                    value={newPlan.description}
                                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Price (USD/month) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newPlan.price}
                                    onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">Max Portals</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newPlan.maxPortals}
                                        onChange={(e) => setNewPlan({ ...newPlan, maxPortals: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">Storage (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newPlan.maxStorageGB}
                                        onChange={(e) => setNewPlan({ ...newPlan, maxStorageGB: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">Uploads/Mo</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newPlan.maxUploadsMonth}
                                        onChange={(e) => setNewPlan({ ...newPlan, maxUploadsMonth: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Features</label>
                                <div className="space-y-2">
                                    {newPlan.features.map((feature, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            placeholder="Feature..."
                                            value={feature}
                                            onChange={(e) => {
                                                const newFeatures = [...newPlan.features]
                                                newFeatures[idx] = e.target.value
                                                setNewPlan({ ...newPlan, features: newFeatures })
                                            }}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    ))}
                                    <button
                                        onClick={() => setNewPlan({ ...newPlan, features: [...newPlan.features, ""] })}
                                        className="text-sm text-slate-600 hover:text-slate-900"
                                    >
                                        + Add Feature
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPlan}
                                className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                Create Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Details Modal */}
            {selectedPlan && !editingPlan && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                            <h2 className="text-2xl font-bold text-slate-900">{selectedPlan.name}</h2>
                            <button
                                onClick={() => setSelectedPlan(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-slate-900">${selectedPlan.price}</span>
                                    <span className="text-slate-500">/month</span>
                                </div>
                            </div>

                            {selectedPlan.description && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm font-semibold text-slate-900 mb-2">Description</p>
                                    <p className="text-sm text-slate-600">{selectedPlan.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Portals</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">{selectedPlan.maxPortals}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Storage</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">{selectedPlan.maxStorageGB}GB</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Uploads/Mo</p>
                                    <p className="text-lg font-bold text-slate-900 mt-1">{selectedPlan.maxUploadsMonth}</p>
                                </div>
                            </div>

                            {selectedPlan.features.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-3">Features</h4>
                                    <ul className="space-y-2">
                                        {selectedPlan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-slate-600">
                                                <span className="w-2 h-2 bg-slate-900 rounded-full"></span>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedPlan.subscriptions.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-3">Active Subscriptions ({selectedPlan.subscriptions.length})</h4>
                                    <div className="space-y-2">
                                        {selectedPlan.subscriptions.map(sub => (
                                            <div key={sub.id} className="p-3 bg-slate-50 rounded-lg">
                                                <p className="font-medium text-slate-900">{sub.user.name}</p>
                                                <p className="text-sm text-slate-500">{sub.user.email}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => setEditingPlan(selectedPlan)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Plan
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(selectedPlan.id)}
                                    className="flex-1 py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                                >
                                    Delete Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Plan?</h3>
                        <p className="text-slate-600 mb-6">
                            This action cannot be undone. Existing subscriptions won't be affected.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deletePlan(deleteConfirm)}
                                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
