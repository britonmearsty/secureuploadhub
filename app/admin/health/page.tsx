import { redirect } from "next/navigation"
import { auth } from "@/auth"
import HealthClient from "./HealthClient"

export const dynamic = "force-dynamic"

export default async function HealthPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    return <HealthClient />
}
