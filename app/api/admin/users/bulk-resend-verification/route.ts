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

        // Fetch users
        const users = await prisma.user.findMany({
            where: {
                id: {
                    in: userIds
                }
            }
        })

        // Update users to unverified status
        let updatedCount = 0
        for (const user of users) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerified: null }
                })
                updatedCount++
            } catch (error) {
                console.error(`Failed to update verification status for ${user.email}:`, error)
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            failedCount: users.length - updatedCount
        })
    } catch (error) {
        console.error("Bulk resend verification error:", error)
        return NextResponse.json(
            { error: "Failed to resend verification emails" },
            { status: 500 }
        )
    }
}
