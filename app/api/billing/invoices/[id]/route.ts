import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { generateInvoicePDF } from "@/lib/invoice-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: paymentId } = await params

    // Find the payment and verify ownership
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        subscription: {
          userId: session.user.id
        }
      },
      include: {
        subscription: {
          include: {
            plan: true,
            user: true
          }
        }
      }
    })

    if (!payment || !payment.subscription) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Generate PDF invoice
    const invoiceData = {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
      planName: payment.subscription.plan.name,
      customerName: payment.subscription.user.name || 'Customer',
      customerEmail: payment.subscription.user.email || '',
      billingPeriod: {
        start: payment.subscription.currentPeriodStart,
        end: payment.subscription.currentPeriodEnd
      }
    }

    const pdfBuffer = generateInvoicePDF(invoiceData)

    // Return PDF with proper headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${payment.id}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Invoice generation error:', error)
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    )
  }
}