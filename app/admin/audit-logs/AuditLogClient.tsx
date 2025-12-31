"use client"

import AuditLog from "../components/AuditLog"

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
}

interface AuditLogClientProps {
    logs: AuditLogEntry[]
}

export default function AuditLogClient({ logs }: AuditLogClientProps) {
    const handleFilterChange = (filtered: AuditLogEntry[]) => {
        // Can be used for analytics or further processing
        console.log(`Filtered to ${filtered.length} logs`)
    }

    return (
        <AuditLog
            logs={logs}
            onFilterChange={handleFilterChange}
        />
    )
}
