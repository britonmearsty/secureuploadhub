import { jsPDF } from 'jspdf'

interface InvoiceData {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: Date
  planName: string
  customerName: string
  customerEmail: string
  billingPeriod: {
    start: Date
    end: Date
  }
}

export function generateInvoicePDF(invoice: InvoiceData): Uint8Array {
  const doc = new jsPDF()
  
  // Brand colors (RGB values)
  const primaryColor = [37, 99, 235] // Blue
  const secondaryColor = [100, 116, 139] // Slate
  const lightGray = [248, 250, 252] // Light background
  const darkGray = [51, 65, 85] // Dark text
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  
  // Header section with brand
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  // Company logo/name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Secure Upload Hub', 20, 25)
  
  // Invoice title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('INVOICE', pageWidth - 60, 25)
  
  // Reset text color for body
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  
  // Invoice details section
  let yPos = 60
  
  // Invoice number and date
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Details', 20, yPos)
  
  yPos += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  doc.text(`Invoice ID: ${invoice.id}`, 20, yPos)
  doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`, 20, yPos + 10)
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, yPos + 20)
  
  // Customer details
  yPos += 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Bill To:', 20, yPos)
  
  yPos += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.customerName, 20, yPos)
  doc.text(invoice.customerEmail, 20, yPos + 10)
  
  // Billing period
  yPos += 30
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Billing Period:', 20, yPos)
  
  yPos += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `${invoice.billingPeriod.start.toLocaleDateString()} - ${invoice.billingPeriod.end.toLocaleDateString()}`,
    20,
    yPos
  )
  
  // Services table
  yPos += 40
  
  // Table header background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.rect(20, yPos - 5, pageWidth - 40, 20, 'F')
  
  // Table header border
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.setLineWidth(0.5)
  doc.rect(20, yPos - 5, pageWidth - 40, 20)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.text('Description', 25, yPos + 5)
  doc.text('Period', 100, yPos + 5)
  doc.text('Amount', pageWidth - 60, yPos + 5)
  
  // Table content
  yPos += 25
  doc.setFont('helvetica', 'normal')
  doc.text(`${invoice.planName} Subscription`, 25, yPos)
  doc.text('Monthly', 100, yPos)
  doc.text(`${invoice.currency.toUpperCase()} ${invoice.amount.toFixed(2)}`, pageWidth - 60, yPos)
  
  // Table row border
  doc.rect(20, yPos - 10, pageWidth - 40, 20)
  
  // Subtotal section
  yPos += 25
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Subtotal:', pageWidth - 100, yPos)
  doc.text(`${invoice.currency.toUpperCase()} ${invoice.amount.toFixed(2)}`, pageWidth - 60, yPos)
  
  yPos += 10
  doc.text('Tax:', pageWidth - 100, yPos)
  doc.text(`${invoice.currency.toUpperCase()} 0.00`, pageWidth - 60, yPos)
  
  // Divider line
  yPos += 15
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.setLineWidth(1)
  doc.line(pageWidth - 120, yPos, pageWidth - 20, yPos)
  
  // Total section
  yPos += 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total:', pageWidth - 100, yPos)
  doc.text(`${invoice.currency.toUpperCase()} ${invoice.amount.toFixed(2)}`, pageWidth - 60, yPos)
  
  // Payment status badge
  if (invoice.status === 'paid' || invoice.status === 'success') {
    doc.setFillColor(16, 185, 129) // Green
    doc.roundedRect(pageWidth - 80, 50, 60, 15, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('PAID', pageWidth - 65, 60)
  }
  
  // Footer
  yPos = pageHeight - 40
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text('Thank you for your business!', 20, yPos)
  doc.text('For support, contact us at support@secureuploadhub.com', 20, yPos + 10)
  
  // Company address (optional)
  doc.text('Secure Upload Hub | Secure File Management Solutions', 20, yPos + 20)
  
  return new Uint8Array(doc.output('arraybuffer'))
}