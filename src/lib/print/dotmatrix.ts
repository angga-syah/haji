// src/lib/print/dotmatrix.ts
import type { InvoiceWithDetails } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { amountToWords } from '@/lib/calculations/terbilang'

export interface DotMatrixConfig {
  pageWidth: number        // Characters per line
  pageHeight: number       // Lines per page
  charWidth: number        // Character width in dots
  charHeight: number       // Character height in dots
  lineSpacing: number      // Space between lines
  leftMargin: number       // Left margin in characters
  topMargin: number        // Top margin in lines
}

export interface PrintCommand {
  type: 'text' | 'newline' | 'formfeed' | 'control'
  content?: string
  position?: { x: number; y: number }
  style?: {
    bold?: boolean
    underline?: boolean
    condensed?: boolean
    expanded?: boolean
  }
  controlCode?: string
}

// Standard dot matrix configurations for common printers
export const DOT_MATRIX_CONFIGS = {
  EPSON_LX300: {
    pageWidth: 80,
    pageHeight: 66,
    charWidth: 12,
    charHeight: 24,
    lineSpacing: 1,
    leftMargin: 0,
    topMargin: 0
  } as DotMatrixConfig,
  
  EPSON_LQ2190: {
    pageWidth: 136,
    pageHeight: 66,
    charWidth: 12,
    charHeight: 24,
    lineSpacing: 1,
    leftMargin: 0,
    topMargin: 0
  } as DotMatrixConfig,

  GENERIC_9PIN: {
    pageWidth: 80,
    pageHeight: 66,
    charWidth: 12,
    charHeight: 18,
    lineSpacing: 1,
    leftMargin: 0,
    topMargin: 0
  } as DotMatrixConfig
}

// ESC/P (Epson Standard Code for Printers) control codes
export const ESC_P_CODES = {
  // Text formatting
  RESET: '\x1B@',                    // ESC @ - Reset printer
  BOLD_ON: '\x1BE',                  // ESC E - Bold on
  BOLD_OFF: '\x1BF',                 // ESC F - Bold off
  UNDERLINE_ON: '\x1B-1',            // ESC - 1 - Underline on
  UNDERLINE_OFF: '\x1B-0',           // ESC - 0 - Underline off
  CONDENSED_ON: '\x0F',              // SI - Condensed on
  CONDENSED_OFF: '\x12',             // DC2 - Condensed off
  EXPANDED_ON: '\x0E',               // SO - Expanded on
  EXPANDED_OFF: '\x14',              // DC4 - Expanded off
  
  // Line spacing
  LINE_SPACING_1_8: '\x1B0',         // ESC 0 - 1/8 inch line spacing
  LINE_SPACING_1_6: '\x1B2',         // ESC 2 - 1/6 inch line spacing
  LINE_SPACING_N_72: '\x1B3',        // ESC 3 n - n/72 inch line spacing
  
  // Paper control
  FORM_FEED: '\x0C',                 // FF - Form feed
  LINE_FEED: '\x0A',                 // LF - Line feed
  CARRIAGE_RETURN: '\x0D',           // CR - Carriage return
  
  // Character sets
  CHARSET_USA: '\x1BR\x00',          // ESC R 0 - USA character set
  CHARSET_INTERNATIONAL: '\x1BR\x01', // ESC R 1 - International character set
}

export class DotMatrixFormatter {
  private config: DotMatrixConfig
  private commands: PrintCommand[] = []
  private currentLine = 0
  private currentColumn = 0

  constructor(config: DotMatrixConfig = DOT_MATRIX_CONFIGS.EPSON_LX300) {
    this.config = config
    this.reset()
  }

  /**
   * Reset printer and clear commands
   */
  reset(): void {
    this.commands = []
    this.currentLine = 0
    this.currentColumn = 0
    this.addControlCode(ESC_P_CODES.RESET)
    this.addControlCode(ESC_P_CODES.CHARSET_INTERNATIONAL)
  }

  /**
   * Add control code command
   */
  addControlCode(code: string): void {
    this.commands.push({
      type: 'control',
      controlCode: code
    })
  }

  /**
   * Add text with optional formatting
   */
  addText(
    text: string, 
    style: PrintCommand['style'] = {},
    position?: { x: number; y: number }
  ): void {
    // Apply formatting
    if (style.bold) this.addControlCode(ESC_P_CODES.BOLD_ON)
    if (style.underline) this.addControlCode(ESC_P_CODES.UNDERLINE_ON)
    if (style.condensed) this.addControlCode(ESC_P_CODES.CONDENSED_ON)
    if (style.expanded) this.addControlCode(ESC_P_CODES.EXPANDED_ON)

    // Add text
    this.commands.push({
      type: 'text',
      content: text,
      position,
      style
    })

    // Update position
    if (position) {
      this.currentLine = position.y
      this.currentColumn = position.x + text.length
    } else {
      this.currentColumn += text.length
    }

    // Remove formatting
    if (style.expanded) this.addControlCode(ESC_P_CODES.EXPANDED_OFF)
    if (style.condensed) this.addControlCode(ESC_P_CODES.CONDENSED_OFF)
    if (style.underline) this.addControlCode(ESC_P_CODES.UNDERLINE_OFF)
    if (style.bold) this.addControlCode(ESC_P_CODES.BOLD_OFF)
  }

  /**
   * Add new line
   */
  newLine(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.commands.push({
        type: 'newline'
      })
    }
    this.currentLine += count
    this.currentColumn = 0
  }

  /**
   * Add form feed (new page)
   */
  formFeed(): void {
    this.commands.push({
      type: 'formfeed'
    })
    this.currentLine = 0
    this.currentColumn = 0
  }

  /**
   * Add centered text
   */
  addCenteredText(text: string, style: PrintCommand['style'] = {}): void {
    const padding = Math.max(0, Math.floor((this.config.pageWidth - text.length) / 2))
    const paddedText = ' '.repeat(padding) + text
    this.addText(paddedText, style)
  }

  /**
   * Add right-aligned text
   */
  addRightAlignedText(text: string, style: PrintCommand['style'] = {}): void {
    const padding = Math.max(0, this.config.pageWidth - text.length)
    const paddedText = ' '.repeat(padding) + text
    this.addText(paddedText, style)
  }

  /**
   * Add line of characters (for separators)
   */
  addSeparatorLine(char: string = '-'): void {
    this.addText(char.repeat(this.config.pageWidth))
    this.newLine()
  }

  /**
   * Add two-column text (label and value)
   */
  addTwoColumnText(
    leftText: string, 
    rightText: string, 
    leftStyle: PrintCommand['style'] = {},
    rightStyle: PrintCommand['style'] = {}
  ): void {
    const maxLeftWidth = Math.floor(this.config.pageWidth * 0.6)
    const rightStartPos = this.config.pageWidth - rightText.length

    // Truncate left text if too long
    const truncatedLeft = leftText.length > maxLeftWidth ? 
      leftText.substring(0, maxLeftWidth - 3) + '...' : leftText

    this.addText(truncatedLeft, leftStyle)
    
    // Add spacing and right text
    const spacing = rightStartPos - truncatedLeft.length
    if (spacing > 0) {
      this.addText(' '.repeat(spacing))
    }
    
    this.addText(rightText, rightStyle)
    this.newLine()
  }

  /**
   * Generate raw printer data
   */
  generatePrintData(): string {
    let output = ''

    this.commands.forEach(cmd => {
      switch (cmd.type) {
        case 'control':
          output += cmd.controlCode || ''
          break
        case 'text':
          output += cmd.content || ''
          break
        case 'newline':
          output += ESC_P_CODES.LINE_FEED
          break
        case 'formfeed':
          output += ESC_P_CODES.FORM_FEED
          break
      }
    })

    return output
  }

  /**
   * Get commands array (for debugging)
   */
  getCommands(): PrintCommand[] {
    return [...this.commands]
  }
}

export class DotMatrixInvoiceFormatter extends DotMatrixFormatter {
  /**
   * Format complete invoice for dot matrix printing
   */
  formatInvoice(invoice: InvoiceWithDetails): string {
    this.reset()

    // Header
    this.addInvoiceHeader(invoice)
    this.newLine(2)

    // Company info
    this.addCompanyInfo(invoice)
    this.newLine(2)

    // Invoice details
    this.addInvoiceDetails(invoice)
    this.newLine(2)

    // Line items
    this.addLineItems(invoice)
    this.newLine(2)

    // Totals
    this.addTotals(invoice)
    this.newLine(2)

    // Footer
    this.addFooter(invoice)

    return this.generatePrintData()
  }

  private addInvoiceHeader(invoice: InvoiceWithDetails): void {
    this.addCenteredText('INVOICE', { bold: true })
    this.newLine()
    this.addCenteredText('Spirit of Services', { bold: true })
    this.newLine()
    this.addSeparatorLine('=')
  }

  private addCompanyInfo(invoice: InvoiceWithDetails): void {
    this.addText('To: ', { bold: true })
    this.addText(invoice.company_name)
    this.newLine()
    
    // Split address into multiple lines if needed
    const addressLines = this.splitTextToWidth(invoice.company_address, this.config.pageWidth - 4)
    addressLines.forEach(line => {
      this.addText('    ' + line)
      this.newLine()
    })
  }

  private addInvoiceDetails(invoice: InvoiceWithDetails): void {
    this.addTwoColumnText('Invoice No:', invoice.invoice_number, { bold: true })
    this.addTwoColumnText('Date:', formatDate(invoice.invoice_date), { bold: true })
    this.addTwoColumnText('Place:', 'Jakarta', { bold: true })
  }

  private addLineItems(invoice: InvoiceWithDetails): void {
    this.addSeparatorLine('-')
    this.addText('NO  DATE       EXPATRIATE       DESCRIPTION           AMOUNT')
    this.newLine()
    this.addSeparatorLine('-')

    // Group lines by baris
    const groupedLines = this.groupLinesByBaris(invoice.lines || [])
    
    Object.entries(groupedLines).forEach(([barisNum, lines]) => {
      lines.forEach((line, index) => {
        const lineNo = index === 0 ? barisNum.padStart(2, ' ') : '  '
        const date = formatDate(invoice.invoice_date).substring(0, 10) // Truncate if needed
        const expatriate = this.truncateText(line.tka_nama, 15)
        const description = this.truncateText(
          line.custom_job_name || line.job_name, 20
        )
        const amount = formatCurrency(line.line_total)

        // Format line to fit within page width
        let lineText = `${lineNo} ${date} ${expatriate.padEnd(15)} ${description.padEnd(20)} ${amount}`
        
        // Truncate if too long
        if (lineText.length > this.config.pageWidth) {
          lineText = lineText.substring(0, this.config.pageWidth)
        }

        this.addText(lineText)
        this.newLine()
      })
    })

    this.addSeparatorLine('-')
  }

  private addTotals(invoice: InvoiceWithDetails): void {
    this.addTwoColumnText('Subtotal:', formatCurrency(invoice.subtotal))
    this.addTwoColumnText(`VAT (${invoice.vat_percentage}%):`, formatCurrency(invoice.vat_amount))
    this.addSeparatorLine('-')
    this.addTwoColumnText('TOTAL:', formatCurrency(invoice.total_amount), { bold: true }, { bold: true })
    this.newLine()

    // Terbilang
    const terbilang = `Terbilang: ${amountToWords(invoice.total_amount)}`
    const terbilangLines = this.splitTextToWidth(terbilang, this.config.pageWidth)
    terbilangLines.forEach(line => {
      this.addText(line)
      this.newLine()
    })
  }

  private addFooter(invoice: InvoiceWithDetails): void {
    this.newLine(2)

    // Bank information
    if (invoice.bank_name) {
      this.addText('Bank Details:', { bold: true })
      this.newLine()
      this.addText(`Bank: ${invoice.bank_name}`)
      this.newLine()
      if (invoice.bank_account_number) {
        this.addText(`Account: ${invoice.bank_account_number}`)
        this.newLine()
      }
      if (invoice.bank_account_name) {
        this.addText(`Name: ${invoice.bank_account_name}`)
        this.newLine()
      }
      this.newLine()
    }

    // Signature
    this.addText('Company,')
    this.newLine(4)
    this.addText('_____________________')
    this.newLine()
    this.addText('Authorized Signature')
    this.newLine(2)

    // Office info
    this.addText('Jakarta Office, Indonesia')
    this.newLine()
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

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  private splitTextToWidth(text: string, width: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    })

    if (currentLine) lines.push(currentLine)
    return lines
  }
}

export default DotMatrixFormatter