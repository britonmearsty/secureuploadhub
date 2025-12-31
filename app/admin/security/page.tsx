import { redirect } from "next/navigation"
import { auth } from "@/auth"
import SecurityClient from "./SecurityClient"

export const dynamic = "force-dynamic"

export default async function SecurityPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    // Mock security data - can be replaced with actual data fetching
    const securityData = {
        failedLogins: [],
        whitelistIPs: [],
        rateLimits: [
            {
                id: "1",
                endpoint: "/api/*",
                requestsPerMinute: 100,
                enabled: true
            }
        ],
        twoFAStatus: {
            enabled: true,
            usersWithTwoFA: 5,
            totalUsers: 10
        }
    }

    return <SecurityClient data={securityData} />
}
