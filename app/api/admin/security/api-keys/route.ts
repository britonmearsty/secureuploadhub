import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

function generateApiKey() {
    return "sk_" + crypto.randomBytes(32).toString("hex")
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const apiKeys = await prisma.apiKey.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                key: true,
                isActive: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                userId: true
            }
        })

        // Mask keys for security
        const maskedKeys = apiKeys.map(k => ({
            ...k,
            key: k.key.substring(0, 8) + "..." + k.key.substring(k.key.length - 4)
        }))

        return NextResponse.json(maskedKeys)
    } catch (error) {
        console.error("Error fetching API keys:", error)
        return NextResponse.json(
            { error: "Failed to fetch API keys" },
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
        const { name, userId, expiresAt } = body

        if (!name || !userId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const apiKey = generateApiKey()

        const created = await prisma.apiKey.create({
            data: {
                name,
                key: apiKey,
                userId,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        })

        return NextResponse.json({
            id: created.id,
            name: created.name,
            key: apiKey,
            userId: created.userId,
            createdAt: created.createdAt,
            expiresAt: created.expiresAt,
            message: "Save this key somewhere safe. You won't be able to see it again!"
        })
    } catch (error) {
        console.error("Error creating API key:", error)
        return NextResponse.json(
            { error: "Failed to create API key" },
            { status: 500 }
        )
    }
}
