import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const { userIds } = await req.json()

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid user IDs" },
                { status: 400 }
            )
        }

        // Delete users
        await prisma.user.deleteMany({
            where: {
                id: {
                    in: userIds
                }
            }
        })

        return NextResponse.json({
            success: true,
            deletedCount: userIds.length
        })
    } catch (error) {
        console.error("Bulk delete error:", error)
        return NextResponse.json(
            { error: "Failed to delete users" },
            { status: 500 }
        )
    }
}
