import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const plans = await prisma.billingPlan.findMany({
            orderBy: { price: "asc" },
            include: {
                _count: {
                    select: { subscriptions: true }
                }
            }
        })

        return NextResponse.json(plans)
    } catch (error) {
        console.error("Error fetching billing plans:", error)
        return NextResponse.json(
            { error: "Failed to fetch billing plans" },
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
        const { name, description, price, features, maxPortals, maxStorageGB, maxUploadsMonth } = body

        if (!name || price === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        const plan = await prisma.billingPlan.create({
            data: {
                name,
                description,
                price,
                features: features || [],
                maxPortals: maxPortals || 1,
                maxStorageGB: maxStorageGB || 1,
                maxUploadsMonth: maxUploadsMonth || 100,
                isActive: true
            }
        })

        return NextResponse.json(plan)
    } catch (error) {
        console.error("Error creating billing plan:", error)
        return NextResponse.json(
            { error: "Failed to create billing plan" },
            { status: 500 }
        )
    }
}
