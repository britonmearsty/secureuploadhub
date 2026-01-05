import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic'

/**
 * Test endpoint to verify webhook configuration
 * This endpoint can be used to test if webhooks are reaching the server
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Only allow authenticated admin users to test webhooks
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())
    
    console.log("Webhook test received:")
    console.log("Headers:", headers)
    console.log("Body:", body)
    
    return NextResponse.json({ 
      status: "success",
      message: "Webhook test received successfully",
      timestamp: new Date().toISOString(),
      headers: headers,
      bodyLength: body.length
    })
  } catch (error) {
    console.error("Webhook test error:", error)
    return NextResponse.json(
      { error: "Webhook test failed" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check webhook configuration
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    webhookUrl: process.env.NEXTAUTH_URL + "/api/billing/webhook"
  })
}