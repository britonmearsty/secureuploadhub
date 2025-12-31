import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Simulate refresh with a small delay
        await new Promise(resolve => setTimeout(resolve, 500))

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            message: "Dashboard data refreshed successfully"
        })
    } catch (error) {
        console.error("Dashboard refresh error:", error)
        return NextResponse.json(
            { error: "Failed to refresh dashboard" },
            { status: 500 }
        )
    }
}
