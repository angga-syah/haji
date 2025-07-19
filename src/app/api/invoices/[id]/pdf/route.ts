// src/app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { Database } from '@/lib/database'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { numberToWords } from '@/lib/calculations/terbilang'

interface InvoiceData {
  id: string
  invoice_number: string
  invoice_date: string
  company_name: string
  company_address: string
  company_npwp: string
  subtotal: number
  vat_percentage: number
  vat_amount: number
  total_amount: number
  notes?: string
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  lines: Array<{
    baris: number
    tka_nama: string
    tka_passport: string
    job_name: string
    custom_job_name?: string
    job_description: string
    custom_job_description?: string
    quantity: number
    unit_price: number
    custom_price?: number
    line_total: number
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await requireAuth(request)
    
    // Get invoice data with all related information
    const invoiceResult = await Database.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.subtotal,
        i.vat_percentage,
        i.vat_amount,
        i.total_amount,
        i.notes,
        c.company_name,
        c.address as company_address,
        c.npwp as company_npwp,
        ba.bank_name,
        ba.account_number as bank_account_number,
        ba.account_name as bank_account_name
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN bank_accounts ba ON i.bank_account_id = ba.id
      WHERE i.id = $1 AND (i.created_by = $2 OR $3 = 'admin')
    `, [params.id, user.id, user.role])

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoiceResult[0]

    // Get invoice lines
    const linesResult = await Database.query(`
      SELECT 
        il.baris,
        il.quantity,
        il.unit_price,
        il.custom_price,
        il.line_total,
        il.custom_job_name,
        il.custom_job_description,
        t.nama as tka_nama,
        t.passport as tka_passport,
        jd.job_name,
        jd.job_description
      FROM invoice_lines il
      JOIN tka_workers t ON il.tka_id = t.id
      JOIN job_descriptions jd ON il.job_description_id = jd.id
      WHERE il.invoice_id = $1
      ORDER BY il.line_order
    `, [params.id])

    const invoiceData: InvoiceData = {
      ...invoice,
      lines: linesResult
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData)

    // Update print count
    await Database.query(`
      UPDATE invoices 
      SET printed_count = printed_count + 1, 
          last_printed_at = NOW() 
      WHERE id = $1
    `, [params.id])

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF()
  let currentY = 20

  // Page settings
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margins = { left: 20, right: 20, top: 20, bottom: 20 }

  // Header
  currentY = addHeader(doc, currentY, pageWidth)

  // Invoice details
  currentY = addInvoiceDetails(doc, data, currentY, pageWidth)

  // Company information
  currentY = addCompanyInfo(doc, data, currentY)

  // Check if we need a new page before adding table
  if (currentY > pageHeight - 100) {
    doc.addPage()
    currentY = 20
  }

  // Invoice table
  currentY = addInvoiceTable(doc, data, currentY, pageWidth)

  // Totals section
  currentY = addTotalsSection(doc, data, currentY, pageWidth)

  // Bank information and footer
  addFooter(doc, data, pageHeight)

  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

function addHeader(doc: jsPDF, startY: number, pageWidth: number): number {
  // Company header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth / 2, startY, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Spirit of Services', pageWidth / 2, startY + 12, { align: 'center' })

  doc.setFontSize(10)
  doc.text('Professional TKA Services', pageWidth / 2, startY + 20, { align: 'center' })

  return startY + 35
}

function addInvoiceDetails(doc: jsPDF, data: InvoiceData, startY: number, pageWidth: number): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Left side - Invoice details
  doc.text(`Invoice No: ${data.invoice_number}`, 20, startY)
  doc.text(`Date: ${formatDate(data.invoice_date)}`, 20, startY + 8)
  doc.text(`Place: Jakarta`, 20, startY + 16)

  // Right side - Page number
  doc.text(`Page: 1 of 1`, pageWidth - 20, startY, { align: 'right' })

  return startY + 30
}

function addCompanyInfo(doc: jsPDF, data: InvoiceData, startY: number): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, startY)

  doc.setFont('helvetica', 'normal')
  doc.text(data.company_name, 20, startY + 8)
  doc.text(`NPWP: ${data.company_npwp}`, 20, startY + 16)

  // Handle multi-line address
  const addressLines = doc.splitTextToSize(data.company_address, 80)
  let addressY = startY + 24
  addressLines.forEach((line: string) => {
    doc.text(line, 20, addressY)
    addressY += 6
  })

  return addressY + 10
}

function addInvoiceTable(doc: jsPDF, data: InvoiceData, startY: number, pageWidth: number): number {
  const headers = ['No', 'Date', 'Expatriate', 'Description', 'Amount']
  const tableData: any[] = []

  // Group lines by baris number
  const groupedLines = groupLinesByBaris(data.lines)

  Object.entries(groupedLines).forEach(([barisNum, lines]: [string, any[]]) => {
    lines.forEach((line, index) => {
      const row = [
        index === 0 ? barisNum : '', // Show baris number only on first line
        formatDate(data.invoice_date),
        `${line.tka_nama}\n(${line.tka_passport})`,
        line.custom_job_name || line.job_name,
        formatCurrency(line.line_total)
      ]
      tableData.push(row)
    })
  })

  // Add table
  ;(doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: startY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35 },
      3: { cellWidth: 70 },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 },
    tableWidth: 'auto'
  })

  return (doc as any).lastAutoTable.finalY + 10
}

function addTotalsSection(doc: jsPDF, data: InvoiceData, startY: number, pageWidth: number): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const rightAlign = pageWidth - 20

  // Subtotal
  doc.text('Subtotal:', rightAlign - 60, startY)
  doc.text(formatCurrency(data.subtotal), rightAlign, startY, { align: 'right' })

  // VAT
  doc.text(`VAT (${data.vat_percentage}%):`, rightAlign - 60, startY + 8)
  doc.text(formatCurrency(data.vat_amount), rightAlign, startY + 8, { align: 'right' })

  // Line
  doc.line(rightAlign - 60, startY + 12, rightAlign, startY + 12)

  // Total
  doc.setFont('helvetica', 'bold')
  doc.text('Total:', rightAlign - 60, startY + 20)
  doc.text(formatCurrency(data.total_amount), rightAlign, startY + 20, { align: 'right' })

  // Terbilang
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const terbilang = `Terbilang: ${numberToWords(data.total_amount)} Rupiah`
  const terbilangLines = doc.splitTextToSize(terbilang, pageWidth - 40)
  
  let terbilangY = startY + 35
  terbilangLines.forEach((line: string) => {
    doc.text(line, 20, terbilangY)
    terbilangY += 6
  })

  return terbilangY + 10
}

function addFooter(doc: jsPDF, data: InvoiceData, pageHeight: number): void {
  const footerY = pageHeight - 60

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Bank information (if available)
  if (data.bank_name) {
    doc.text('Payment Details:', 20, footerY)
    doc.text(`Bank: ${data.bank_name}`, 20, footerY + 8)
    doc.text(`Account: ${data.bank_account_number}`, 20, footerY + 16)
    doc.text(`Name: ${data.bank_account_name}`, 20, footerY + 24)
  }

  // Signature area
  doc.text('Authorized by:', 120, footerY)
  doc.text('_____________________', 120, footerY + 24)
  doc.text('Spirit of Services', 120, footerY + 32)

  // Footer notes
  doc.setFontSize(8)
  doc.text('Thank you for your business!', 20, pageHeight - 15)
}

function groupLinesByBaris(lines: any[]): Record<string, any[]> {
  return lines.reduce((groups, line) => {
    const baris = line.baris.toString()
    if (!groups[baris]) groups[baris] = []
    groups[baris].push(line)
    return groups
  }, {})
}