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

        const { userIds, role } = await req.json()

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid user IDs" },
                { status: 400 }
            )
        }

        if (!["admin", "user"].includes(role)) {
            return NextResponse.json(
                { error: "Invalid role" },
                { status: 400 }
            )
        }

        // Update user roles
        await prisma.user.updateMany({
            where: {
                id: {
                    in: userIds
                }
            },
            data: {
                role
            }
        })

        return NextResponse.json({
            success: true,
            updatedCount: userIds.length,
            role
        })
    } catch (error) {
        console.error("Bulk role update error:", error)
        return NextResponse.json(
            { error: "Failed to update user roles" },
            { status: 500 }
        )
    }
}
