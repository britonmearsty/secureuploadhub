import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import PortalsManagementClient from "./PortalsManagementClient"

export const dynamic = "force-dynamic"

export default async function PortalsPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    const portals = await prisma.uploadPortal.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: { id: true, name: true, email: true }
            },
            _count: {
                select: { uploads: true }
            }
        }
    })

    return <PortalsManagementClient portals={portals as any} />
}
