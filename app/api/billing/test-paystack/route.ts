import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { PAYSTACK_CONFIG } from "@/lib/paystack-config"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Test Paystack configuration
    const configTest = {
      hasSecretKey: !PAYSTACK_CONFIG.secretKey.startsWith('dummy_'),
      hasPublicKey: !PAYSTACK_CONFIG.publicKey.startsWith('dummy_'),
      hasWebhookSecret: !PAYSTACK_CONFIG.webhookSecret.startsWith('dummy_'),
      hasBaseUrl: !PAYSTACK_CONFIG.baseUrl.startsWith('dummy_'),
      baseUrl: PAYSTACK_CONFIG.baseUrl
    }

    // Test Paystack initialization
    let paystackTest: { initialized: boolean; error: string | null } = { initialized: false, error: null }
    try {
      const { getPaystack } = await import('@/lib/billing')
      const paystack = await getPaystack()
      
      // Try a simple API call
      const response = await (paystack as any).transaction.verify('dummy_reference')
      paystackTest.initialized = true
    } catch (error: any) {
      paystackTest.error = error.message
      // If it's just a "transaction not found" error, Paystack is working
      if (error.message?.includes('Transaction not found') || error.message?.includes('No transaction found')) {
        paystackTest.initialized = true
        paystackTest.error = 'Working (expected error for dummy reference)'
      }
    }

    return NextResponse.json({
      config: configTest,
      paystack: paystackTest,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Paystack test error:", error)
    return NextResponse.json(
      { 
        error: "Test failed", 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}