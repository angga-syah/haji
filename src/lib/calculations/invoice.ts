// lib/calculations/invoice.ts
import { VAT } from '@/lib/constants'

// ========== TYPES ==========
export interface LineItemCalculation {
  quantity: number
  unit_price: number
  custom_price?: number
  line_total?: number
}

export interface InvoiceTotals {
  subtotal: number
  vat_amount: number
  total_amount: number
  vat_percentage: number
}

export interface CalculationOptions {
  vat_percentage?: number
  round_vat?: boolean
}

// ========== CORE CALCULATION FUNCTIONS ==========

/**
 * Calculate line total for a single line item
 */
export function calculateLineTotal(
  quantity: number, 
  unitPrice: number, 
  customPrice?: number
): number {
  const price = customPrice !== undefined ? customPrice : unitPrice
  return Math.round((price * quantity) * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate subtotal from multiple line items
 */
export function calculateSubtotal(lines: LineItemCalculation[]): number {
  return lines.reduce((sum, line) => {
    const lineTotal = line.line_total || calculateLineTotal(
      line.quantity, 
      line.unit_price, 
      line.custom_price
    )
    return sum + lineTotal
  }, 0)
}

/**
 * Calculate VAT with special business rules:
 * - If fractional part is exactly 0.49, round down
 * - If fractional part is 0.50 or more, round up
 * - Otherwise, use standard rounding
 */
export function calculateVAT(
  subtotal: number, 
  vatPercentage: number = VAT.DEFAULT_PERCENTAGE
): number {
  const vatAmount = (subtotal * vatPercentage) / 100
  const fractional = vatAmount - Math.floor(vatAmount)
  
  // Special business rule implementation
  if (Math.abs(fractional - VAT.SPECIAL_ROUNDING_THRESHOLD) < 0.001) {
    // Exactly 0.49 - round down
    return Math.floor(vatAmount)
  } else if (fractional >= VAT.STANDARD_ROUNDING_THRESHOLD) {
    // 0.50 or more - round up
    return Math.ceil(vatAmount)
  } else {
    // Standard rounding for all other cases
    return Math.round(vatAmount)
  }
}

/**
 * Calculate complete invoice totals
 */
export function calculateInvoiceTotals(
  lines: LineItemCalculation[],
  options: CalculationOptions = {}
): InvoiceTotals {
  const { vat_percentage = VAT.DEFAULT_PERCENTAGE } = options
  
  const subtotal = calculateSubtotal(lines)
  const vat_amount = calculateVAT(subtotal, vat_percentage)
  const total_amount = subtotal + vat_amount
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vat_amount * 100) / 100,
    total_amount: Math.round(total_amount * 100) / 100,
    vat_percentage
  }
}

// ========== VALIDATION FUNCTIONS ==========

/**
 * Validate line item calculations
 */
export function validateLineItem(line: LineItemCalculation): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (line.quantity <= 0) {
    errors.push('Quantity must be greater than 0')
  }
  
  if (line.quantity > 9999) {
    errors.push('Quantity cannot exceed 9999')
  }
  
  if (line.unit_price < 0) {
    errors.push('Unit price cannot be negative')
  }
  
  if (line.unit_price > 999999999.99) {
    errors.push('Unit price is too large')
  }
  
  if (line.custom_price !== undefined) {
    if (line.custom_price < 0) {
      errors.push('Custom price cannot be negative')
    }
    
    if (line.custom_price > 999999999.99) {
      errors.push('Custom price is too large')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate invoice totals
 */
export function validateInvoiceTotals(totals: InvoiceTotals): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (totals.subtotal < 0) {
    errors.push('Subtotal cannot be negative')
  }
  
  if (totals.vat_amount < 0) {
    errors.push('VAT amount cannot be negative')
  }
  
  if (totals.total_amount < 0) {
    errors.push('Total amount cannot be negative')
  }
  
  if (totals.vat_percentage < 0 || totals.vat_percentage > 100) {
    errors.push('VAT percentage must be between 0 and 100')
  }
  
  // Check if calculations are consistent
  const expectedVat = calculateVAT(totals.subtotal, totals.vat_percentage)
  const expectedTotal = totals.subtotal + expectedVat
  
  if (Math.abs(totals.vat_amount - expectedVat) > 0.01) {
    errors.push('VAT calculation is inconsistent')
  }
  
  if (Math.abs(totals.total_amount - expectedTotal) > 0.01) {
    errors.push('Total calculation is inconsistent')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number, 
  locale: string = 'id-ID', 
  currency: string = 'IDR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols, spaces, and convert to number
  const numericString = currencyString
    .replace(/[Rp\s,.]/g, '')
    .replace(/[^\d.-]/g, '')
  
  return parseFloat(numericString) || 0
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Calculate percentage of a value
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

/**
 * Apply discount to amount
 */
export function applyDiscount(
  amount: number, 
  discountPercentage: number
): number {
  const discountAmount = (amount * discountPercentage) / 100
  return amount - discountAmount
}

// ========== BUSINESS RULE HELPERS ==========

/**
 * Check if VAT calculation follows business rules
 */
export function validateVATBusinessRules(
  subtotal: number, 
  calculatedVAT: number, 
  vatPercentage: number = 11
): boolean {
  const expectedVAT = calculateVAT(subtotal, vatPercentage)
  return Math.abs(calculatedVAT - expectedVAT) < 0.01
}

/**
 * Get VAT calculation explanation
 */
export function getVATCalculationExplanation(
  subtotal: number, 
  vatPercentage: number = 11
): {
  rawVAT: number
  fractional: number
  rule: string
  finalVAT: number
} {
  const rawVAT = (subtotal * vatPercentage) / 100
  const fractional = rawVAT - Math.floor(rawVAT)
  
  let rule: string
  let finalVAT: number
  
  if (Math.abs(fractional - 0.49) < 0.001) {
    rule = 'Special rule: .49 rounds down'
    finalVAT = Math.floor(rawVAT)
  } else if (fractional >= 0.50) {
    rule = 'Standard rule: .50+ rounds up'
    finalVAT = Math.ceil(rawVAT)
  } else {
    rule = 'Standard rounding'
    finalVAT = Math.round(rawVAT)
  }
  
  return {
    rawVAT: roundTo(rawVAT, 4),
    fractional: roundTo(fractional, 4),
    rule,
    finalVAT
  }
}

// ========== EXPORT FOR TESTING ==========
export const InvoiceCalculator = {
  calculateLineTotal,
  calculateSubtotal,
  calculateVAT,
  calculateInvoiceTotals,
  validateLineItem,
  validateInvoiceTotals,
  formatCurrency,
  parseCurrency,
  roundTo,
  calculatePercentage,
  applyDiscount,
  validateVATBusinessRules,
  getVATCalculationExplanation
}