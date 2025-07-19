// src/lib/import/excel.ts
interface ExcelParseOptions {
  sheetName?: string
  hasHeader?: boolean
  skipEmptyRows?: boolean
  trimWhitespace?: boolean
  maxRows?: number
}

interface ExcelParseResult<T> {
  data: T[]
  errors: Array<{
    row: number
    field: string
    value: any
    error: string
  }>
  meta: {
    totalRows: number
    validRows: number
    errorRows: number
    fields: string[]
    sheetName: string
  }
}

/**
 * Excel Parser using SheetJS (when available in browser)
 * For server-side, we'll use a simple CSV fallback
 */
export class ExcelParser {
  private options: Required<ExcelParseOptions>

  constructor(options: ExcelParseOptions = {}) {
    this.options = {
      sheetName: options.sheetName || '',
      hasHeader: options.hasHeader ?? true,
      skipEmptyRows: options.skipEmptyRows ?? true,
      trimWhitespace: options.trimWhitespace ?? true,
      maxRows: options.maxRows || 10000
    }
  }

  async parseFile<T = Record<string, any>>(file: File): Promise<ExcelParseResult<T>> {
    try {
      // Check if we're in browser environment with XLSX library
      if (typeof window !== 'undefined' && (window as any).XLSX) {
        return this.parseWithXLSX<T>(file)
      } else {
        // Fallback to treating as CSV if it's actually a CSV
        if (file.name.endsWith('.csv')) {
          const { parseCSVFile } = await import('./csv')
          const csvResult = await parseCSVFile(file, {
            hasHeader: this.options.hasHeader,
            skipEmptyLines: this.options.skipEmptyRows,
            trimWhitespace: this.options.trimWhitespace
          })
          
          return {
            data: csvResult.data as T[],
            errors: csvResult.errors,
            meta: {
              ...csvResult.meta,
              sheetName: 'Sheet1'
            }
          }
        }
        
        throw new Error('Excel parsing not available on server-side. Please use CSV format.')
      }
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async parseWithXLSX<T>(file: File): Promise<ExcelParseResult<T>> {
    const XLSX = (window as any).XLSX
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          })
          
          // Get sheet name
          const sheetName = this.options.sheetName || workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          if (!worksheet) {
            reject(new Error(`Sheet "${sheetName}" not found`))
            return
          }
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: this.options.hasHeader ? 1 : undefined,
            defval: '',
            blankrows: !this.options.skipEmptyRows,
            raw: false
          })
          
          // Process data
          const result = this.processExcelData<T>(jsonData, sheetName)
          resolve(result)
          
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  private processExcelData<T>(jsonData: any[], sheetName: string): ExcelParseResult<T> {
    const data: T[] = []
    const errors: ExcelParseResult<T>['errors'] = []
    
    // Get headers from first row if available
    const headers = Object.keys(jsonData[0] || {})
    
    jsonData.forEach((row, index) => {
      const rowNumber = index + (this.options.hasHeader ? 2 : 1)
      
      try {
        // Skip empty rows if configured
        if (this.options.skipEmptyRows && this.isEmptyRow(row)) {
          return
        }
        
        // Trim whitespace if configured
        if (this.options.trimWhitespace) {
          Object.keys(row).forEach(key => {
            if (typeof row[key] === 'string') {
              row[key] = row[key].trim()
            }
          })
        }
        
        // Check max rows limit
        if (data.length >= this.options.maxRows) {
          errors.push({
            row: rowNumber,
            field: 'row',
            value: row,
            error: `Exceeded maximum rows limit (${this.options.maxRows})`
          })
          return
        }
        
        data.push(row as T)
        
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: 'row',
          value: row,
          error: error instanceof Error ? error.message : 'Processing error'
        })
      }
    })
    
    return {
      data,
      errors,
      meta: {
        totalRows: jsonData.length,
        validRows: data.length,
        errorRows: errors.length,
        fields: headers,
        sheetName
      }
    }
  }

  private isEmptyRow(row: any): boolean {
    return Object.values(row).every(value => 
      value === null || value === undefined || value === ''
    )
  }
}

// Utility functions
export async function parseExcelFile<T = Record<string, any>>(
  file: File,
  options: ExcelParseOptions = {}
): Promise<ExcelParseResult<T>> {
  const parser = new ExcelParser(options)
  return parser.parseFile<T>(file)
}

export function createExcelTemplate(
  headers: string[],
  sampleData: Record<string, any>[] = [],
  filename: string = 'template.xlsx'
): void {
  // This would require XLSX library in browser environment
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    const XLSX = (window as any).XLSX
    
    const data = [
      headers,
      ...sampleData.map(row => headers.map(header => row[header] || ''))
    ]
    
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    
    XLSX.writeFile(workbook, filename)
  } else {
    // Fallback to CSV
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => {
          const value = row[header] || ''
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename.replace('.xlsx', '.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }
}

// src/lib/import/validators.ts
export interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'date' | 'phone'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: string[]
  custom?: (value: any) => string | null
}

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    value: any
    message: string
  }>
}

export class DataValidator {
  private rules: ValidationRule[]

  constructor(rules: ValidationRule[]) {
    this.rules = rules
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: ValidationResult['errors'] = []

    this.rules.forEach(rule => {
      const value = data[rule.field]
      const error = this.validateField(rule, value)
      
      if (error) {
        errors.push({
          field: rule.field,
          value,
          message: error
        })
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateBatch(dataArray: Record<string, any>[]): Array<ValidationResult & { index: number }> {
    return dataArray.map((data, index) => ({
      ...this.validate(data),
      index
    }))
  }

  private validateField(rule: ValidationRule, value: any): string | null {
    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      return `${rule.field} is required`
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return null
    }

    // Type validation
    if (rule.type) {
      const typeError = this.validateType(rule.type, value, rule.field)
      if (typeError) return typeError
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${rule.field} must be at least ${rule.minLength} characters`
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${rule.field} must not exceed ${rule.maxLength} characters`
      }
    }

    // Numeric range validation
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `${rule.field} must be at least ${rule.min}`
      }
      if (rule.max !== undefined && value > rule.max) {
        return `${rule.field} must not exceed ${rule.max}`
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return `${rule.field} format is invalid`
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return `${rule.field} must be one of: ${rule.enum.join(', ')}`
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) return customError
    }

    return null
  }

  private validateType(type: string, value: any, fieldName: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${fieldName} must be a string`
        }
        break
        
      case 'number':
        const num = Number(value)
        if (isNaN(num)) {
          return `${fieldName} must be a valid number`
        }
        break
        
      case 'email':
        if (typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) {
            return `${fieldName} must be a valid email address`
          }
        }
        break
        
      case 'date':
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return `${fieldName} must be a valid date`
        }
        break
        
      case 'phone':
        if (typeof value === 'string') {
          const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/
          if (!phoneRegex.test(value)) {
            return `${fieldName} must be a valid phone number`
          }
        }
        break
    }
    
    return null
  }
}

// Predefined validators for common entities
export const TKAWorkerValidator = new DataValidator([
  { field: 'nama', required: true, type: 'string', minLength: 2, maxLength: 100 },
  { field: 'passport', required: true, type: 'string', minLength: 6, maxLength: 20 },
  { field: 'divisi', required: false, type: 'string', maxLength: 100 },
  { 
    field: 'jenis_kelamin', 
    required: true, 
    enum: ['Laki-laki', 'Perempuan'],
    custom: (value) => {
      // Normalize common gender values
      if (typeof value === 'string') {
        const normalized = value.toLowerCase()
        if (['male', 'laki-laki', 'l', 'm'].includes(normalized)) return null
        if (['female', 'perempuan', 'p', 'f'].includes(normalized)) return null
      }
      return 'jenis_kelamin must be "Laki-laki" or "Perempuan"'
    }
  }
])

export const CompanyValidator = new DataValidator([
  { field: 'company_name', required: true, type: 'string', minLength: 2, maxLength: 200 },
  { 
    field: 'npwp', 
    required: true, 
    type: 'string',
    pattern: /^\d{15}$/,
    custom: (value) => value.length !== 15 ? 'NPWP must be exactly 15 digits' : null
  },
  { field: 'idtku', required: true, type: 'string', minLength: 1, maxLength: 20 },
  { field: 'address', required: true, type: 'string', minLength: 10, maxLength: 500 },
  { field: 'contact_phone', required: false, type: 'phone' },
  { field: 'contact_email', required: false, type: 'email' }
])

export const JobDescriptionValidator = new DataValidator([
  { field: 'job_name', required: true, type: 'string', minLength: 2, maxLength: 200 },
  { field: 'job_description', required: true, type: 'string', minLength: 5, maxLength: 1000 },
  { field: 'price', required: true, type: 'number', min: 0, max: 999999999.99 }
])

// Utility functions
export function normalizeGender(value: string): 'Laki-laki' | 'Perempuan' {
  const normalized = value.toLowerCase().trim()
  
  if (['male', 'laki-laki', 'l', 'm', 'laki', 'pria'].includes(normalized)) {
    return 'Laki-laki'
  }
  
  if (['female', 'perempuan', 'p', 'f', 'wanita'].includes(normalized)) {
    return 'Perempuan'
  }
  
  return 'Laki-laki' // default
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Handle Indonesian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '+62' + cleaned.substring(1)
  } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+62' + cleaned
  }
  
  return cleaned
}

export function validateNPWP(npwp: string): boolean {
  // Remove any non-digit characters
  const cleanNPWP = npwp.replace(/\D/g, '')
  return cleanNPWP.length === 15
}

export function formatNPWP(npwp: string): string {
  const clean = npwp.replace(/\D/g, '')
  if (clean.length !== 15) return npwp
  
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}.${clean.slice(8, 9)}-${clean.slice(9, 12)}.${clean.slice(12, 15)}`
}