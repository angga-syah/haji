// hooks/business/usePrint.ts
import { useState, useCallback } from 'react'
import { useLocalStorage } from '@/hooks/ui/useLocalStorage'
import { usePrintInvoice, useInvoicePDF } from '@/hooks/api/useInvoices'

// ========== TYPES ==========
interface PrintSettings {
  printer: string
  paperSize: 'a4' | 'letter' | 'dotmatrix'
  copies: number
  orientation: 'portrait' | 'landscape'
  quality: 'draft' | 'normal' | 'high'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

interface PrintJob {
  id: string
  invoiceId: string
  invoiceNumber: string
  status: 'pending' | 'printing' | 'completed' | 'failed'
  timestamp: Date
  settings: PrintSettings
  error?: string
}

interface PrinterInfo {
  id: string
  name: string
  type: 'laser' | 'inkjet' | 'dotmatrix' | 'thermal'
  status: 'ready' | 'busy' | 'offline' | 'error'
  isDefault: boolean
  paperSizes: string[]
  capabilities: {
    color: boolean
    duplex: boolean
    maxCopies: number
  }
}

// ========== DEFAULT SETTINGS ==========
const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  printer: '',
  paperSize: 'a4',
  copies: 1,
  orientation: 'portrait',
  quality: 'normal',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  }
}

// ========== MAIN HOOK ==========
export function usePrint() {
  // State
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([])
  const [availablePrinters, setAvailablePrinters] = useState<PrinterInfo[]>([])
  const [isDetectingPrinters, setIsDetectingPrinters] = useState(false)
  
  // Persistent settings
  const [printSettings, setPrintSettings] = useLocalStorage<PrintSettings>(
    'print-settings',
    DEFAULT_PRINT_SETTINGS
  )
  
  // API hooks
  const printInvoiceMutation = usePrintInvoice()
  const generatePDFMutation = useInvoicePDF()
  
  // ========== PRINTER DETECTION ==========
  const detectPrinters = useCallback(async () => {
    setIsDetectingPrinters(true)
    
    try {
      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const printers = await (window as any).electronAPI.getPrinters()
        setAvailablePrinters(printers.map((printer: any, index: number) => ({
          id: printer.name,
          name: printer.displayName || printer.name,
          type: getPrinterType(printer.name),
          status: printer.status === 'idle' ? 'ready' : 'busy',
          isDefault: printer.isDefault || index === 0,
          paperSizes: printer.options?.paperSizes || ['A4', 'Letter'],
          capabilities: {
            color: printer.options?.color || false,
            duplex: printer.options?.duplex || false,
            maxCopies: 99
          }
        })))
      } else {
        // Browser environment - simulate or use Web API
        const mockPrinters: PrinterInfo[] = [
          {
            id: 'default',
            name: 'Default Printer',
            type: 'laser',
            status: 'ready',
            isDefault: true,
            paperSizes: ['A4', 'Letter'],
            capabilities: {
              color: true,
              duplex: true,
              maxCopies: 99
            }
          }
        ]
        setAvailablePrinters(mockPrinters)
      }
    } catch (error) {
      console.error('Failed to detect printers:', error)
      setAvailablePrinters([])
    } finally {
      setIsDetectingPrinters(false)
    }
  }, [])
  
  // ========== PRINTER TYPE DETECTION ==========
  const getPrinterType = (printerName: string): PrinterInfo['type'] => {
    const name = printerName.toLowerCase()
    if (name.includes('lx') || name.includes('fx') || name.includes('dot')) return 'dotmatrix'
    if (name.includes('laser')) return 'laser'
    if (name.includes('inkjet') || name.includes('deskjet')) return 'inkjet'
    if (name.includes('thermal')) return 'thermal'
    return 'laser' // default
  }
  
  // ========== PRINT FUNCTIONS ==========
  const printInvoice = useCallback(async (
    invoiceId: string,
    invoiceNumber: string,
    settings?: Partial<PrintSettings>
  ) => {
    const finalSettings = { ...printSettings, ...settings }
    
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newJob: PrintJob = {
      id: jobId,
      invoiceId,
      invoiceNumber,
      status: 'pending',
      timestamp: new Date(),
      settings: finalSettings
    }
    
    setPrintJobs(prev => [newJob, ...prev])
    
    try {
      // Update job status
      setPrintJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'printing' } : job
      ))
      
      // Check if we have Electron printing capabilities
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Use Electron for direct printer access
        await (window as any).electronAPI.printInvoice({
          invoiceId,
          printer: finalSettings.printer,
          copies: finalSettings.copies,
          paperSize: finalSettings.paperSize
        })
      } else {
        // Use API endpoint for server-side printing
        await printInvoiceMutation.mutateAsync({
          id: invoiceId,
          copies: finalSettings.copies,
          printer: finalSettings.printer
        })
      }
      
      // Mark job as completed
      setPrintJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'completed' } : job
      ))
      
      return { success: true, jobId }
      
    } catch (error) {
      // Mark job as failed
      setPrintJobs(prev => prev.map(job => 
        job.id === jobId ? { 
          ...job, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Print failed'
        } : job
      ))
      
      throw error
    }
  }, [printSettings, printInvoiceMutation])
  
  // ========== PDF FUNCTIONS ==========
  const generateAndDownloadPDF = useCallback(async (invoiceId: string, filename?: string) => {
    try {
      const blob = await generatePDFMutation.mutateAsync(invoiceId)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `invoice-${invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return { success: true }
    } catch (error) {
      console.error('PDF generation failed:', error)
      throw error
    }
  }, [generatePDFMutation])
  
  const generateAndPrintPDF = useCallback(async (invoiceId: string) => {
    try {
      const blob = await generatePDFMutation.mutateAsync(invoiceId)
      
      // Create blob URL and open in new window for printing
      const url = window.URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
          // Clean up after printing
          setTimeout(() => {
            printWindow.close()
            window.URL.revokeObjectURL(url)
          }, 1000)
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('PDF print failed:', error)
      throw error
    }
  }, [generatePDFMutation])
  
  // ========== SETTINGS MANAGEMENT ==========
  const updatePrintSettings = useCallback((updates: Partial<PrintSettings>) => {
    setPrintSettings(prev => ({ ...prev, ...updates }))
  }, [setPrintSettings])
  
  const resetPrintSettings = useCallback(() => {
    setPrintSettings(DEFAULT_PRINT_SETTINGS)
  }, [setPrintSettings])
  
  // ========== JOB MANAGEMENT ==========
  const clearPrintJobs = useCallback(() => {
    setPrintJobs([])
  }, [])
  
  const removePrintJob = useCallback((jobId: string) => {
    setPrintJobs(prev => prev.filter(job => job.id !== jobId))
  }, [])
  
  const retryPrintJob = useCallback(async (jobId: string) => {
    const job = printJobs.find(j => j.id === jobId)
    if (!job) return
    
    return printInvoice(job.invoiceId, job.invoiceNumber, job.settings)
  }, [printJobs, printInvoice])
  
  // ========== PRINT PREVIEW ==========
  const openPrintPreview = useCallback((invoiceId: string) => {
    const previewUrl = `/invoices/${invoiceId}/print`
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
  }, [])
  
  // ========== BATCH PRINTING ==========
  const printMultipleInvoices = useCallback(async (
    invoices: Array<{ id: string; number: string }>,
    settings?: Partial<PrintSettings>
  ) => {
    const results = []
    
    for (const invoice of invoices) {
      try {
        const result = await printInvoice(invoice.id, invoice.number, settings)
        results.push({ ...invoice, success: true, result })
      } catch (error) {
        results.push({ 
          ...invoice, 
          success: false, 
          error: error instanceof Error ? error.message : 'Print failed' 
        })
      }
      
      // Small delay between prints to avoid overwhelming the printer
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return results
  }, [printInvoice])
  
  // ========== UTILITIES ==========
  const getDefaultPrinter = useCallback(() => {
    return availablePrinters.find(printer => printer.isDefault) || availablePrinters[0]
  }, [availablePrinters])
  
  const isPrinterAvailable = useCallback((printerId: string) => {
    const printer = availablePrinters.find(p => p.id === printerId)
    return printer && printer.status === 'ready'
  }, [availablePrinters])
  
  // ========== RETURN OBJECT ==========
  return {
    // Settings
    printSettings,
    updatePrintSettings,
    resetPrintSettings,
    
    // Printers
    availablePrinters,
    detectPrinters,
    isDetectingPrinters,
    getDefaultPrinter,
    isPrinterAvailable,
    
    // Print jobs
    printJobs,
    clearPrintJobs,
    removePrintJob,
    retryPrintJob,
    
    // Print functions
    printInvoice,
    printMultipleInvoices,
    openPrintPreview,
    
    // PDF functions
    generateAndDownloadPDF,
    generateAndPrintPDF,
    
    // Status
    isGeneratingPDF: generatePDFMutation.isPending,
    isPrinting: printInvoiceMutation.isPending,
    
    // Computed stats
    pendingJobs: printJobs.filter(job => job.status === 'pending').length,
    failedJobs: printJobs.filter(job => job.status === 'failed').length,
    completedJobs: printJobs.filter(job => job.status === 'completed').length
  }
}

// ========== PRINT CONTEXT ==========
export interface PrintContextType extends ReturnType<typeof usePrint> {}

// ========== UTILITIES ==========
export const PrintUtils = {
  formatPaperSize: (size: string) => {
    switch (size.toLowerCase()) {
      case 'a4': return 'A4 (210 × 297 mm)'
      case 'letter': return 'Letter (8.5 × 11 in)'
      case 'dotmatrix': return 'Continuous (9.5 × 11 in)'
      default: return size
    }
  },
  
  formatPrinterType: (type: PrinterInfo['type']) => {
    switch (type) {
      case 'laser': return 'Laser Printer'
      case 'inkjet': return 'Inkjet Printer'
      case 'dotmatrix': return 'Dot Matrix Printer'
      case 'thermal': return 'Thermal Printer'
      default: return 'Unknown Printer'
    }
  },
  
  getPrintIcon: (type: PrinterInfo['type']) => {
    // Return appropriate icon class or component for printer type
    return 'printer-icon'
  }
}