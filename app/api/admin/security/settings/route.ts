import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const settings = await prisma.systemSetting.findMany()

        const settingsMap: Record<string, any> = {}
        settings.forEach(s => {
            settingsMap[s.key] = s.type === "boolean" ? s.value === "true" : s.value
        })

        return NextResponse.json(settingsMap)
    } catch (error) {
        console.error("Error fetching settings:", error)
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { key, value, type = "string" } = body

        if (!key || value === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(value), type },
            create: { key, value: String(value), type }
        })

        return NextResponse.json(setting)
    } catch (error) {
        console.error("Error saving setting:", error)
        return NextResponse.json(
            { error: "Failed to save setting" },
            { status: 500 }
        )
    }
}
