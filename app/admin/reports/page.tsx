import { redirect } from "next/navigation"
import { auth } from "@/auth"
import ReportsClient from "./ReportsClient"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    return <ReportsClient />
}
