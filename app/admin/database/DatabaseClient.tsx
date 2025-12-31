"use client"

import { useState } from "react"
import { Database, AlertCircle, CheckCircle, Clock, Download, RefreshCw } from "lucide-react"
import {
    Breadcrumbs,
    Tooltip,
    TooltipIcon,
    TableSkeleton,
    EmptyState,
    ErrorAlert,
    ConfirmationModal,
    SuccessAlert,
} from "@/components/admin/UXComponents"

interface Migration {
    name: string
    status: "pending" | "completed" | "failed"
    executedAt?: Date
}

interface BackupInfo {
    id: string
    timestamp: Date
    size: number
    status: "success" | "failed" | "in-progress"
    downloadUrl?: string
}

interface DatabaseHealthMetrics {
    status: "healthy" | "warning" | "critical"
    connections: number
    maxConnections: number
    tableCount: number
    indexCount: number
    totalSize: number
    queryLatency: number
    replicationLag?: number
}

interface DatabaseData {
    migrations: Migration[]
    backups: BackupInfo[]
    health: DatabaseHealthMetrics
    lastBackup?: Date
}

const TOOLTIPS: Record<string, string> = {
    queryLatency: "Average time for database queries. Lower is better.",
    replicationLag: "Delay between primary and replica databases. Critical for data consistency.",
    connectionPool: "Number of active connections vs maximum available connections.",
    tableCount: "Total number of tables in the database.",
    indexCount: "Number of database indexes for query optimization.",
}

export default function DatabaseClient({ data }: { data: DatabaseData }) {
    const [dbData, setDbData] = useState(data)
    const [backingUp, setBackingUp] = useState(false)
    const [showBackupConfirm, setShowBackupConfirm] = useState(false)
    const [backupError, setBackupError] = useState<string | null>(null)
    const [backupSuccess, setBackupSuccess] = useState(false)

    const triggerBackup = async () => {
        setBackingUp(true)
        setBackupError(null)
        setBackupSuccess(false)
        try {
            const res = await fetch("/api/admin/database/backup", {
                method: "POST",
            })
            if (res.ok) {
                const newBackup = await res.json()
                setDbData({
                    ...dbData,
                    backups: [newBackup, ...dbData.backups],
                    lastBackup: newBackup.timestamp,
                })
                setShowBackupConfirm(false)
                setBackupSuccess(true)
                setTimeout(() => setBackupSuccess(false), 5000)
            } else {
                setBackupError("Failed to start backup. Please try again.")
            }
        } catch (error) {
            console.error("Failed to trigger backup:", error)
            setBackupError("An error occurred while starting the backup.")
        } finally {
            setBackingUp(false)
        }
    }

    const getHealthColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "bg-green-100 text-green-700 border-green-200"
            case "warning":
                return "bg-yellow-100 text-yellow-700 border-yellow-200"
            case "critical":
                return "bg-red-100 text-red-700 border-red-200"
            default:
                return "bg-slate-100 text-slate-700"
        }
    }

    const getHealthIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle className="w-6 h-6" />
            case "warning":
                return <AlertCircle className="w-6 h-6" />
            case "critical":
                return <AlertCircle className="w-6 h-6" />
            default:
                return <Database className="w-6 h-6" />
        }
    }

    const getBackupStatusColor = (status: string) => {
        switch (status) {
            case "success":
                return "bg-green-100 text-green-700"
            case "failed":
                return "bg-red-100 text-red-700"
            case "in-progress":
                return "bg-yellow-100 text-yellow-700"
            default:
                return "bg-slate-100 text-slate-700"
        }
    }

    return (
        <div className="p-8">
            <Breadcrumbs
                items={[
                    { label: "Admin", href: "/admin" },
                    { label: "Database Management" },
                ]}
            />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Database Management</h1>
                <p className="text-slate-600 mt-1">Monitor health, backups, and migrations</p>
            </div>

            {backupError && (
                <ErrorAlert
                    title="Backup Error"
                    description={backupError}
                    onRetry={() => {
                        setBackupError(null)
                        triggerBackup()
                    }}
                    onDismiss={() => setBackupError(null)}
                />
            )}

            {backupSuccess && (
                <SuccessAlert
                    title="Backup Started"
                    description="Database backup is being prepared. You'll be notified when it's complete."
                    onDismiss={() => setBackupSuccess(false)}
                />
            )}

            {/* Health Status Card */}
            <div
                className={`rounded-xl border p-6 mb-8 ${getHealthColor(
                    dbData.health.status
                )}`}
            >
                <div className="flex items-start gap-4">
                    <div>{getHealthIcon(dbData.health.status)}</div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold capitalize">
                            Database Status: {dbData.health.status}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                                <p className="text-sm opacity-75">Connections</p>
                                <p className="text-lg font-bold">
                                    {dbData.health.connections}/{dbData.health.maxConnections}
                                </p>
                            </div>
                            <div>
                                <Tooltip id="queryLatency" tooltips={TOOLTIPS}>
                                    <div className="flex items-center gap-1 cursor-help">
                                        <p className="text-sm opacity-75">Query Latency</p>
                                        <TooltipIcon />
                                    </div>
                                </Tooltip>
                                <p className="text-lg font-bold">{dbData.health.queryLatency}ms</p>
                            </div>
                            <div>
                                <p className="text-sm opacity-75">Total Size</p>
                                <p className="text-lg font-bold">
                                    {(dbData.health.totalSize / 1024 / 1024 / 1024).toFixed(2)}GB
                                </p>
                            </div>
                            {dbData.health.replicationLag !== undefined && (
                                <div>
                                    <Tooltip id="replicationLag" tooltips={TOOLTIPS}>
                                        <div className="flex items-center gap-1 cursor-help">
                                            <p className="text-sm opacity-75">Replication Lag</p>
                                            <TooltipIcon />
                                        </div>
                                    </Tooltip>
                                    <p className="text-lg font-bold">{dbData.health.replicationLag}ms</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Database Objects */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Database Objects</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <Tooltip id="tableCount" tooltips={TOOLTIPS}>
                                <span className="text-slate-600 flex items-center gap-1 cursor-help">
                                    Tables
                                    <TooltipIcon />
                                </span>
                            </Tooltip>
                            <span className="text-lg font-bold text-slate-900">
                                {dbData.health.tableCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <Tooltip id="indexCount" tooltips={TOOLTIPS}>
                                <span className="text-slate-600 flex items-center gap-1 cursor-help">
                                    Indexes
                                    <TooltipIcon />
                                </span>
                            </Tooltip>
                            <span className="text-lg font-bold text-slate-900">
                                {dbData.health.indexCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <Tooltip id="connectionPool" tooltips={TOOLTIPS}>
                                <span className="text-slate-600 flex items-center gap-1 cursor-help">
                                    Connection Pool
                                    <TooltipIcon />
                                </span>
                            </Tooltip>
                            <div>
                                <div className="w-48 bg-slate-200 rounded-full h-2 mb-1">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{
                                            width: `${(dbData.health.connections /
                                                    dbData.health.maxConnections) *
                                                100
                                                }%`,
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">
                                    {dbData.health.connections}/{dbData.health.maxConnections}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Last Backup */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Backup Status</h2>
                        <button
                            onClick={() => setShowBackupConfirm(true)}
                            disabled={backingUp}
                            className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${backingUp ? "animate-spin" : ""}`} />
                            {backingUp ? "Backing up..." : "Backup Now"}
                        </button>
                    </div>
                    {dbData.lastBackup ? (
                        <div className="space-y-3">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-700">
                                    <CheckCircle className="w-4 h-4 inline mr-2" />
                                    Last backup successful
                                </p>
                            </div>
                            <div className="text-sm">
                                <p className="text-slate-600">
                                    {new Date(dbData.lastBackup).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-600 text-sm">No backups yet</p>
                        </div>
                    )}
                </div>
            </div>

            {showBackupConfirm && (
                <ConfirmationModal
                    title="Start Database Backup"
                    description="This will create a snapshot of your database. The process may take a few minutes depending on database size."
                    confirmLabel="Start Backup"
                    onConfirm={triggerBackup}
                    onCancel={() => setShowBackupConfirm(false)}
                    isLoading={backingUp}
                />
            )}

            {/* Backups History */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Backup History</h2>
                {dbData.backups.length > 0 ? (
                    <div className="space-y-2">
                        {dbData.backups.map((backup) => (
                            <div
                                key={backup.id}
                                className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-slate-900">
                                            {new Date(backup.timestamp).toLocaleString()}
                                        </p>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${getBackupStatusColor(
                                                backup.status
                                            )}`}
                                        >
                                            {backup.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Size: {(backup.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                {backup.downloadUrl && backup.status === "success" && (
                                    <a
                                        href={backup.downloadUrl}
                                        download
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Download className="w-4 h-4 text-slate-600" />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={<Clock className="w-8 h-8 text-slate-400 mx-auto" />}
                        title="No Backups Yet"
                        description="Create your first backup to protect your data."
                        action={{
                            label: "Create Backup",
                            onClick: () => setShowBackupConfirm(true),
                        }}
                    />
                )}
            </div>

            {/* Migrations */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Pending Migrations</h2>
                {dbData.migrations.length > 0 ? (
                    <div className="space-y-2">
                        {dbData.migrations.map((migration) => (
                            <div
                                key={migration.name}
                                className="p-4 border border-slate-200 rounded-lg flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{migration.name}</p>
                                    {migration.executedAt && (
                                        <p className="text-xs text-slate-500">
                                            Executed: {new Date(migration.executedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {migration.status === "completed" && (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    )}
                                    {migration.status === "pending" && (
                                        <Clock className="w-5 h-5 text-yellow-600" />
                                    )}
                                    {migration.status === "failed" && (
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                    )}
                                    <span className="text-xs font-medium capitalize text-slate-600">
                                        {migration.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={<CheckCircle className="w-8 h-8 text-green-500 mx-auto" />}
                        title="All Migrations Applied"
                        description="Your database schema is up to date."
                    />
                )}
            </div>
        </div>
    )
}
