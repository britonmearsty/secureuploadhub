import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PortalManagementClient from "./PortalManagementClient"

export default async function AdminPortalsPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    return (
        <div className="p-6">
            <PortalManagementClient />
        </div>
    );
}