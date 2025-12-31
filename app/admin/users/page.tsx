import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import UsersManagementClient from "./UsersManagementClient"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    // Fetch all users
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    uploadPortals: true,
                    subscriptions: true,
                }
            }
        }
    })

    return <UsersManagementClient users={users as any} />
}
