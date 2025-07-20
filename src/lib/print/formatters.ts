// src/lib/print/formatters.ts
import type { InvoiceWithDetails, Company, TKAWorker } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { amountToWords } from '@/lib/calculations/terbilang'

export interface PrintFormat {
  name: string
  description: string
  pageWidth: number
  pageHeight: number
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
  fontSize: number
  lineHeight: number
}

export const PRINT_FORMATS: Record<string, PrintFormat> = {
  A4_PORTRAIT: {
    name: 'A4 Portrait',
    description: 'Standard A4 paper in portrait orientation',
    pageWidth: 210,
    pageHeight: 297,
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    fontSize: 10,
    lineHeight: 1.4
  },
  A4_LANDSCAPE: {
    name: 'A4 Landscape',
    description: 'Standard A4 paper in landscape orientation',
    pageWidth: 297,
    pageHeight: 210,
    margins: { top: 15, bottom: 15, left: 20, right: 20 },
    fontSize: 9,
    lineHeight: 1.3
  },
  LETTER_PORTRAIT: {
    name: 'Letter Portrait',
    description: 'US Letter paper in portrait orientation',
    pageWidth: 216,
    pageHeight: 279,
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    fontSize: 10,
    lineHeight: 1.4
  },
  DOT_MATRIX_80: {
    name: 'Dot Matrix 80 Column',
    description: 'Standard 80-column dot matrix printer',
    pageWidth: 80, // characters
    pageHeight: 66, // lines
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    fontSize: 12,
    lineHeight: 1.0
  },
  DOT_MATRIX_132: {
    name: 'Dot Matrix 132 Column',
    description: 'Wide 132-column dot matrix printer',
    pageWidth: 132, // characters
    pageHeight: 66, // lines
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    fontSize: 10,
    lineHeight: 1.0
  },
  THERMAL_58MM: {
    name: 'Thermal 58mm',
    description: '58mm thermal receipt printer',
    pageWidth: 32, // characters
    pageHeight: 0, // continuous
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    fontSize: 8,
    lineHeight: 1.0
  },
  THERMAL_80MM: {
    name: 'Thermal 80mm',
    description: '80mm thermal receipt printer',
    pageWidth: 48, // characters
    pageHeight: 0, // continuous
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    fontSize: 9,
    lineHeight: 1.0
  }
}

export interface FormattedLine {
  content: string
  alignment: 'left' | 'center' | 'right'
  style: {
    bold?: boolean
    underline?: boolean
    fontSize?: number
    spacing?: number
  }
}

export class PrintFormatter {
  protected format: PrintFormat
  protected lines: FormattedLine[] = []

  constructor(format: PrintFormat) {
    this.format = format
  }

  /**
   * Add a line with specified formatting
   */
  addLine(
    content: string,
    alignment: FormattedLine['alignment'] = 'left',
    style: FormattedLine['style'] = {}
  ): void {
    this.lines.push({
      content,
      alignment,
      style: {
        fontSize: this.format.fontSize,
        spacing: 1,
        ...style
      }
    })
  }

  /**
   * Add multiple lines at once
   */
  addLines(lines: string[], alignment?: FormattedLine['alignment']): void {
    lines.forEach(line => this.addLine(line, alignment))
  }

  /**
   * Add centered text
   */
  addCentered(content: string, style?: FormattedLine['style']): void {
    this.addLine(content, 'center', style)
  }

  /**
   * Add right-aligned text
   */
  addRight(content: string, style?: FormattedLine['style']): void {
    this.addLine(content, 'right', style)
  }

  /**
   * Add separator line
   */
  addSeparator(char: string = '-', style?: FormattedLine['style']): void {
    const width = this.format.pageWidth
    this.addLine(char.repeat(width), 'left', style)
  }

  /**
   * Add empty line(s)
   */
  addSpace(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.addLine('')
    }
  }

  /**
   * Add two-column layout
   */
  addTwoColumns(
    leftText: string,
    rightText: string,
    leftWidth?: number
  ): void {
    const width = this.format.pageWidth
    const leftColWidth = leftWidth || Math.floor(width * 0.6)
    const rightColWidth = width - leftColWidth

    // Truncate left text if needed
    const truncatedLeft = leftText.length > leftColWidth 
      ? leftText.substring(0, leftColWidth - 3) + '...'
      : leftText

    // Pad left text and add right text
    const line = truncatedLeft.padEnd(leftColWidth) + 
                 rightText.padStart(rightColWidth)

    this.addLine(line)
  }

  /**
   * Get all formatted lines
   */
  getLines(): FormattedLine[] {
    return [...this.lines]
  }

  /**
   * Clear all lines
   */
  clear(): void {
    this.lines = []
  }

  /**
   * Get plain text output
   */
  getPlainText(): string {
    return this.lines.map(line => {
      const content = line.content
      
      switch (line.alignment) {
        case 'center':
          const padding = Math.max(0, Math.floor((this.format.pageWidth - content.length) / 2))
          return ' '.repeat(padding) + content
        
        case 'right':
          const rightPadding = Math.max(0, this.format.pageWidth - content.length)
          return ' '.repeat(rightPadding) + content
        
        default:
          return content
      }
    }).join('\n')
  }

  /**
   * Word wrap text to fit page width
   */
  protected wrapText(text: string, maxWidth?: number): string[] {
    const width = maxWidth || this.format.pageWidth
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word.length > width ? word.substring(0, width) : word
      }
    })

    if (currentLine) lines.push(currentLine)
    return lines
  }

  /**
   * Truncate text to fit width
   */
  protected truncateText(text: string, maxWidth: number, suffix: string = '...'): string {
    if (text.length <= maxWidth) return text
    return text.substring(0, maxWidth - suffix.length) + suffix
  }
}

export class InvoiceFormatter extends PrintFormatter {
  constructor(format: PrintFormat = PRINT_FORMATS.A4_PORTRAIT) {
    super(format)
  }

  /**
   * Format complete invoice
   */
  formatInvoice(invoice: InvoiceWithDetails): string {
    this.clear()

    this.addHeader(invoice)
    this.addSpace(2)
    this.addInvoiceDetails(invoice)
    this.addSpace(2)
    this.addRecipientInfo(invoice)
    this.addSpace(2)
    this.addLineItems(invoice)
    this.addSpace(2)
    this.addTotals(invoice)
    this.addSpace(2)
    this.addFooter(invoice)

    return this.getPlainText()
  }

  private addHeader(invoice: InvoiceWithDetails): void {
    this.addCentered('INVOICE', { bold: true, fontSize: 16 })
    this.addCentered('Spirit of Services', { bold: true })
    this.addSeparator('=')
  }

  private addInvoiceDetails(invoice: InvoiceWithDetails): void {
    this.addTwoColumns('Invoice No:', invoice.invoice_number)
    this.addTwoColumns('Date:', formatDate(invoice.invoice_date))
    this.addTwoColumns('Place:', 'Jakarta')
  }

  private addRecipientInfo(invoice: InvoiceWithDetails): void {
    this.addLine('To:', 'left', { bold: true })
    this.addLine(invoice.company_name, 'left', { bold: true })
    
    // Split address into multiple lines
    const addressLines = this.wrapText(invoice.company_address, this.format.pageWidth - 4)
    addressLines.forEach(line => {
      this.addLine('    ' + line)
    })
  }

  private addLineItems(invoice: InvoiceWithDetails): void {
    this.addSeparator('-')
    
    // Header
    const headerFormat = this.format.pageWidth > 80 ? 'detailed' : 'compact'
    
    if (headerFormat === 'detailed') {
      this.addLine('NO   DATE         EXPATRIATE           DESCRIPTION                    AMOUNT')
    } else {
      this.addLine('NO DATE     EXPATRIATE    DESCRIPTION      AMOUNT')
    }
    
    this.addSeparator('-')

    // Group lines by baris
    const groupedLines = this.groupLinesByBaris(invoice.lines || [])
    
    Object.entries(groupedLines).forEach(([barisNum, lines]) => {
      lines.forEach((line, index) => {
        this.addInvoiceLineItem(line, barisNum, index === 0, headerFormat)
      })
    })

    this.addSeparator('-')
  }

  private addInvoiceLineItem(
    line: any,
    barisNum: string,
    showBaris: boolean,
    format: 'detailed' | 'compact'
  ): void {
    const lineNo = showBaris ? barisNum.padStart(3, ' ') : '   '
    const date = formatDate(line.created_at || new Date()).substring(0, 10)
    
    if (format === 'detailed') {
      const expatriate = this.truncateText(line.tka_nama, 20)
      const description = this.truncateText(
        line.custom_job_name || line.job_name, 30
      )
      const amount = formatCurrency(line.line_total)

      this.addLine(`${lineNo} ${date} ${expatriate.padEnd(20)} ${description.padEnd(30)} ${amount}`)
    } else {
      const expatriate = this.truncateText(line.tka_nama, 12)
      const description = this.truncateText(
        line.custom_job_name || line.job_name, 16
      )
      const amount = formatCurrency(line.line_total)

      this.addLine(`${lineNo} ${date} ${expatriate.padEnd(12)} ${description.padEnd(16)} ${amount}`)
    }
  }

  private addTotals(invoice: InvoiceWithDetails): void {
    this.addTwoColumns('Subtotal:', formatCurrency(invoice.subtotal))
    this.addTwoColumns(`VAT (${invoice.vat_percentage}%):`, formatCurrency(invoice.vat_amount))
    this.addSeparator('-')
    this.addTwoColumns('TOTAL:', formatCurrency(invoice.total_amount))
    this.addSpace()

    // Terbilang
    const terbilang = `Terbilang: ${amountToWords(invoice.total_amount)}`
    const terbilangLines = this.wrapText(terbilang)
    this.addLines(terbilangLines)
  }

  private addFooter(invoice: InvoiceWithDetails): void {
    this.addSpace(2)

    // Bank information
    if (invoice.bank_name) {
      this.addLine('Bank Details:', 'left', { bold: true })
      this.addLine(`Bank: ${invoice.bank_name}`)
      
      if (invoice.bank_account_number) {
        this.addLine(`Account: ${invoice.bank_account_number}`)
      }
      
      if (invoice.bank_account_name) {
        this.addLine(`Name: ${invoice.bank_account_name}`)
      }
      
      this.addSpace()
    }

    // Signature area
    this.addTwoColumns('Company,', `Date: ${formatDate(new Date())}`)
    this.addSpace(3)
    this.addTwoColumns('_____________________', '_____________________')
    this.addTwoColumns('Authorized Signature', 'Received by')
    this.addSpace()

    // Office information
    this.addCentered('Jakarta Office, Indonesia')
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
}

export class CompanyListFormatter extends PrintFormatter {
  constructor(format: PrintFormat = PRINT_FORMATS.A4_PORTRAIT) {
    super(format)
  }

  /**
   * Format company list
   */
  formatCompanyList(companies: Company[]): string {
    this.clear()

    this.addCentered('COMPANY LIST', { bold: true, fontSize: 16 })
    this.addCentered(`Generated: ${formatDate(new Date())}`)
    this.addSeparator('=')
    this.addSpace()

    // Header
    this.addLine('NO   COMPANY NAME                     NPWP              STATUS')
    this.addSeparator('-')

    // Companies
    companies.forEach((company, index) => {
      const no = (index + 1).toString().padStart(3, ' ')
      const name = this.truncateText(company.company_name, 30)
      const npwp = company.npwp
      const status = company.is_active ? 'ACTIVE' : 'INACTIVE'

      this.addLine(`${no}  ${name.padEnd(30)} ${npwp} ${status}`)
    })

    this.addSeparator('-')
    this.addLine(`Total: ${companies.length} companies`)

    return this.getPlainText()
  }
}

export class TKAWorkerListFormatter extends PrintFormatter {
  constructor(format: PrintFormat = PRINT_FORMATS.A4_PORTRAIT) {
    super(format)
  }

  /**
   * Format TKA worker list
   */
  formatTKAWorkerList(workers: TKAWorker[]): string {
    this.clear()

    this.addCentered('TKA WORKER LIST', { bold: true, fontSize: 16 })
    this.addCentered(`Generated: ${formatDate(new Date())}`)
    this.addSeparator('=')
    this.addSpace()

    // Header
    this.addLine('NO   NAME                         PASSPORT     DIVISION         STATUS')
    this.addSeparator('-')

    // Workers
    workers.forEach((worker, index) => {
      const no = (index + 1).toString().padStart(3, ' ')
      const name = this.truncateText(worker.nama, 25)
      const passport = worker.passport.padEnd(12)
      const division = this.truncateText(worker.divisi || '-', 15)
      const status = worker.is_active ? 'ACTIVE' : 'INACTIVE'

      this.addLine(`${no}  ${name.padEnd(25)} ${passport} ${division.padEnd(15)} ${status}`)
    })

    this.addSeparator('-')
    this.addLine(`Total: ${workers.length} workers`)

    return this.getPlainText()
  }
}

// Export formatters and utilities
export const formatters = {
  invoice: InvoiceFormatter,
  companyList: CompanyListFormatter,
  tkaWorkerList: TKAWorkerListFormatter
}

export function getFormatterForPrinterType(printerType: string): PrintFormat {
  switch (printerType) {
    case 'dotmatrix':
      return PRINT_FORMATS.DOT_MATRIX_80
    case 'thermal':
      return PRINT_FORMATS.THERMAL_80MM
    case 'laser':
    case 'inkjet':
    default:
      return PRINT_FORMATS.A4_PORTRAIT
  }
}

export default PrintFormatter