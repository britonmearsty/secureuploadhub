import { redirect } from "next/navigation"
import { auth } from "@/auth"
import DatabaseClient from "./DatabaseClient"

export const dynamic = "force-dynamic"

export default async function DatabasePage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    // Mock database data - can be replaced with actual data fetching
    const databaseData = {
        migrations: [],
        backups: [],
        health: {
            status: "healthy" as const,
            connections: 10,
            maxConnections: 100,
            tableCount: 25,
            indexCount: 50,
            totalSize: 1024 * 1024 * 500, // 500MB
            queryLatency: 45,
        }
    }

    return <DatabaseClient data={databaseData} />
}
