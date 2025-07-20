// src/electron/main/printer.ts
import { BrowserWindow, webContents } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'

export interface PrinterInfo {
  name: string
  displayName: string
  description: string
  status: string
  isDefault: boolean
  canDuplex: boolean
  paperSizes: string[]
  type: 'laser' | 'inkjet' | 'dotmatrix' | 'thermal' | 'unknown'
}

export interface PrintJob {
  id: string
  documentName: string
  printer: string
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled'
  pages: number
  copies: number
  startTime: Date
  endTime?: Date
  error?: string
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
  silent?: boolean
  color?: boolean
  dpi?: number
  scale?: number
  pageRanges?: string
}

export class PrinterManager {
  private static jobs: Map<string, PrintJob> = new Map()
  private static initialized = false

  /**
   * Initialize printer manager
   */
  static initialize(): void {
    if (this.initialized) return

    // Clean up old jobs periodically
    setInterval(() => {
      this.cleanupOldJobs()
    }, 5 * 60 * 1000) // Every 5 minutes

    this.initialized = true
    console.log('PrinterManager initialized')
  }

  /**
   * Get list of available printers
   */
  static async getPrinters(): Promise<PrinterInfo[]> {
    try {
      // Create a temporary window to access printer APIs
      const tempWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const printers = await tempWindow.webContents.getPrintersAsync()
      tempWindow.close()

      return printers.map(printer => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        description: printer.description || '',
        status: printer.status || 'unknown',
        isDefault: printer.isDefault || false,
        canDuplex: printer.canDuplex || false,
        paperSizes: this.extractPaperSizes(printer.options),
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
  static async getDefaultPrinter(): Promise<PrinterInfo | null> {
    try {
      const printers = await this.getPrinters()
      return printers.find(p => p.isDefault) || printers[0] || null
    } catch (error) {
      console.error('Error getting default printer:', error)
      return null
    }
  }

  /**
   * Print PDF document
   */
  static async printPDF(
    pdfBuffer: Uint8Array,
    options: PrintOptions = {}
  ): Promise<string> {
    const jobId = uuidv4()
    
    try {
      // Create print job
      const job: PrintJob = {
        id: jobId,
        documentName: `Invoice-${Date.now()}`,
        printer: options.printer || 'default',
        status: 'pending',
        pages: 1,
        copies: options.copies || 1,
        startTime: new Date()
      }

      this.jobs.set(jobId, job)

      // Create temporary file for PDF
      const tempPath = join(tmpdir(), `invoice-${jobId}.pdf`)
      await writeFile(tempPath, pdfBuffer)

      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Load PDF file
      await printWindow.loadFile(tempPath)

      // Prepare print options
      const printOptions: Electron.WebContentsPrintOptions = {
        silent: options.silent !== false,
        printBackground: true,
        color: options.color !== false,
        margin: options.margins ? {
          marginType: 'custom',
          top: options.margins.top,
          bottom: options.margins.bottom,
          left: options.margins.left,
          right: options.margins.right
        } : { marginType: 'printableArea' },
        landscape: options.orientation === 'landscape',
        pagesPerSheet: 1,
        collate: true,
        copies: options.copies || 1,
        header: '',
        footer: '',
        pageSize: options.paperSize || 'A4',
        scaleFactor: options.scale || 100,
        ...(options.pageRanges && { pageRanges: options.pageRanges })
      }

      // Add device name if specified
      if (options.printer && options.printer !== 'default') {
        (printOptions as any).deviceName = options.printer
      }

      // Update job status
      job.status = 'printing'
      this.jobs.set(jobId, job)

      // Print the document
      const success = await printWindow.webContents.print(printOptions)

      // Clean up
      printWindow.close()
      
      try {
        await unlink(tempPath)
      } catch {
        // Ignore cleanup errors
      }

      // Update job status
      job.status = success ? 'completed' : 'failed'
      job.endTime = new Date()
      if (!success) {
        job.error = 'Print job failed'
      }
      this.jobs.set(jobId, job)

      return jobId
    } catch (error) {
      // Update job status on error
      const job = this.jobs.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : 'Unknown error'
        job.endTime = new Date()
        this.jobs.set(jobId, job)
      }

      throw error
    }
  }

  /**
   * Print raw data (for dot matrix printers)
   */
  static async printRaw(
    data: string,
    printerName: string,
    encoding: string = 'utf8'
  ): Promise<string> {
    const jobId = uuidv4()

    try {
      // Create print job
      const job: PrintJob = {
        id: jobId,
        documentName: `Raw-Print-${Date.now()}`,
        printer: printerName,
        status: 'pending',
        pages: 1,
        copies: 1,
        startTime: new Date()
      }

      this.jobs.set(jobId, job)

      // For raw printing, we need to use OS-specific commands
      const success = await this.printRawData(data, printerName, encoding)

      // Update job status
      job.status = success ? 'completed' : 'failed'
      job.endTime = new Date()
      if (!success) {
        job.error = 'Raw print job failed'
      }
      this.jobs.set(jobId, job)

      return jobId
    } catch (error) {
      // Update job status on error
      const job = this.jobs.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : 'Unknown error'
        job.endTime = new Date()
        this.jobs.set(jobId, job)
      }

      throw error
    }
  }

  /**
   * Get print job status
   */
  static async getJobStatus(jobId: string): Promise<PrintJob | null> {
    return this.jobs.get(jobId) || null
  }

  /**
   * Cancel print job
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    if (!job) return false

    if (job.status === 'pending' || job.status === 'printing') {
      job.status = 'cancelled'
      job.endTime = new Date()
      this.jobs.set(jobId, job)
      return true
    }

    return false
  }

  /**
   * Test printer connection
   */
  static async testPrinter(printerName: string): Promise<boolean> {
    try {
      const testData = 'TEST PRINT\n\nThis is a test print from Invoice Management System.\n\nIf you can see this, your printer is working correctly.\n\n'
      
      // Try to print a simple test page
      const jobId = await this.printRaw(testData, printerName)
      const job = await this.getJobStatus(jobId)
      
      return job?.status === 'completed'
    } catch (error) {
      console.error('Printer test failed:', error)
      return false
    }
  }

  /**
   * Get all print jobs
   */
  static getAllJobs(): PrintJob[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Clear completed jobs
   */
  static clearCompletedJobs(): number {
    const completed = Array.from(this.jobs.entries()).filter(
      ([, job]) => job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
    )

    completed.forEach(([id]) => this.jobs.delete(id))
    return completed.length
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Print raw data to printer (OS-specific implementation)
   */
  private static async printRawData(
    data: string,
    printerName: string,
    encoding: string
  ): Promise<boolean> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      // Create temporary file
      const tempPath = join(tmpdir(), `raw-print-${uuidv4()}.txt`)
      await writeFile(tempPath, data, encoding as BufferEncoding)

      let command: string

      switch (process.platform) {
        case 'win32':
          // Windows: Use print command
          command = `print /D:"${printerName}" "${tempPath}"`
          break

        case 'darwin':
          // macOS: Use lp command
          command = `lp -d "${printerName}" "${tempPath}"`
          break

        case 'linux':
          // Linux: Use lp command
          command = `lp -d "${printerName}" "${tempPath}"`
          break

        default:
          throw new Error(`Unsupported platform: ${process.platform}`)
      }

      await execAsync(command)

      // Clean up temp file
      try {
        await unlink(tempPath)
      } catch {
        // Ignore cleanup errors
      }

      return true
    } catch (error) {
      console.error('Raw printing error:', error)
      return false
    }
  }

  /**
   * Detect printer type based on name and description
   */
  private static detectPrinterType(
    name: string,
    description?: string
  ): PrinterInfo['type'] {
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

  /**
   * Extract paper sizes from printer options
   */
  private static extractPaperSizes(options: any): string[] {
    const defaultSizes = ['A4', 'Letter', 'Legal', 'A3', 'A5']
    
    if (options?.media_size) {
      return options.media_size
    }

    return defaultSizes
  }

  /**
   * Clean up old completed jobs
   */
  private static cleanupOldJobs(): void {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    for (const [id, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
          job.endTime && job.endTime < oneHourAgo) {
        this.jobs.delete(id)
      }
    }
  }
}

export default PrinterManager