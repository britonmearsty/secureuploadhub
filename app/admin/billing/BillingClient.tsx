"use client"

import { useState } from "react"
import { CreditCard, Download, Filter, ChevronDown, Eye } from "lucide-react"

interface Payment {
    id: string
    email: string
    amount: number
    status: "pending" | "completed" | "failed" | "refunded"
    method: string
    invoiceUrl?: string
    createdAt: Date
    updatedAt: Date
}

interface Subscription {
    id: string
    email: string
    planName: string
    status: "active" | "cancelled" | "paused"
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelledAt?: Date
}

interface BillingData {
    payments: Payment[]
    subscriptions: Subscription[]
    totalRevenue: number
    activeSubscriptions: number
    paymentStats: {
        completed: number
        pending: number
        failed: number
    }
}

export default function BillingClient({ data }: { data: BillingData }) {
    const [billingData] = useState(data)
    const [statusFilter, setStatusFilter] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

    const filteredPayments = billingData.payments.filter(
        (p) => !statusFilter || p.status === statusFilter
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-700"
            case "pending":
                return "bg-yellow-100 text-yellow-700"
            case "failed":
                return "bg-red-100 text-red-700"
            case "refunded":
                return "bg-slate-100 text-slate-700"
            default:
                return "bg-slate-100 text-slate-700"
        }
    }

    const getSubscriptionStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700"
            case "cancelled":
                return "bg-red-100 text-red-700"
            case "paused":
                return "bg-yellow-100 text-yellow-700"
            default:
                return "bg-slate-100 text-slate-700"
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Billing & Payments</h1>
                <p className="text-slate-600 mt-1">Manage payments, subscriptions, and invoices</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 uppercase tracking-wider">Total Revenue</p>
                            <p className="text-3xl font-bold text-slate-900 mt-2">
                                ${billingData.totalRevenue.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 uppercase tracking-wider">Active Subscriptions</p>
                            <p className="text-3xl font-bold text-slate-900 mt-2">
                                {billingData.activeSubscriptions}
                            </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                            <CreditCard className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div>
                        <p className="text-sm text-slate-500 uppercase tracking-wider mb-3">Payment Status</p>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Completed</span>
                                <span className="text-sm font-bold text-green-600">
                                    {billingData.paymentStats.completed}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Pending</span>
                                <span className="text-sm font-bold text-yellow-600">
                                    {billingData.paymentStats.pending}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Failed</span>
                                <span className="text-sm font-bold text-red-600">
                                    {billingData.paymentStats.failed}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payments Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Payment History</h2>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Filter
                        <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                                showFilters ? "rotate-180" : ""
                            }`}
                        />
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                            <option value="">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                )}

                {/* Payments Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                                    Amount
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                                    Method
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                                    Date
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-900">{payment.email}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                        ${payment.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{payment.method}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                                payment.status
                                            )}`}
                                        >
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(payment.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {payment.invoiceUrl && (
                                                <a
                                                    href={payment.invoiceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Download Invoice"
                                                >
                                                    <Download className="w-4 h-4 text-slate-600" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="View details"
                                            >
                                                <Eye className="w-4 h-4 text-slate-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Subscriptions Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Active Subscriptions</h2>
                <div className="space-y-3">
                    {billingData.subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex-1">
                                <p className="font-medium text-slate-900">{sub.email}</p>
                                <p className="text-sm text-slate-500">{sub.planName} Plan</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {new Date(sub.currentPeriodStart).toLocaleDateString()} -{" "}
                                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            </div>
                            <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${getSubscriptionStatusColor(
                                    sub.status
                                )}`}
                            >
                                {sub.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Details Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Payment Details</h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
                                <p className="text-sm font-medium text-slate-900">{selectedPayment.email}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Amount</p>
                                <p className="text-lg font-bold text-slate-900">
                                    ${selectedPayment.amount.toFixed(2)}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Method</p>
                                    <p className="text-sm font-medium text-slate-900">{selectedPayment.method}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                    <span
                                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                            selectedPayment.status
                                        )}`}
                                    >
                                        {selectedPayment.status}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date</p>
                                <p className="text-sm text-slate-900">
                                    {new Date(selectedPayment.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedPayment(null)}
                            className="w-full mt-6 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
