import { auth } from "@/auth"
import { redirect } from "next/navigation"
import BillingManagementClient from "./BillingManagementClient"

export default async function AdminBillingPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    return (
        <div className="p-6">
            <BillingManagementClient />
        </div>
    );
}