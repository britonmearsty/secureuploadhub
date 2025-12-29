import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AdminDashboardClient from "./AdminDashboardClient"

export default async function AdminPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    // Fetch admin-level stats
    const [totalUsers, totalPortals, totalUploads, recentUsers] = await Promise.all([
        prisma.user.count(),
        prisma.uploadPortal.count(),
        prisma.fileUpload.count(),
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                createdAt: true,
            }
        })
    ])

    const stats = {
        totalUsers,
        totalPortals,
        totalUploads,
    }

    return (
        <AdminDashboardClient
            stats={stats}
            recentUsers={recentUsers}
        />
    )
}
