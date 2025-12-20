import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendNewsletterWelcome } from "@/lib/mailgun"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    })

    if (existingSubscriber) {
      if (existingSubscriber.status === "subscribed") {
        return NextResponse.json(
          { error: "Email already subscribed" },
          { status: 409 }
        )
      }

      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { status: "subscribed" },
      })
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email,
          status: "subscribed",
        },
      })
    }

    await sendNewsletterWelcome(email)

    return NextResponse.json(
      { success: true, message: "Successfully subscribed to newsletter" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Newsletter subscribe error:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to newsletter" },
      { status: 500 }
    )
  }
}
