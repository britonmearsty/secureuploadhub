import AuditLogClient from "./AuditLogClient"
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary"

export default async function AuditLogPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin

    return (
        <AdminErrorBoundary>
            <AuditLogClient />
        </AdminErrorBoundary>
    )
}