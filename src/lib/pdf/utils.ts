// src/lib/pdf/utils.ts
import jsPDF from 'jspdf'
import { PRINT, PDF } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface PDFConfig {
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter' | 'legal'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  fonts?: {
    normal: string
    bold: string
  }
}

export interface PDFPageInfo {
  width: number
  height: number
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  printableWidth: number
  printableHeight: number
}

export class PDFUtils {
  /**
   * Create a new PDF document with standard configuration
   */
  static createDocument(config: PDFConfig = {}): jsPDF {
    const {
      orientation = 'portrait',
      format = 'a4',
      margins = PRINT.MARGINS.DEFAULT
    } = config

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format
    })

    // Set default font
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(PDF.FONTS.NORMAL)

    return doc
  }

  /**
   * Get page information for calculations
   */
  static getPageInfo(doc: jsPDF, margins = PRINT.MARGINS.DEFAULT): PDFPageInfo {
    const width = doc.internal.pageSize.width
    const height = doc.internal.pageSize.height

    return {
      width,
      height,
      margins,
      printableWidth: width - margins.left - margins.right,
      printableHeight: height - margins.top - margins.bottom
    }
  }

  /**
   * Add header to PDF with company info
   */
  static addHeader(
    doc: jsPDF,
    title: string,
    subtitle?: string,
    pageInfo?: PDFPageInfo
  ): number {
    const info = pageInfo || this.getPageInfo(doc)
    let currentY = info.margins.top

    // Title
    doc.setFontSize(PDF.FONTS.HEADER)
    doc.setFont('helvetica', 'bold')
    doc.text(title, info.width / 2, currentY, { align: 'center' })
    currentY += 10

    // Subtitle
    if (subtitle) {
      doc.setFontSize(PDF.FONTS.TITLE)
      doc.setFont('helvetica', 'normal')
      doc.text(subtitle, info.width / 2, currentY, { align: 'center' })
      currentY += 8
    }

    // Add line separator
    doc.setLineWidth(0.5)
    doc.line(info.margins.left, currentY + 5, info.width - info.margins.right, currentY + 5)
    currentY += 10

    return currentY
  }

  /**
   * Add footer with page numbers and additional info
   */
  static addFooter(
    doc: jsPDF,
    pageNumber: number,
    totalPages: number,
    additionalInfo?: string,
    pageInfo?: PDFPageInfo
  ): void {
    const info = pageInfo || this.getPageInfo(doc)
    const footerY = info.height - info.margins.bottom + 5

    doc.setFontSize(PDF.FONTS.SMALL)
    doc.setFont('helvetica', 'normal')

    // Page number
    const pageText = `Page ${pageNumber} of ${totalPages}`
    doc.text(pageText, info.width - info.margins.right, footerY, { align: 'right' })

    // Additional info (left side)
    if (additionalInfo) {
      doc.text(additionalInfo, info.margins.left, footerY)
    }

    // Date generated (center)
    const dateText = `Generated: ${formatDate(new Date())}`
    doc.text(dateText, info.width / 2, footerY, { align: 'center' })
  }

  /**
   * Split text into multiple lines to fit within width
   */
  static splitText(
    doc: jsPDF,
    text: string,
    maxWidth: number,
    fontSize?: number
  ): string[] {
    if (fontSize) {
      doc.setFontSize(fontSize)
    }

    return doc.splitTextToSize(text, maxWidth)
  }

  /**
   * Calculate text height for given width
   */
  static getTextHeight(
    doc: jsPDF,
    text: string,
    maxWidth: number,
    fontSize?: number,
    lineHeight: number = PDF.LINE_HEIGHT.NORMAL
  ): number {
    const lines = this.splitText(doc, text, maxWidth, fontSize)
    const fontSizeInMM = (fontSize || PDF.FONTS.NORMAL) * 0.352778 // Convert pt to mm
    return lines.length * fontSizeInMM * lineHeight
  }

  /**
   * Add text with automatic line wrapping
   */
  static addWrappedText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = PDF.LINE_HEIGHT.NORMAL
  ): number {
    const lines = this.splitText(doc, text, maxWidth)
    const fontSizeInMM = doc.getFontSize() * 0.352778 // Convert pt to mm
    const lineSpacing = fontSizeInMM * lineHeight

    lines.forEach((line, index) => {
      doc.text(line, x, y + (index * lineSpacing))
    })

    return y + (lines.length * lineSpacing)
  }

  /**
   * Add a simple table to PDF
   */
  static addSimpleTable(
    doc: jsPDF,
    headers: string[],
    data: (string | number)[][],
    startY: number,
    pageInfo?: PDFPageInfo
  ): number {
    const info = pageInfo || this.getPageInfo(doc)
    const columnWidth = info.printableWidth / headers.length
    let currentY = startY

    // Headers
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(PDF.FONTS.NORMAL)

    headers.forEach((header, index) => {
      const x = info.margins.left + (index * columnWidth)
      doc.text(header, x + 2, currentY)
    })

    // Header line
    currentY += 6
    doc.line(info.margins.left, currentY, info.width - info.margins.right, currentY)
    currentY += 4

    // Data rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(PDF.FONTS.SMALL)

    data.forEach((row) => {
      row.forEach((cell, index) => {
        const x = info.margins.left + (index * columnWidth)
        const cellText = typeof cell === 'number' ? formatCurrency(cell) : String(cell)
        doc.text(cellText, x + 2, currentY)
      })
      currentY += 5
    })

    return currentY + 5
  }

  /**
   * Check if there's enough space on current page
   */
  static hasSpaceOnPage(
    doc: jsPDF,
    currentY: number,
    requiredHeight: number,
    pageInfo?: PDFPageInfo
  ): boolean {
    const info = pageInfo || this.getPageInfo(doc)
    return (currentY + requiredHeight) <= (info.height - info.margins.bottom)
  }

  /**
   * Add new page if needed
   */
  static checkAndAddPage(
    doc: jsPDF,
    currentY: number,
    requiredHeight: number,
    pageInfo?: PDFPageInfo
  ): number {
    if (!this.hasSpaceOnPage(doc, currentY, requiredHeight, pageInfo)) {
      doc.addPage()
      const info = pageInfo || this.getPageInfo(doc)
      return info.margins.top
    }
    return currentY
  }

  /**
   * Add invoice header section
   */
  static addInvoiceHeader(
    doc: jsPDF,
    invoiceNumber: string,
    invoiceDate: string,
    currentY: number,
    pageInfo?: PDFPageInfo
  ): number {
    const info = pageInfo || this.getPageInfo(doc)

    doc.setFontSize(PDF.FONTS.NORMAL)
    doc.setFont('helvetica', 'normal')

    // Left side - Invoice details
    doc.text(`Invoice No: ${invoiceNumber}`, info.margins.left, currentY)
    doc.text(`Date: ${formatDate(invoiceDate)}`, info.margins.left, currentY + 7)
    doc.text('Place: Jakarta', info.margins.left, currentY + 14)

    // Right side - Page info
    doc.text('Page: 1', info.width - info.margins.right, currentY, { align: 'right' })

    return currentY + 25
  }

  /**
   * Add recipient information
   */
  static addRecipientInfo(
    doc: jsPDF,
    companyName: string,
    companyAddress: string,
    currentY: number,
    pageInfo?: PDFPageInfo
  ): number {
    const info = pageInfo || this.getPageInfo(doc)

    doc.setFontSize(PDF.FONTS.NORMAL)
    doc.setFont('helvetica', 'bold')
    doc.text('To:', info.margins.left, currentY)

    currentY += 7
    doc.setFont('helvetica', 'normal')
    doc.text(companyName, info.margins.left, currentY)

    // Handle multi-line address
    currentY += 7
    return this.addWrappedText(
      doc,
      companyAddress,
      info.margins.left,
      currentY,
      info.printableWidth * 0.6
    ) + 10
  }

  /**
   * Add totals section for invoices
   */
  static addInvoiceTotals(
    doc: jsPDF,
    subtotal: number,
    vatPercentage: number,
    vatAmount: number,
    total: number,
    currentY: number,
    pageInfo?: PDFPageInfo
  ): number {
    const info = pageInfo || this.getPageInfo(doc)
    const labelX = info.width - info.margins.right - 60
    const valueX = info.width - info.margins.right

    doc.setFontSize(PDF.FONTS.NORMAL)
    doc.setFont('helvetica', 'normal')

    // Subtotal
    doc.text('Subtotal:', labelX, currentY)
    doc.text(formatCurrency(subtotal), valueX, currentY, { align: 'right' })

    // VAT
    currentY += 7
    doc.text(`VAT (${vatPercentage}%):`, labelX, currentY)
    doc.text(formatCurrency(vatAmount), valueX, currentY, { align: 'right' })

    // Total
    currentY += 7
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', labelX, currentY)
    doc.text(formatCurrency(total), valueX, currentY, { align: 'right' })

    return currentY + 15
  }

  /**
   * Add bank information
   */
  static addBankInfo(
    doc: jsPDF,
    bankName?: string,
    accountNumber?: string,
    accountName?: string,
    currentY?: number,
    pageInfo?: PDFPageInfo
  ): number {
    if (!bankName) return currentY || 0

    const info = pageInfo || this.getPageInfo(doc)
    let y = currentY || (info.height - info.margins.bottom - 40)

    doc.setFontSize(PDF.FONTS.SMALL)
    doc.setFont('helvetica', 'normal')

    doc.text('Bank Details:', info.margins.left, y)
    y += 6
    doc.text(bankName, info.margins.left, y)
    y += 6

    if (accountNumber) {
      doc.text(`Account: ${accountNumber}`, info.margins.left, y)
      y += 6
    }

    if (accountName) {
      doc.text(`Name: ${accountName}`, info.margins.left, y)
      y += 6
    }

    return y
  }

  /**
   * Add signature area
   */
  static addSignatureArea(
    doc: jsPDF,
    currentY?: number,
    pageInfo?: PDFPageInfo
  ): number {
    const info = pageInfo || this.getPageInfo(doc)
    let y = currentY || (info.height - info.margins.bottom - 40)

    const signatureX = info.width - info.margins.right - 60

    doc.setFontSize(PDF.FONTS.SMALL)
    doc.setFont('helvetica', 'normal')

    doc.text('Company,', signatureX, y)
    y += 20

    // Signature line
    doc.line(signatureX, y, signatureX + 40, y)
    y += 8

    doc.text('Authorized Signature', signatureX, y)

    return y + 10
  }

  /**
   * Convert HTML color to RGB array
   */
  static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0]
  }

  /**
   * Set draw color from hex
   */
  static setDrawColor(doc: jsPDF, color: string): void {
    const [r, g, b] = this.hexToRgb(color)
    doc.setDrawColor(r, g, b)
  }

  /**
   * Set fill color from hex
   */
  static setFillColor(doc: jsPDF, color: string): void {
    const [r, g, b] = this.hexToRgb(color)
    doc.setFillColor(r, g, b)
  }

  /**
   * Set text color from hex
   */
  static setTextColor(doc: jsPDF, color: string): void {
    const [r, g, b] = this.hexToRgb(color)
    doc.setTextColor(r, g, b)
  }

  /**
   * Generate PDF buffer for download or printing
   */
  static generateBuffer(doc: jsPDF): Uint8Array {
    return new Uint8Array(doc.output('arraybuffer'))
  }

  /**
   * Generate PDF blob for preview
   */
  static generateBlob(doc: jsPDF): Blob {
    return new Blob([this.generateBuffer(doc)], { type: 'application/pdf' })
  }

  /**
   * Download PDF file
   */
  static downloadPDF(doc: jsPDF, filename: string): void {
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  }

  /**
   * Open PDF in new window
   */
  static openPDFInNewWindow(doc: jsPDF): void {
    const blob = this.generateBlob(doc)
    const url = URL.createObjectURL(blob)
    const newWindow = window.open(url, '_blank')
    
    if (newWindow) {
      newWindow.onload = () => URL.revokeObjectURL(url)
    }
  }
}

export default PDFUtils