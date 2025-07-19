// src/lib/pdf/generator.ts
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { amountToWords } from '@/lib/calculations/terbilang'
import type { InvoiceWithDetails } from '@/lib/types'

interface PDFOptions {
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export class InvoicePDFGenerator {
  private doc: jsPDF
  private currentY: number = 20
  private pageHeight: number
  private pageWidth: number
  
  constructor(options: PDFOptions = {}) {
    const {
      orientation = 'portrait',
      format = 'a4',
      margins = { top: 20, right: 20, bottom: 20, left: 20 }
    } = options

    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format
    })

    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
    this.currentY = margins.top
  }

  async generateInvoicePDF(invoice: InvoiceWithDetails): Promise<Uint8Array> {
    try {
      // Add header
      this.addHeader(invoice)
      
      // Add invoice details
      this.addInvoiceDetails(invoice)
      
      // Add recipient info
      this.addRecipientInfo(invoice)
      
      // Add invoice table
      this.addInvoiceTable(invoice)
      
      // Add totals
      this.addTotals(invoice)
      
      // Add footer
      this.addFooter(invoice)
      
      return this.doc.output('arraybuffer')
    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error('Failed to generate PDF')
    }
  }

  private addHeader(invoice: InvoiceWithDetails) {
    // Company logo area (placeholder)
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('INVOICE', this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 10
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Spirit of Services', this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 15
  }

  private addInvoiceDetails(invoice: InvoiceWithDetails) {
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    
    // Left side - Invoice details
    const leftX = 20
    this.doc.text(`Invoice No: ${invoice.invoice_number}`, leftX, this.currentY)
    this.doc.text(`Date: ${formatDate(invoice.invoice_date)}`, leftX, this.currentY + 7)
    this.doc.text('Place: Jakarta', leftX, this.currentY + 14)
    
    // Right side - Page number
    const rightX = this.pageWidth - 20
    this.doc.text('Page: 1 of 1', rightX, this.currentY, { align: 'right' })
    
    this.currentY += 25
  }

  private addRecipientInfo(invoice: InvoiceWithDetails) {
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('To:', 20, this.currentY)
    
    this.currentY += 7
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(invoice.company_name, 20, this.currentY)
    
    // Handle multi-line address
    const addressLines = this.splitText(invoice.company_address, 80)
    addressLines.forEach((line, index) => {
      this.doc.text(line, 20, this.currentY + 7 + (index * 7))
    })
    
    this.currentY += 7 + (addressLines.length * 7) + 10
  }

  private addInvoiceTable(invoice: InvoiceWithDetails) {
    const headers = ['No', 'Date', 'Expatriate', 'Description', 'Amount']
    
    // Group lines by baris number
    const groupedLines = this.groupLinesByBaris(invoice.lines || [])
    const tableData: any[] = []
    
    Object.entries(groupedLines).forEach(([barisNum, lines]) => {
      lines.forEach((line, index) => {
        const row = [
          index === 0 ? barisNum : '', // Show baris number only on first line
          formatDate(invoice.invoice_date),
          line.tka_nama,
          this.formatJobDescription(line),
          formatCurrency(line.line_total)
        ]
        tableData.push(row)
      })
    })

    // Add auto table
    ;(this.doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: this.currentY,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 40 },
        3: { cellWidth: 70 },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addTotals(invoice: InvoiceWithDetails) {
    // Ensure we have space for totals
    if (this.currentY > this.pageHeight - 80) {
      this.doc.addPage()
      this.currentY = 30
    }

    const rightX = this.pageWidth - 20
    const labelX = rightX - 60

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    // Subtotal
    this.doc.text('Subtotal:', labelX, this.currentY)
    this.doc.text(formatCurrency(invoice.subtotal), rightX, this.currentY, { align: 'right' })

    // VAT
    this.currentY += 7
    this.doc.text(`VAT (${invoice.vat_percentage}%):`, labelX, this.currentY)
    this.doc.text(formatCurrency(invoice.vat_amount), rightX, this.currentY, { align: 'right' })

    // Total
    this.currentY += 7
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Total:', labelX, this.currentY)
    this.doc.text(formatCurrency(invoice.total_amount), rightX, this.currentY, { align: 'right' })

    // Terbilang
    this.currentY += 15
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    const terbilang = `Terbilang: ${amountToWords(invoice.total_amount)}`
    const terbilangLines = this.splitText(terbilang, 160)
    
    terbilangLines.forEach((line, index) => {
      this.doc.text(line, 20, this.currentY + (index * 6))
    })

    this.currentY += (terbilangLines.length * 6) + 10
  }

  private addFooter(invoice: InvoiceWithDetails) {
    const footerY = this.pageHeight - 60

    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')

    // Bank information (if available)
    if (invoice.bank_name) {
      this.doc.text('Bank Details:', 20, footerY)
      this.doc.text(invoice.bank_name, 20, footerY + 7)
      this.doc.text(`Account: ${invoice.bank_account_number}`, 20, footerY + 14)
      this.doc.text(`Name: ${invoice.bank_account_name}`, 20, footerY + 21)
    }

    // Signature area
    const signatureX = this.pageWidth - 70
    this.doc.text('Company,', signatureX, footerY)
    this.doc.line(signatureX, footerY + 20, signatureX + 40, footerY + 20) // Signature line
    this.doc.text('Authorized Signature', signatureX, footerY + 28)

    // Office information
    this.doc.text('Office Address:', 20, footerY + 35)
    this.doc.text('Jakarta Office, Indonesia', 20, footerY + 42)
  }

  private groupLinesByBaris(lines: any[]): Record<string, any[]> {
    return lines.reduce((groups, line) => {
      const baris = line.baris.toString()
      if (!groups[baris]) {
        groups[baris] = []
      }
      groups[baris].push(line)
      return groups
    }, {} as Record<string, any[]>)
  }

  private formatJobDescription(line: any): string {
    let description = line.custom_job_name || line.job_name || ''
    
    if (line.custom_job_description) {
      description += '\n' + line.custom_job_description
    }
    
    if (line.quantity > 1) {
      description += `\nQty: ${line.quantity} × ${formatCurrency(line.unit_price)}`
    }
    
    return description
  }

  private splitText(text: string, maxWidth: number): string[] {
    return this.doc.splitTextToSize(text, maxWidth)
  }
}

// Main function to generate invoice PDF
export async function generateInvoicePDF(
  invoice: InvoiceWithDetails, 
  options?: PDFOptions
): Promise<Uint8Array> {
  const generator = new InvoicePDFGenerator(options)
  return generator.generateInvoicePDF(invoice)
}

// Function for reports PDF
export async function generateReportPDF(
  title: string,
  data: any[],
  columns: { header: string; accessor: string; width?: number }[],
  options?: PDFOptions
): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: options?.orientation || 'landscape',
    unit: 'mm',
    format: options?.format || 'a4'
  })

  let currentY = 20

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, doc.internal.pageSize.width / 2, currentY, { align: 'center' })
  
  currentY += 15

  // Date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${formatDate(new Date())}`, doc.internal.pageSize.width / 2, currentY, { align: 'center' })
  
  currentY += 15

  // Table
  const headers = columns.map(col => col.header)
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.accessor]
      if (typeof value === 'number' && col.accessor.includes('amount')) {
        return formatCurrency(value)
      }
      return value?.toString() || ''
    })
  )

  ;(doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: currentY,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    }
  })

  return doc.output('arraybuffer')
}