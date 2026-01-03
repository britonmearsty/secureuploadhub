import PortalManagementClient from "./PortalManagementClient"

export default async function AdminPortalsPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin

    return (
        <div className="p-6">
            <PortalManagementClient />
        </div>
    );
}