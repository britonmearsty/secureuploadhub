import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            user: true,
            plan: true,
          },
        },
      },
    });

    if (!payment || !payment.subscription || payment.subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const buffers: any[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      // The PDF generation is complete
    });

    // --- PDF Content ---
    // Header
    doc
      .fontSize(20)
      .text("INVOICE", { align: "center" })
      .moveDown();

    // Details
    doc.fontSize(12).text(`Invoice ID: ${payment.id}`);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();

    // Billed to
    doc.text("Billed To:");
    doc.text(payment.subscription.user.name || "N/A");
    doc.text(payment.subscription.user.email || "N/A");
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text("Description", 50, tableTop);
    doc.text("Amount", 450, tableTop, { width: 100, align: "right" });
    doc.y += 15;
    const initialY = doc.y;
    doc.moveTo(50, initialY).lineTo(550, initialY).stroke();


    // Table Row
    const item = payment.subscription.plan.name;
    const amount = payment.amount;
    const rowY = doc.y;
    doc.fontSize(10);
    doc.text(item, 50, rowY + 5);
    doc.text(`$${amount.toFixed(2)}`, 450, rowY + 5, { width: 100, align: "right" });
    doc.y += 20;
    const finalY = doc.y;
    doc.moveTo(50, finalY).lineTo(550, finalY).stroke();

    // Total
    doc.fontSize(12).text(`Total: $${amount.toFixed(2)}`, { align: "right" });
    doc.moveDown();

    // Footer
    doc.fontSize(8).text("Thank you for your business!", { align: "center" });

    doc.end();

    const pdfBuffer = Buffer.concat(buffers);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${payment.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
