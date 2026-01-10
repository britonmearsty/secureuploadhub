import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * Minimal webhook test endpoint to isolate issues
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test webhook endpoint called')
    
    const rawBody = await request.text()
    const signature = request.headers.get("x-paystack-signature")
    
    console.log('Request details:', {
      bodyLength: rawBody.length,
      hasSignature: !!signature,
      contentType: request.headers.get('content-type')
    })

    // Try to parse the body
    let parsedBody
    try {
      parsedBody = JSON.parse(rawBody)
      console.log('Parsed body:', {
        event: parsedBody.event,
        dataKeys: Object.keys(parsedBody.data || {})
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // Simple success response
    return NextResponse.json({ 
      status: "success", 
      message: "Test webhook received",
      event: parsedBody.event,
      reference: parsedBody.data?.reference
    })

  } catch (error) {
    console.error("Test webhook error:", error)
    return NextResponse.json(
      { error: "Test webhook failed", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}