import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AdminDashboardEnhanced from "./AdminDashboardEnhanced"

export default async function AdminPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    return <AdminDashboardEnhanced />
}
