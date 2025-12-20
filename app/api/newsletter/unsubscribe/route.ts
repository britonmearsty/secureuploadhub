import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    })

    if (!subscriber) {
      return NextResponse.json(
        { error: "Email not found in newsletter" },
        { status: 404 }
      )
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { status: "unsubscribed" },
    })

    return NextResponse.json(
      { success: true, message: "Successfully unsubscribed from newsletter" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe from newsletter" },
      { status: 500 }
    )
  }
}
