import AdminDashboardEnhanced from "./AdminDashboardEnhanced"

export default async function AdminPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin
    return <AdminDashboardEnhanced />
}
