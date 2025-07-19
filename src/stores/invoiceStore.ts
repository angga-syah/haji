// stores/invoiceStore.ts
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  Invoice, 
  InvoiceLine, 
  Company, 
  TKAWorker, 
  JobDescription,
  CreateInvoiceLineData,
  InvoiceTotals 
} from '@/lib/types'
import { InvoiceCalculator } from '@/lib/calculations/invoice'

interface InvoiceLineWithDetails extends CreateInvoiceLineData {
  id?: string
  line_order: number
  unit_price: number
  line_total: number
  tka_name?: string
  job_name?: string
}

interface InvoiceState {
  // Current invoice being created/edited
  currentInvoice: Partial<Invoice> | null
  
  // Invoice lines
  lines: InvoiceLineWithDetails[]
  
  // Selected data
  selectedCompany: Company | null
  
  // Calculation totals
  totals: InvoiceTotals
  
  // UI state
  isCalculating: boolean
  isDirty: boolean
  autoSaveId: string | null
  
  // Actions
  setCurrentInvoice: (invoice: Partial<Invoice> | null) => void
  setSelectedCompany: (company: Company | null) => void
  
  // Line management
  addLine: (line: CreateInvoiceLineData) => void
  updateLine: (index: number, updates: Partial<InvoiceLineWithDetails>) => void
  removeLine: (index: number) => void
  reorderLines: (fromIndex: number, toIndex: number) => void
  clearLines: () => void
  
  // Calculation
  recalculateTotals: () => void
  
  // State management
  setDirty: (dirty: boolean) => void
  reset: () => void
  
  // Auto-save
  setAutoSaveId: (id: string | null) => void
  
  // Validation
  validateInvoice: () => { isValid: boolean; errors: string[] }
}

const initialTotals: InvoiceTotals = {
  subtotal: 0,
  vat_amount: 0,
  total_amount: 0,
  vat_percentage: 11
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      currentInvoice: null,
      lines: [],
      selectedCompany: null,
      totals: initialTotals,
      isCalculating: false,
      isDirty: false,
      autoSaveId: null,

      setCurrentInvoice: (invoice) => {
        set({ currentInvoice: invoice, isDirty: true })
      },

      setSelectedCompany: (company) => {
        set({ selectedCompany: company, isDirty: true })
      },

      addLine: (line) => {
        const { lines } = get()
        const newLines = [...lines]
        
        const lineOrder = newLines.length + 1
        const unitPrice = line.custom_price || 0 // Will be updated when job is selected
        const lineTotal = InvoiceCalculator.calculateLineTotal(
          line.quantity, 
          unitPrice, 
          line.custom_price
        )
        
        const newLine: InvoiceLineWithDetails = {
          ...line,
          line_order: lineOrder,
          unit_price: unitPrice,
          line_total: lineTotal,
          baris: line.baris || lineOrder
        }
        
        newLines.push(newLine)
        
        set({ lines: newLines, isDirty: true })
        get().recalculateTotals()
      },

      updateLine: (index, updates) => {
        const { lines } = get()
        const newLines = [...lines]
        
        if (newLines[index]) {
          const updatedLine = { ...newLines[index], ...updates }
          
          // Recalculate line total if quantity or price changed
          if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.custom_price !== undefined) {
            updatedLine.line_total = InvoiceCalculator.calculateLineTotal(
              updatedLine.quantity,
              updatedLine.unit_price,
              updatedLine.custom_price
            )
          }
          
          newLines[index] = updatedLine
          set({ lines: newLines, isDirty: true })
          get().recalculateTotals()
        }
      },

      removeLine: (index) => {
        const { lines } = get()
        const newLines = lines.filter((_, i) => i !== index)
        
        // Reorder line_order
        newLines.forEach((line, i) => {
          line.line_order = i + 1
        })
        
        set({ lines: newLines, isDirty: true })
        get().recalculateTotals()
      },

      reorderLines: (fromIndex, toIndex) => {
        const { lines } = get()
        const newLines = [...lines]
        const [movedLine] = newLines.splice(fromIndex, 1)
        newLines.splice(toIndex, 0, movedLine)
        
        // Update line_order
        newLines.forEach((line, i) => {
          line.line_order = i + 1
        })
        
        set({ lines: newLines, isDirty: true })
        get().recalculateTotals()
      },

      clearLines: () => {
        set({ lines: [], isDirty: true })
        get().recalculateTotals()
      },

      recalculateTotals: () => {
        const { lines } = get()
        set({ isCalculating: true })
        
        try {
          const lineCalculations = lines.map(line => ({
            quantity: line.quantity,
            unit_price: line.unit_price,
            custom_price: line.custom_price,
            line_total: line.line_total
          }))
          
          const totals = InvoiceCalculator.calculateInvoiceTotals(lineCalculations)
          set({ totals })
        } catch (error) {
          console.error('Error calculating totals:', error)
        } finally {
          set({ isCalculating: false })
        }
      },

      setDirty: (dirty) => set({ isDirty: dirty }),

      reset: () => {
        set({
          currentInvoice: null,
          lines: [],
          selectedCompany: null,
          totals: initialTotals,
          isDirty: false,
          autoSaveId: null
        })
      },

      setAutoSaveId: (id) => set({ autoSaveId: id }),

      validateInvoice: () => {
        const { currentInvoice, selectedCompany, lines } = get()
        const errors: string[] = []
        
        if (!selectedCompany) {
          errors.push('Please select a company')
        }
        
        if (!currentInvoice?.invoice_date) {
          errors.push('Please select an invoice date')
        }
        
        if (lines.length === 0) {
          errors.push('Please add at least one line item')
        }
        
        // Validate each line
        lines.forEach((line, index) => {
          if (!line.tka_id) {
            errors.push(`Line ${index + 1}: Please select a TKA worker`)
          }
          
          if (!line.job_description_id) {
            errors.push(`Line ${index + 1}: Please select a job description`)
          }
          
          if (line.quantity <= 0) {
            errors.push(`Line ${index + 1}: Quantity must be greater than 0`)
          }
          
          if (line.unit_price < 0) {
            errors.push(`Line ${index + 1}: Unit price cannot be negative`)
          }
        })
        
        return {
          isValid: errors.length === 0,
          errors
        }
      }
    }),
    {
      name: 'invoice-store',
      partialize: (state) => ({
        currentInvoice: state.currentInvoice,
        lines: state.lines,
        selectedCompany: state.selectedCompany,
        autoSaveId: state.autoSaveId,
        isDirty: state.isDirty
      }),
    }
  )
)