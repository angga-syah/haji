// src/lib/calculations/currency.ts
export interface CurrencyFormatOptions {
  locale?: string
  currency?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  useGrouping?: boolean
  style?: 'currency' | 'decimal' | 'percent'
}

export class CurrencyFormatter {
  private static defaultOptions: CurrencyFormatOptions = {
    locale: 'id-ID',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
    style: 'currency'
  }

  static format(amount: number, options: CurrencyFormatOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      return new Intl.NumberFormat(opts.locale, {
        style: opts.style,
        currency: opts.currency,
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits,
        useGrouping: opts.useGrouping
      }).format(amount)
    } catch (error) {
      // Fallback formatting
      return this.fallbackFormat(amount, opts)
    }
  }

  static formatIDR(amount: number): string {
    return this.format(amount, {
      locale: 'id-ID',
      currency: 'IDR',
      style: 'currency',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  static formatUSD(amount: number): string {
    return this.format(amount, {
      locale: 'en-US',
      currency: 'USD',
      style: 'currency',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  static formatDecimal(amount: number, decimals: number = 2): string {
    return this.format(amount, {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  static formatPercent(amount: number): string {
    return this.format(amount / 100, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    })
  }

  static parse(currencyString: string): number {
    // Remove currency symbols and spaces
    const cleaned = currencyString
      .replace(/[Rp\$€£¥]/g, '')
      .replace(/[^\d.,\-]/g, '')
      .replace(/,/g, '')
    
    const number = parseFloat(cleaned)
    return isNaN(number) ? 0 : number
  }

  static round(amount: number, decimals: number = 0): number {
    const factor = Math.pow(10, decimals)
    return Math.round(amount * factor) / factor
  }

  static toWords(amount: number): string {
    // Use the terbilang function for Indonesian
    const { amountToWords } = require('./terbilang')
    return amountToWords(amount)
  }

  private static fallbackFormat(amount: number, options: CurrencyFormatOptions): string {
    const rounded = Math.round(amount)
    const parts = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    if (options.style === 'currency') {
      return `Rp ${parts}`
    }
    
    return parts
  }

  // Utility methods for invoice calculations
  static calculateSubtotal(lineItems: Array<{ quantity: number; unitPrice: number; customPrice?: number }>): number {
    return lineItems.reduce((total, item) => {
      const price = item.customPrice ?? item.unitPrice
      return total + (price * item.quantity)
    }, 0)
  }

  static calculateDiscount(amount: number, discountPercent: number): number {
    return this.round(amount * (discountPercent / 100), 2)
  }

  static calculateTax(amount: number, taxPercent: number): number {
    return this.round(amount * (taxPercent / 100), 0) // Round to nearest rupiah
  }
}

// Export convenience functions
export const formatCurrency = CurrencyFormatter.formatIDR
export const formatDecimal = CurrencyFormatter.formatDecimal
export const formatPercent = CurrencyFormatter.formatPercent
export const parseCurrency = CurrencyFormatter.parse
export const roundCurrency = CurrencyFormatter.round