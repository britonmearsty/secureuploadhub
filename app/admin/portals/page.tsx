import PortalManagementClient from "./PortalManagementClient"
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary"

export default async function AdminPortalsPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin

    return (
        <AdminErrorBoundary>
            <div className="p-6">
                <PortalManagementClient />
            </div>
        </AdminErrorBoundary>
    );
}