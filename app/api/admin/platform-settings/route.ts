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

        // Convert to key-value object for easier access
        const settingsObj = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value
            return acc
        }, {} as Record<string, string>)

        return NextResponse.json({ settings: settingsObj })
    } catch (error) {
        console.error("Error fetching settings:", error)
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        // Update or create settings
        const updatedSettings = await Promise.all(
            Object.entries(body).map(async ([key, value]) => {
                const existing = await prisma.systemSetting.findUnique({
                    where: { key }
                })

                if (existing) {
                    return prisma.systemSetting.update({
                        where: { key },
                        data: { value: String(value) }
                    })
                } else {
                    return prisma.systemSetting.create({
                        data: {
                            key,
                            value: String(value)
                        }
                    })
                }
            })
        )

        // Convert back to object
        const settingsObj = updatedSettings.reduce((acc, setting) => {
            acc[setting.key] = setting.value
            return acc
        }, {} as Record<string, string>)

        return NextResponse.json({ settings: settingsObj })
    } catch (error) {
        console.error("Error updating settings:", error)
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        )
    }
}
