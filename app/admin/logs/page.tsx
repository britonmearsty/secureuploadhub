import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import LogsClient from "./LogsClient"

export const dynamic = "force-dynamic"

export default async function LogsPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    const logs = await prisma.systemLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20
    })

    return <LogsClient logs={logs as any} />
}
