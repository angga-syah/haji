// hooks/business/useInvoiceCalculation.ts
import { useMemo, useCallback } from 'react'
import { VAT } from '@/lib/constants'
import type { InvoiceLine, CreateInvoiceLineData } from '@/lib/types'

interface LineItemForCalculation {
  id?: string
  quantity: number
  unit_price: number
  custom_price?: number
}

interface CalculationResult {
  subtotal: number
  vatAmount: number
  total: number
  lineTotal: (line: LineItemForCalculation) => number
}

/**
 * Hook for invoice calculations with special VAT business rules
 * @param lines - Array of invoice lines
 * @param vatPercentage - VAT percentage (default: 11%)
 * @returns Calculation results and utility functions
 */
export function useInvoiceCalculation(
  lines: LineItemForCalculation[] = [],
  vatPercentage: number = VAT.DEFAULT_PERCENTAGE
): CalculationResult {
  
  // Calculate line total for a single line
  const lineTotal = useCallback((line: LineItemForCalculation): number => {
    const price = line.custom_price || line.unit_price || 0
    return price * line.quantity
  }, [])

  // Calculate subtotal from all lines
  const subtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      return sum + lineTotal(line)
    }, 0)
  }, [lines, lineTotal])

  // Calculate VAT with special business rules
  const vatAmount = useMemo(() => {
    return calculateVATWithBusinessRules(subtotal, vatPercentage)
  }, [subtotal, vatPercentage])

  // Calculate total
  const total = useMemo(() => {
    return subtotal + vatAmount
  }, [subtotal, vatAmount])

  return {
    subtotal,
    vatAmount,
    total,
    lineTotal
  }
}

/**
 * Calculate VAT with special business rules:
 * - .49 rounds down
 * - .50+ rounds up
 * - Otherwise standard rounding
 */
function calculateVATWithBusinessRules(subtotal: number, vatPercentage: number = 11): number {
  const vatAmount = (subtotal * vatPercentage) / 100
  const fractional = vatAmount - Math.floor(vatAmount)
  
  // Special business rule: .49 rounds down, .50+ rounds up
  if (Math.abs(fractional - VAT.SPECIAL_ROUNDING_THRESHOLD) < 0.001) {
    return Math.floor(vatAmount)
  } else if (fractional >= VAT.STANDARD_ROUNDING_THRESHOLD) {
    return Math.ceil(vatAmount)
  } else {
    return Math.round(vatAmount)
  }
}

/**
 * Hook for real-time invoice calculation as user types
 */
export function useRealtimeInvoiceCalculation() {
  const calculateTotals = useCallback((lines: LineItemForCalculation[], vatPercentage?: number) => {
    const subtotal = lines.reduce((sum, line) => {
      const price = line.custom_price || line.unit_price || 0
      return sum + (price * line.quantity)
    }, 0)
    
    const vatAmount = calculateVATWithBusinessRules(subtotal, vatPercentage)
    const total = subtotal + vatAmount
    
    return { subtotal, vatAmount, total }
  }, [])

  const calculateLineTotal = useCallback((quantity: number, unitPrice: number) => {
    return quantity * unitPrice
  }, [])

  return {
    calculateTotals,
    calculateLineTotal,
    calculateVATWithBusinessRules
  }
}

/**
 * Hook for invoice validation
 */
export function useInvoiceValidation() {
  const validateLine = useCallback((line: Partial<CreateInvoiceLineData>) => {
    const errors: Record<string, string> = {}
    
    if (!line.tka_id) {
      errors.tka_id = 'TKA Worker is required'
    }
    
    if (!line.job_description_id) {
      errors.job_description_id = 'Job Description is required'
    }
    
    if (!line.quantity || line.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0'
    }
    
    if (line.quantity && line.quantity > 9999) {
      errors.quantity = 'Quantity cannot exceed 9999'
    }
    
    if (line.custom_price !== undefined && line.custom_price < 0) {
      errors.custom_price = 'Custom price cannot be negative'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }, [])

  const validateInvoice = useCallback((invoice: {
    company_id?: string
    invoice_date?: string
    lines?: Partial<CreateInvoiceLineData>[]
  }) => {
    const errors: Record<string, string> = {}
    
    if (!invoice.company_id) {
      errors.company_id = 'Company is required'
    }
    
    if (!invoice.invoice_date) {
      errors.invoice_date = 'Invoice date is required'
    }
    
    if (!invoice.lines || invoice.lines.length === 0) {
      errors.lines = 'At least one line item is required'
    }
    
    if (invoice.lines && invoice.lines.length > 100) {
      errors.lines = 'Too many line items (maximum 100)'
    }
    
    // Validate each line
    const lineErrors: Record<number, Record<string, string>> = {}
    if (invoice.lines) {
      invoice.lines.forEach((line, index) => {
        const lineValidation = validateLine(line)
        if (!lineValidation.isValid) {
          lineErrors[index] = lineValidation.errors
        }
      })
    }
    
    return {
      isValid: Object.keys(errors).length === 0 && Object.keys(lineErrors).length === 0,
      errors,
      lineErrors
    }
  }, [validateLine])

  return {
    validateLine,
    validateInvoice
  }
}

/**
 * Hook for invoice number formatting and validation
 */
export function useInvoiceNumberUtils() {
  const formatInvoiceNumber = useCallback((year: number, month: number, sequence: number) => {
    const shortYear = year.toString().slice(-2)
    const paddedMonth = month.toString().padStart(2, '0')
    const paddedSequence = sequence.toString().padStart(3, '0')
    
    return `INV-${shortYear}-${paddedMonth}-${paddedSequence}`
  }, [])

  const parseInvoiceNumber = useCallback((invoiceNumber: string) => {
    const match = invoiceNumber.match(/^INV-(\d{2})-(\d{2})-(\d{3})$/)
    
    if (!match) {
      return null
    }
    
    const [, yearStr, monthStr, sequenceStr] = match
    const year = 2000 + parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const sequence = parseInt(sequenceStr, 10)
    
    return { year, month, sequence }
  }, [])

  const validateInvoiceNumber = useCallback((invoiceNumber: string) => {
    const parsed = parseInvoiceNumber(invoiceNumber)
    if (!parsed) {
      return { isValid: false, error: 'Invalid invoice number format' }
    }
    
    const { year, month, sequence } = parsed
    const currentYear = new Date().getFullYear()
    
    if (year < 2020 || year > currentYear + 1) {
      return { isValid: false, error: 'Invalid year in invoice number' }
    }
    
    if (month < 1 || month > 12) {
      return { isValid: false, error: 'Invalid month in invoice number' }
    }
    
    if (sequence < 1 || sequence > 999) {
      return { isValid: false, error: 'Invalid sequence number' }
    }
    
    return { isValid: true, parsed }
  }, [parseInvoiceNumber])

  return {
    formatInvoiceNumber,
    parseInvoiceNumber,
    validateInvoiceNumber
  }
}

/**
 * Export the calculation function for use in API routes
 */
export { calculateVATWithBusinessRules }