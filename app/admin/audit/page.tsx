import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AuditLogClient from "./AuditLogClient"

export default async function AuditLogPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    return <AuditLogClient />
}