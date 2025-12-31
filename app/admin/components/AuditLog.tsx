"use client"

import { useState } from "react"
import { Search, Filter, Download } from "lucide-react"
import DateRangeFilter from "./DateRangeFilter"
import ExportButton from "./ExportButton"
import PaginatedList from "./PaginatedList"

interface AuditLogEntry {
    id: string
    action: string
    resource: string
    userName?: string
    userEmail?: string
    status: "success" | "error" | "pending"
    ipAddress?: string
    details?: string
    timestamp: Date
    changes?: {
        before?: Record<string, any>
        after?: Record<string, any>
    }
}

interface AuditLogProps {
    logs: AuditLogEntry[]
    onFilterChange?: (filtered: AuditLogEntry[]) => void
}

export default function AuditLog({ logs, onFilterChange }: AuditLogProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedStatus, setSelectedStatus] = useState<"all" | "success" | "error" | "pending">("all")
    const [selectedAction, setSelectedAction] = useState<"all" | string>("all")
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
        start: null,
        end: null
    })

    // Get unique actions from logs
    const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

    // Filter logs
    const filteredLogs = logs.filter(log => {
        // Search filter
        const searchLower = searchQuery.toLowerCase()
        if (
            !log.action.toLowerCase().includes(searchLower) &&
            !log.resource.toLowerCase().includes(searchLower) &&
            !(log.userName?.toLowerCase().includes(searchLower)) &&
            !(log.userEmail?.toLowerCase().includes(searchLower))
        ) {
            return false
        }

        // Status filter
        if (selectedStatus !== "all" && log.status !== selectedStatus) {
            return false
        }

        // Action filter
        if (selectedAction !== "all" && log.action !== selectedAction) {
            return false
        }

        // Date range filter
        if (dateRange.start && dateRange.end) {
            const logDate = new Date(log.timestamp)
            if (logDate < dateRange.start || logDate > dateRange.end) {
                return false
            }
        }

        return true
    })

    // Notify parent of filter changes
    if (onFilterChange) {
        onFilterChange(filteredLogs)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "success":
                return "bg-green-100 text-green-700"
            case "error":
                return "bg-red-100 text-red-700"
            case "pending":
                return "bg-yellow-100 text-yellow-700"
            default:
                return "bg-slate-100 text-slate-700"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "success":
                return "✓"
            case "error":
                return "✗"
            case "pending":
                return "◐"
            default:
                return "•"
        }
    }

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="pending">Pending</option>
                    </select>

                    {/* Action Filter */}
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                        <option value="all">All Actions</option>
                        {uniqueActions.map((action) => (
                            <option key={action} value={action}>
                                {action}
                            </option>
                        ))}
                    </select>

                    {/* Date Range Filter */}
                    <DateRangeFilter
                        label="Date Range"
                        onFilter={(start, end) => setDateRange({ start, end })}
                    />

                    {/* Export */}
                    <ExportButton
                        data={filteredLogs.map(log => ({
                            timestamp: log.timestamp.toISOString(),
                            action: log.action,
                            resource: log.resource,
                            user: log.userName || log.userEmail || "System",
                            status: log.status,
                            ipAddress: log.ipAddress,
                            details: log.details
                        }))}
                        filename="audit-logs"
                        label="Export"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Audit Logs ({filteredLogs.length})
                </h3>

                <PaginatedList
                    items={filteredLogs}
                    itemsPerPage={10}
                    emptyMessage="No audit logs found"
                    renderItem={(log) => (
                        <div
                            key={log.id}
                            className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-slate-900 text-sm">
                                            {log.action}
                                        </span>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                            {log.resource}
                                        </span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(log.status)}`}>
                                            {getStatusIcon(log.status)} {log.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {log.userName ? `${log.userName} (${log.userEmail})` : log.userEmail || "System"}
                                        {log.ipAddress && ` · IP: ${log.ipAddress}`}
                                    </p>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </div>
                            </div>

                            {log.details && (
                                <p className="text-xs text-slate-600 mt-2 pl-0">
                                    {log.details}
                                </p>
                            )}

                            {log.changes && (
                                <div className="mt-2 text-xs text-slate-500 space-y-1">
                                    {log.changes.before && (
                                        <div className="text-red-600">
                                            Before: {JSON.stringify(log.changes.before)}
                                        </div>
                                    )}
                                    {log.changes.after && (
                                        <div className="text-green-600">
                                            After: {JSON.stringify(log.changes.after)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                />
            </div>
        </div>
    )
}
