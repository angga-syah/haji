// src/lib/calculations/vat.ts
import { VAT } from '@/lib/constants'

export interface VATCalculationResult {
  subtotal: number
  vatAmount: number
  total: number
  vatPercentage: number
  roundingRule: string
  explanation: string
}

export class VATCalculator {
  /**
   * Calculate VAT with special Indonesian business rules:
   * - If fractional part is exactly 0.49, round down
   * - If fractional part is 0.50 or more, round up  
   * - Otherwise, use standard rounding
   */
  static calculateVAT(subtotal: number, vatPercentage: number = VAT.DEFAULT_PERCENTAGE): number {
    const rawVAT = (subtotal * vatPercentage) / 100
    const fractional = rawVAT - Math.floor(rawVAT)
    
    // Apply special business rules
    if (Math.abs(fractional - VAT.SPECIAL_ROUNDING_THRESHOLD) < 0.001) {
      return Math.floor(rawVAT) // .49 rounds down
    } else if (fractional >= VAT.STANDARD_ROUNDING_THRESHOLD) {
      return Math.ceil(rawVAT) // .50+ rounds up
    } else {
      return Math.round(rawVAT) // Standard rounding
    }
  }

  static calculateWithDetails(
    subtotal: number, 
    vatPercentage: number = VAT.DEFAULT_PERCENTAGE
  ): VATCalculationResult {
    const rawVAT = (subtotal * vatPercentage) / 100
    const fractional = rawVAT - Math.floor(rawVAT)
    
    let vatAmount: number
    let roundingRule: string
    let explanation: string

    if (Math.abs(fractional - VAT.SPECIAL_ROUNDING_THRESHOLD) < 0.001) {
      vatAmount = Math.floor(rawVAT)
      roundingRule = 'Special Rule: .49 rounds down'
      explanation = `VAT calculated as ${rawVAT.toFixed(4)}, rounded down due to .49 rule`
    } else if (fractional >= VAT.STANDARD_ROUNDING_THRESHOLD) {
      vatAmount = Math.ceil(rawVAT)
      roundingRule = 'Standard Rule: .50+ rounds up'
      explanation = `VAT calculated as ${rawVAT.toFixed(4)}, rounded up`
    } else {
      vatAmount = Math.round(rawVAT)
      roundingRule = 'Standard rounding'
      explanation = `VAT calculated as ${rawVAT.toFixed(4)}, standard rounding applied`
    }

    return {
      subtotal,
      vatAmount,
      total: subtotal + vatAmount,
      vatPercentage,
      roundingRule,
      explanation
    }
  }

  static validateVATCalculation(
    subtotal: number,
    calculatedVAT: number,
    vatPercentage: number = VAT.DEFAULT_PERCENTAGE
  ): boolean {
    const expectedVAT = this.calculateVAT(subtotal, vatPercentage)
    return Math.abs(calculatedVAT - expectedVAT) < 0.01
  }

  static getVATBreakdown(subtotal: number, vatPercentage: number = VAT.DEFAULT_PERCENTAGE): {
    rawVAT: number
    fractionalPart: number
    integerPart: number
    finalVAT: number
    difference: number
  } {
    const rawVAT = (subtotal * vatPercentage) / 100
    const integerPart = Math.floor(rawVAT)
    const fractionalPart = rawVAT - integerPart
    const finalVAT = this.calculateVAT(subtotal, vatPercentage)
    
    return {
      rawVAT,
      fractionalPart,
      integerPart,
      finalVAT,
      difference: finalVAT - rawVAT
    }
  }

  // Test cases for VAT calculation
  static getTestCases(): Array<{
    subtotal: number
    expectedVAT: number
    description: string
  }> {
    return [
      {
        subtotal: 1000000,
        expectedVAT: 110000,
        description: 'Standard calculation: 1,000,000 * 11% = 110,000'
      },
      {
        subtotal: 163636.36,
        expectedVAT: 18000,
        description: 'Special .49 rule: 163636.36 * 11% = 18000.49 → 18000'
      },
      {
        subtotal: 163636.37,
        expectedVAT: 18001,
        description: 'Standard .50+ rule: 163636.37 * 11% = 18000.50 → 18001'
      }
    ]
  }
}

// Export convenience functions
export const calculateVAT = VATCalculator.calculateVAT
export const calculateVATWithDetails = VATCalculator.calculateWithDetails
export const validateVAT = VATCalculator.validateVATCalculation