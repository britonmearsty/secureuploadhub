import AdminDashboardEnhanced from "./AdminDashboardEnhanced"
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary"

export default async function AdminPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin
    return (
        <AdminErrorBoundary>
            <AdminDashboardEnhanced />
        </AdminErrorBoundary>
    )
}
