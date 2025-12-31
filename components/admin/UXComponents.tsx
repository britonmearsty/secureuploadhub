"use client"

import { ReactNode } from "react"
import { ChevronRight, Info, AlertCircle, CheckCircle, X } from "lucide-react"

// ============================================================================
// BREADCRUMBS
// ============================================================================

interface BreadcrumbItem {
    label: string
    href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <div className="flex items-center gap-2 mb-6 text-sm">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    {item.href ? (
                        <a href={item.href} className="text-blue-600 hover:text-blue-700 font-medium">
                            {item.label}
                        </a>
                    ) : (
                        <span className="text-slate-600">{item.label}</span>
                    )}
                    {idx < items.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
            ))}
        </div>
    )
}

// ============================================================================
// TOOLTIPS
// ============================================================================

interface TooltipProps {
    id: string
    children: ReactNode
    tooltips: Record<string, string>
}

export function Tooltip({ id, children, tooltips }: TooltipProps) {
    return (
        <div className="relative inline-block group">
            {children}
            {tooltips[id] && (
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {tooltips[id]}
                </div>
            )}
        </div>
    )
}

export function TooltipIcon() {
    return <Info className="w-4 h-4 opacity-50" />
}

// ============================================================================
// LOADING STATES
// ============================================================================

export function SkeletonLoader({ className = "" }: { className?: string }) {
    return <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between">
                        <SkeletonLoader className="h-4 w-1/3" />
                        <SkeletonLoader className="h-4 w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function CardSkeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
            <SkeletonLoader className="h-6 w-1/3 mb-4" />
            <div className="space-y-3">
                <SkeletonLoader className="h-4 w-full" />
                <SkeletonLoader className="h-4 w-5/6" />
                <SkeletonLoader className="h-4 w-4/6" />
            </div>
        </div>
    )
}

// ============================================================================
// EMPTY STATES
// ============================================================================

interface EmptyStateProps {
    icon: ReactNode
    title: string
    description: string
    action?: {
        label: string
        onClick: () => void
    }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            <div className="flex justify-center mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            <p className="text-slate-600 text-sm mb-4">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    {action.label}
                </button>
            )}
        </div>
    )
}

// ============================================================================
// ERROR STATES
// ============================================================================

interface ErrorAlertProps {
    title: string
    description: string
    onRetry?: () => void
    onDismiss?: () => void
}

export function ErrorAlert({ title, description, onRetry, onDismiss }: ErrorAlertProps) {
    return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-red-900">{title}</h3>
                    <p className="text-red-700 text-sm mt-1">{description}</p>
                    <div className="flex gap-2 mt-3">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="text-sm font-medium text-red-700 hover:text-red-800 underline"
                            >
                                Try Again
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="text-sm font-medium text-red-700 hover:text-red-800 underline"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// CONFIRMATION MODALS
// ============================================================================

interface ConfirmationModalProps {
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    isLoading?: boolean
    isDangerous?: boolean
    onConfirm: () => void | Promise<void>
    onCancel: () => void
}

export function ConfirmationModal({
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isLoading = false,
    isDangerous = false,
    onConfirm,
    onCancel,
}: ConfirmationModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl max-w-sm w-full mx-4 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
                <p className="text-slate-600 text-sm mb-6">{description}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${
                            isDangerous
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                        } disabled:opacity-50`}
                    >
                        {isLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// SUCCESS ALERT
// ============================================================================

interface SuccessAlertProps {
    title: string
    description?: string
    onDismiss?: () => void
}

export function SuccessAlert({ title, description, onDismiss }: SuccessAlertProps) {
    return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-green-900">{title}</h3>
                    {description && <p className="text-green-700 text-sm mt-1">{description}</p>}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-green-600 hover:text-green-700 flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    )
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizeClass = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    }[size]

    return (
        <div className={`animate-spin border-2 border-slate-300 border-t-blue-600 rounded-full ${sizeClass}`} />
    )
}
