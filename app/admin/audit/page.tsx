import AuditLogClient from "./AuditLogClient"

export default async function AuditLogPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin

    return <AuditLogClient />
}