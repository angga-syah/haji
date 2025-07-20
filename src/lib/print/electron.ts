// src/lib/print/electron.ts
import type { InvoiceWithDetails } from '@/lib/types'
import { DotMatrixInvoiceFormatter } from './dotmatrix'

export interface ElectronPrinter {
  name: string
  displayName: string
  status: 'idle' | 'printing' | 'paused' | 'error'
  isDefault: boolean
  canDuplex: boolean
  paperSizes: string[]
  type: 'laser' | 'inkjet' | 'dotmatrix' | 'thermal' | 'unknown'
}

export interface PrintOptions {
  printer?: string
  copies?: number
  paperSize?: string
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  dpi?: number
  grayscale?: boolean
  collate?: boolean
  duplex?: 'simplex' | 'shortEdge' | 'longEdge'
}

export interface PrintJob {
  id: string
  documentName: string
  printer: string
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled'
  pages: number
  copies: number
  startTime?: Date
  endTime?: Date
  error?: string
}

// Check if running in Electron environment
export function isElectronEnvironment(): boolean {
  return !!(typeof window !== 'undefined' && (window as any).electronAPI)
}

// Get Electron API if available
function getElectronAPI(): any {
  if (!isElectronEnvironment()) {
    throw new Error('Electron API not available')
  }
  return (window as any).electronAPI
}

export class ElectronPrintService {
  /**
   * Check if Electron printing is available
   */
  static isAvailable(): boolean {
    return isElectronEnvironment()
  }

  /**
   * Get list of available printers
   */
  static async getPrinters(): Promise<ElectronPrinter[]> {
    if (!this.isAvailable()) {
      throw new Error('Electron printing not available')
    }

    try {
      const electronAPI = getElectronAPI()
      const printers = await electronAPI.printer.getPrinters()
      
      return printers.map((printer: any) => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        status: printer.status || 'idle',
        isDefault: printer.isDefault || false,
        canDuplex: printer.canDuplex || false,
        paperSizes: printer.paperSizes || ['A4', 'Letter'],
        type: this.detectPrinterType(printer.name, printer.description)
      }))
    } catch (error) {
      console.error('Error getting printers:', error)
      throw new Error('Failed to get printer list')
    }
  }

  /**
   * Get default printer
   */
  static async getDefaultPrinter(): Promise<ElectronPrinter | null> {
    const printers = await this.getPrinters()
    return printers.find(p => p.isDefault) || printers[0] || null
  }

  /**
   * Print PDF document
   */
  static async printPDF(
    pdfBuffer: Uint8Array,
    options: PrintOptions = {}
  ): Promise<PrintJob> {
    if (!this.isAvailable()) {
      throw new Error('Electron printing not available')
    }

    try {
      const electronAPI = getElectronAPI()
      
      const printOptions = {
        silent: false,
        printBackground: true,
        color: !options.grayscale,
        margin: options.margins || {
          marginType: 'printableArea'
        },
        landscape: options.orientation === 'landscape',
        pagesPerSheet: 1,
        collate: options.collate !== false,
        copies: options.copies || 1,
        pageRanges: {},
        duplexMode: options.duplex || 'simplex',
        dpi: {
          horizontal: options.dpi || 600,
          vertical: options.dpi || 600
        },
        ...options
      }

      const jobId = await electronAPI.printer.printPDF(pdfBuffer, printOptions)
      
      return {
        id: jobId,
        documentName: 'Invoice',
        printer: options.printer || 'default',
        status: 'pending',
        pages: 1,
        copies: options.copies || 1,
        startTime: new Date()
      }
    } catch (error) {
      console.error('Error printing PDF:', error)
      throw new Error('Failed to print PDF')
    }
  }

  /**
   * Print raw data (for dot matrix printers)
   */
  static async printRaw(
    data: string,
    printerName: string,
    encoding: string = 'utf8'
  ): Promise<PrintJob> {
    if (!this.isAvailable()) {
      throw new Error('Electron printing not available')
    }

    try {
      const electronAPI = getElectronAPI()
      
      const jobId = await electronAPI.printer.printRaw({
        data,
        printer: printerName,
        encoding,
        type: 'RAW'
      })

      return {
        id: jobId,
        documentName: 'Invoice (Raw)',
        printer: printerName,
        status: 'pending',
        pages: 1,
        copies: 1,
        startTime: new Date()
      }
    } catch (error) {
      console.error('Error printing raw data:', error)
      throw new Error('Failed to print raw data')
    }
  }

  /**
   * Print invoice (automatically choose best method)
   */
  static async printInvoice(
    invoice: InvoiceWithDetails,
    options: PrintOptions = {}
  ): Promise<PrintJob> {
    const printers = await this.getPrinters()
    const targetPrinter = options.printer ? 
      printers.find(p => p.name === options.printer) :
      await this.getDefaultPrinter()

    if (!targetPrinter) {
      throw new Error('No printer available')
    }

    // Use raw printing for dot matrix printers
    if (targetPrinter.type === 'dotmatrix') {
      return this.printInvoiceRaw(invoice, targetPrinter.name)
    }

    // Use PDF printing for other printers
    return this.printInvoicePDF(invoice, options)
  }

  /**
   * Print invoice as PDF
   */
  static async printInvoicePDF(
    invoice: InvoiceWithDetails,
    options: PrintOptions = {}
  ): Promise<PrintJob> {
    try {
      // Generate PDF (would import from PDF generator)
      const { generateInvoicePDF } = await import('@/lib/pdf/generator')
      const pdfBuffer = await generateInvoicePDF(invoice)
      
      return this.printPDF(pdfBuffer, options)
    } catch (error) {
      console.error('Error printing invoice PDF:', error)
      throw new Error('Failed to print invoice as PDF')
    }
  }

  /**
   * Print invoice as raw data (for dot matrix)
   */
  static async printInvoiceRaw(
    invoice: InvoiceWithDetails,
    printerName: string
  ): Promise<PrintJob> {
    try {
      const formatter = new DotMatrixInvoiceFormatter()
      const rawData = formatter.formatInvoice(invoice)
      
      return this.printRaw(rawData, printerName, 'binary')
    } catch (error) {
      console.error('Error printing invoice raw:', error)
      throw new Error('Failed to print invoice to dot matrix printer')
    }
  }

  /**
   * Get print job status
   */
  static async getJobStatus(jobId: string): Promise<PrintJob | null> {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const electronAPI = getElectronAPI()
      return await electronAPI.printer.getJobStatus(jobId)
    } catch (error) {
      console.error('Error getting job status:', error)
      return null
    }
  }

  /**
   * Cancel print job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      const electronAPI = getElectronAPI()
      return await electronAPI.printer.cancelJob(jobId)
    } catch (error) {
      console.error('Error cancelling job:', error)
      return false
    }
  }

  /**
   * Test printer connection
   */
  static async testPrinter(printerName: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      const electronAPI = getElectronAPI()
      return await electronAPI.printer.testPrinter(printerName)
    } catch (error) {
      console.error('Error testing printer:', error)
      return false
    }
  }

  /**
   * Get printer capabilities
   */
  static async getPrinterCapabilities(printerName: string): Promise<any> {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const electronAPI = getElectronAPI()
      return await electronAPI.printer.getCapabilities(printerName)
    } catch (error) {
      console.error('Error getting printer capabilities:', error)
      return null
    }
  }

  /**
   * Detect printer type based on name and description
   */
  private static detectPrinterType(name: string, description?: string): ElectronPrinter['type'] {
    const nameAndDesc = `${name} ${description || ''}`.toLowerCase()
    
    if (nameAndDesc.includes('dot') || nameAndDesc.includes('matrix') ||
        nameAndDesc.includes('lx') || nameAndDesc.includes('fx') ||
        nameAndDesc.includes('impact')) {
      return 'dotmatrix'
    }
    
    if (nameAndDesc.includes('laser') || nameAndDesc.includes('laserjet')) {
      return 'laser'
    }
    
    if (nameAndDesc.includes('inkjet') || nameAndDesc.includes('deskjet') ||
        nameAndDesc.includes('officejet')) {
      return 'inkjet'
    }
    
    if (nameAndDesc.includes('thermal') || nameAndDesc.includes('receipt')) {
      return 'thermal'
    }
    
    return 'unknown'
  }
}

// Print queue management
export class PrintQueue {
  private static jobs: Map<string, PrintJob> = new Map()
  private static listeners: Map<string, (job: PrintJob) => void> = new Map()

  /**
   * Add job to queue
   */
  static addJob(job: PrintJob): void {
    this.jobs.set(job.id, job)
    this.notifyListeners(job.id)
  }

  /**
   * Update job status
   */
  static updateJob(jobId: string, updates: Partial<PrintJob>): void {
    const job = this.jobs.get(jobId)
    if (job) {
      Object.assign(job, updates)
      this.notifyListeners(jobId)
    }
  }

  /**
   * Get job by ID
   */
  static getJob(jobId: string): PrintJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get all jobs
   */
  static getAllJobs(): PrintJob[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Remove completed/failed jobs
   */
  static cleanup(): void {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    for (const [id, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') &&
          job.endTime && job.endTime < oneHourAgo) {
        this.jobs.delete(id)
        this.listeners.delete(id)
      }
    }
  }

  /**
   * Listen to job status changes
   */
  static onJobUpdate(jobId: string, callback: (job: PrintJob) => void): () => void {
    this.listeners.set(jobId, callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(jobId)
    }
  }

  private static notifyListeners(jobId: string): void {
    const job = this.jobs.get(jobId)
    const listener = this.listeners.get(jobId)
    
    if (job && listener) {
      listener(job)
    }
  }
}

// Fallback for non-Electron environments
export class BrowserPrintFallback {
  /**
   * Print using browser's print dialog
   */
  static async printPDF(pdfBuffer: Uint8Array): Promise<void> {
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
        printWindow.onafterprint = () => {
          printWindow.close()
          URL.revokeObjectURL(url)
        }
      }
    }
  }

  /**
   * Print invoice using browser
   */
  static async printInvoice(invoice: InvoiceWithDetails): Promise<void> {
    try {
      const { generateInvoicePDF } = await import('@/lib/pdf/generator')
      const pdfBuffer = await generateInvoicePDF(invoice)
      await this.printPDF(pdfBuffer)
    } catch (error) {
      console.error('Error printing with browser fallback:', error)
      throw new Error('Failed to print invoice')
    }
  }
}

export default ElectronPrintService