// lib/calculations/terbilang.ts
// Indonesian Number to Words Converter

// ========== CONSTANTS ==========
const ONES = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'
]

const TEENS = [
  'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 
  'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'
]

const TENS = [
  '', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh',
  'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'
]

const SCALE = [
  '', 'ribu', 'juta', 'miliar', 'triliun', 'kuadriliun'
]

// ========== HELPER FUNCTIONS ==========

/**
 * Convert hundreds (0-999) to words
 */
function convertHundreds(num: number): string {
  let result = ''
  
  // Handle hundreds
  if (num >= 100) {
    const hundreds = Math.floor(num / 100)
    if (hundreds === 1) {
      result += 'seratus'
    } else {
      result += ONES[hundreds] + ' ratus'
    }
    num %= 100
    if (num > 0) result += ' '
  }
  
  // Handle tens and ones
  if (num >= 20) {
    const tens = Math.floor(num / 10)
    result += TENS[tens]
    num %= 10
    if (num > 0) result += ' ' + ONES[num]
  } else if (num >= 10) {
    result += TEENS[num - 10]
  } else if (num > 0) {
    result += ONES[num]
  }
  
  return result
}

/**
 * Convert three-digit groups with scale
 */
function convertGroup(num: number, groupIndex: number): string {
  if (num === 0) return ''
  
  let result = convertHundreds(num)
  
  if (groupIndex > 0) {
    // Special case for "seribu" instead of "satu ribu"
    if (groupIndex === 1 && num === 1) {
      result = 'seribu'
    } else {
      result += ' ' + SCALE[groupIndex]
    }
  }
  
  return result
}

// ========== MAIN FUNCTIONS ==========

/**
 * Convert number to Indonesian words
 * @param num - Number to convert (supports up to quintillion)
 * @returns Indonesian words representation
 */
export function numberToWords(num: number): string {
  // Handle special cases
  if (num === 0) return 'nol'
  if (num < 0) return 'minus ' + numberToWords(-num)
  
  // Handle decimal numbers
  if (num % 1 !== 0) {
    const integerPart = Math.floor(num)
    const decimalPart = Math.round((num - integerPart) * 100)
    
    let result = numberToWords(integerPart)
    if (decimalPart > 0) {
      result += ' koma ' + numberToWords(decimalPart)
    }
    return result
  }
  
  // Convert integer
  const groups: number[] = []
  let tempNum = num
  
  // Split into groups of three digits
  while (tempNum > 0) {
    groups.push(tempNum % 1000)
    tempNum = Math.floor(tempNum / 1000)
  }
  
  // Convert each group
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupValue = groups[i]
    if (groupValue > 0) {
      parts.push(convertGroup(groupValue, i))
    }
  }
  
  return parts.join(' ').trim()
}

/**
 * Convert currency amount to words with "Rupiah"
 * @param amount - Amount in Rupiah
 * @returns Indonesian words with "Rupiah" suffix
 */
export function amountToWords(amount: number): string {
  const integerPart = Math.floor(amount)
  const words = numberToWords(integerPart)
  
  // Capitalize first letter
  const capitalizedWords = words.charAt(0).toUpperCase() + words.slice(1)
  
  return capitalizedWords + ' Rupiah'
}

/**
 * Convert amount with sen (decimal) support
 * @param amount - Amount with decimals
 * @returns Indonesian words with Rupiah and sen
 */
export function amountToWordsWithSen(amount: number): string {
  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)
  
  let result = amountToWords(integerPart)
  
  if (decimalPart > 0) {
    result += ' ' + numberToWords(decimalPart) + ' sen'
  }
  
  return result
}

/**
 * Convert ordinal numbers (first, second, etc.)
 * @param num - Number to convert to ordinal
 * @returns Indonesian ordinal words
 */
export function numberToOrdinal(num: number): string {
  if (num <= 0) return ''
  
  const words = numberToWords(num)
  return 'ke' + words
}

/**
 * Convert number to Roman numerals
 * @param num - Number to convert (1-3999)
 * @returns Roman numeral representation
 */
export function numberToRoman(num: number): string {
  if (num <= 0 || num > 3999) return ''
  
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  
  let result = ''
  let tempNum = num
  
  for (let i = 0; i < values.length; i++) {
    while (tempNum >= values[i]) {
      result += symbols[i]
      tempNum -= values[i]
    }
  }
  
  return result
}

// ========== VALIDATION FUNCTIONS ==========

/**
 * Validate if a number can be converted
 * @param num - Number to validate
 * @returns Validation result
 */
export function validateNumber(num: number): {
  isValid: boolean
  error?: string
} {
  if (isNaN(num)) {
    return { isValid: false, error: 'Not a valid number' }
  }
  
  if (!isFinite(num)) {
    return { isValid: false, error: 'Number must be finite' }
  }
  
  if (Math.abs(num) > 999999999999999) {
    return { isValid: false, error: 'Number too large (max: 999 trillion)' }
  }
  
  return { isValid: true }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Format number for display in documents
 * @param num - Number to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumberForDocument(
  num: number,
  options: {
    includeWords?: boolean
    includeCurrency?: boolean
    locale?: string
  } = {}
): string {
  const { includeWords = false, includeCurrency = true, locale = 'id-ID' } = options
  
  // Format as currency
  let formatted = new Intl.NumberFormat(locale, {
    style: includeCurrency ? 'currency' : 'decimal',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
  
  // Add words if requested
  if (includeWords) {
    const words = includeCurrency ? amountToWords(num) : numberToWords(num)
    formatted += ` (${words})`
  }
  
  return formatted
}

/**
 * Parse Indonesian number words back to number (basic implementation)
 * @param words - Indonesian words to parse
 * @returns Parsed number or null if invalid
 */
export function wordsToNumber(words: string): number | null {
  // This is a simplified implementation
  // For production use, you might want a more comprehensive parser
  
  const cleanWords = words.toLowerCase().trim()
  
  // Handle special cases
  if (cleanWords === 'nol') return 0
  if (cleanWords === 'satu') return 1
  if (cleanWords === 'dua') return 2
  // ... add more mappings as needed
  
  // For now, return null for complex parsing
  return null
}

// ========== EXPORTS ==========
export const Terbilang = {
  numberToWords,
  amountToWords,
  amountToWordsWithSen,
  numberToOrdinal,
  numberToRoman,
  validateNumber,
  formatNumberForDocument,
  wordsToNumber
}

// Default export
export default {
  toWords: numberToWords,
  toAmount: amountToWords,
  toAmountWithSen: amountToWordsWithSen,
  toOrdinal: numberToOrdinal,
  toRoman: numberToRoman,
  validate: validateNumber,
  format: formatNumberForDocument
}