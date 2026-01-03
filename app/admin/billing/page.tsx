import BillingManagementClient from "./BillingManagementClient"

export default async function AdminBillingPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin

    return (
        <div className="p-6">
            <BillingManagementClient />
        </div>
    );
}