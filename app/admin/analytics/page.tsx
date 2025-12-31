import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AnalyticsClient from "./AnalyticsClient"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    return <AnalyticsClient />
}
