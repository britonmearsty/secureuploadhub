import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AuditLogClient from "./AuditLogClient"

export const dynamic = "force-dynamic"

export default async function AuditLogsPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    // Fetch all system logs for the last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const logs = await prisma.systemLog.findMany({
        where: {
            createdAt: {
                gte: ninetyDaysAgo
            }
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 1000
    })

    // Transform logs for component
    const auditLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        userName: log.userName || undefined,
        userEmail: log.userId ? undefined : "System",
        status: (log.status || "pending") as "success" | "error" | "pending",
        ipAddress: log.ipAddress || undefined,
        details: log.details || undefined,
        timestamp: log.createdAt
    }))

    // Get statistics
    const successCount = auditLogs.filter(l => l.status === "success").length
    const errorCount = auditLogs.filter(l => l.status === "error").length
    const pendingCount = auditLogs.filter(l => l.status === "pending").length

    const stats = {
        total: auditLogs.length,
        success: successCount,
        error: errorCount,
        pending: pendingCount,
        successRate: auditLogs.length > 0 
            ? ((successCount / auditLogs.length) * 100).toFixed(1)
            : "0"
    }

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
                <p className="text-slate-500 mt-1">Track all admin actions and system events for compliance</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Total Events</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-400 mt-1">Last 90 days</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Successful</p>
                    <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats.successRate}% success rate</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                    <p className="text-xs text-slate-400 mt-1">Requires attention</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-slate-400 mt-1">In progress</p>
                </div>
            </div>

            {/* Audit Log Component */}
            <AuditLogClient logs={auditLogs} />
        </div>
    )
}
