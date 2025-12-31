"use client"

import { useState, useEffect } from "react"
import {
    Search,
    X,
    Eye,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react"

interface Log {
    id: string
    action: string
    resource: string
    userId: string | null
    userName: string | null
    details: string | null
    status: string
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
}

interface LogsClientProps {
    logs: Log[]
}

const ACTIONS = ["USER_CREATED", "USER_DELETED", "USER_UPDATED", "PORTAL_CREATED", "PORTAL_DELETED", "PLAN_CREATED", "PLAN_DELETED", "LOGIN_FAILED", "LOGIN_SUCCESS"]
const RESOURCES = ["User", "Portal", "Plan", "Billing", "Admin", "Auth"]

export default function LogsClient({ logs: initialLogs }: LogsClientProps) {
    const [logs, setLogs] = useState<Log[]>(initialLogs)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedLog, setSelectedLog] = useState<Log | null>(null)
    const [actionFilter, setActionFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [resourceFilter, setResourceFilter] = useState("")
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        fetchLogs()
    }, [page, actionFilter, statusFilter, resourceFilter])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append("page", page.toString())
            params.append("limit", "20")
            if (actionFilter) params.append("action", actionFilter)
            if (statusFilter) params.append("status", statusFilter)
            if (resourceFilter) params.append("resource", resourceFilter)

            const res = await fetch(`/api/admin/logs?${params}`)
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs)
                setTotal(data.total)
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log =>
        log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ipAddress?.includes(searchQuery)
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case "success":
                return "bg-green-100 text-green-700"
            case "failed":
                return "bg-red-100 text-red-700"
            case "warning":
                return "bg-yellow-100 text-yellow-700"
            default:
                return "bg-slate-100 text-slate-700"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "success":
                return <CheckCircle className="w-4 h-4" />
            case "failed":
                return <AlertCircle className="w-4 h-4" />
            default:
                return <Clock className="w-4 h-4" />
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">System Logs</h1>
                <p className="text-slate-600 mt-1">View audit trail and system activity logs</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>

                <select
                    value={actionFilter}
                    onChange={(e) => {
                        setActionFilter(e.target.value)
                        setPage(1)
                    }}
                    className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                    <option value="">All Actions</option>
                    {ACTIONS.map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </select>

                <select
                    value={resourceFilter}
                    onChange={(e) => {
                        setResourceFilter(e.target.value)
                        setPage(1)
                    }}
                    className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                    <option value="">All Resources</option>
                    {RESOURCES.map(resource => (
                        <option key={resource} value={resource}>{resource}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setPage(1)
                    }}
                    className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                    <option value="">All Status</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="warning">Warning</option>
                </select>
            </div>

            {/* Logs Table */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-500">Loading logs...</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Resource
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-900">{log.action}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600">{log.resource}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{log.userName || "System"}</p>
                                                    <p className="text-sm text-slate-500">{log.ipAddress}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                                                    {getStatusIcon(log.status)}
                                                    {log.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {log.details && (
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="View details"
                                                    >
                                                        <Eye className="w-4 h-4 text-slate-400" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} logs
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * 20 >= total}
                                    className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && filteredLogs.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No logs found</p>
                </div>
            )}

            {/* Log Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Log Details</h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Action</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedLog.action}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Resource</p>
                                    <p className="text-lg font-bold text-slate-900">{selectedLog.resource}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">User</p>
                                    <p className="text-sm font-medium text-slate-900">{selectedLog.userName || "System"}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Status</p>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedLog.status)}`}>
                                        {getStatusIcon(selectedLog.status)}
                                        {selectedLog.status}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Timestamp</p>
                                <p className="text-sm text-slate-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                            </div>

                            {selectedLog.ipAddress && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">IP Address</p>
                                    <p className="text-sm font-mono text-slate-900">{selectedLog.ipAddress}</p>
                                </div>
                            )}

                            {selectedLog.userAgent && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">User Agent</p>
                                    <p className="text-xs text-slate-600 break-words">{selectedLog.userAgent}</p>
                                </div>
                            )}

                            {selectedLog.details && (
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Details</p>
                                    <pre className="text-xs text-slate-600 break-words whitespace-pre-wrap font-mono">
                                        {selectedLog.details}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
