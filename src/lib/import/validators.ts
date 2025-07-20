// src/lib/import/validators.ts
import { VALIDATION } from '@/lib/constants'

export interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'date' | 'phone' | 'url'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: string[]
  custom?: (value: any) => string | null
  transform?: (value: any) => any
}

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    value: any
    message: string
  }>
  transformedData?: Record<string, any>
}

export class ImportValidator {
  private rules: ValidationRule[]

  constructor(rules: ValidationRule[]) {
    this.rules = rules
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: ValidationResult['errors'] = []
    const transformedData: Record<string, any> = {}

    this.rules.forEach(rule => {
      const rawValue = data[rule.field]
      let value = rawValue

      // Apply transformation if provided
      if (rule.transform) {
        try {
          value = rule.transform(rawValue)
          transformedData[rule.field] = value
        } catch (error) {
          errors.push({
            field: rule.field,
            value: rawValue,
            message: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
          return
        }
      } else {
        transformedData[rule.field] = value
      }

      const error = this.validateField(rule, value)
      if (error) {
        errors.push({
          field: rule.field,
          value: rawValue,
          message: error
        })
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      transformedData: errors.length === 0 ? transformedData : undefined
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
    if (rule.required && this.isEmpty(value)) {
      return `${rule.field} is required`
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && this.isEmpty(value)) {
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

      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value)
          } catch {
            return `${fieldName} must be a valid URL`
          }
        }
        break
    }
    
    return null
  }

  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === ''
  }
}

// ========== PREDEFINED VALIDATORS ==========

export const CompanyValidationRules: ValidationRule[] = [
  {
    field: 'company_name',
    required: true,
    type: 'string',
    minLength: VALIDATION.COMPANY_NAME_MIN_LENGTH,
    maxLength: VALIDATION.COMPANY_NAME_MAX_LENGTH,
    transform: (value) => String(value || '').trim()
  },
  {
    field: 'npwp',
    required: true,
    type: 'string',
    custom: (value) => {
      const cleaned = String(value || '').replace(/\D/g, '')
      if (cleaned.length !== VALIDATION.NPWP_LENGTH) {
        return `NPWP must be exactly ${VALIDATION.NPWP_LENGTH} digits`
      }
      return null
    },
    transform: (value) => String(value || '').replace(/\D/g, '') // Remove non-digits
  },
  {
    field: 'idtku',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 20,
    transform: (value) => String(value || '').trim()
  },
  {
    field: 'address',
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 500,
    transform: (value) => String(value || '').trim()
  },
  {
    field: 'contact_phone',
    required: false,
    type: 'phone',
    transform: (value) => {
      if (!value) return undefined
      return normalizePhoneNumber(String(value))
    }
  },
  {
    field: 'contact_email',
    required: false,
    type: 'email',
    transform: (value) => {
      if (!value) return undefined
      return String(value).trim().toLowerCase()
    }
  }
]

export const TKAWorkerValidationRules: ValidationRule[] = [
  {
    field: 'nama',
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100,
    transform: (value) => String(value || '').trim()
  },
  {
    field: 'passport',
    required: true,
    type: 'string',
    minLength: VALIDATION.PASSPORT_MIN_LENGTH,
    maxLength: VALIDATION.PASSPORT_MAX_LENGTH,
    transform: (value) => String(value || '').trim().toUpperCase()
  },
  {
    field: 'divisi',
    required: false,
    type: 'string',
    maxLength: 100,
    transform: (value) => {
      if (!value) return undefined
      return String(value).trim()
    }
  },
  {
    field: 'jenis_kelamin',
    required: true,
    enum: ['Laki-laki', 'Perempuan'],
    transform: (value) => normalizeGender(String(value || 'Laki-laki'))
  }
]

export const JobDescriptionValidationRules: ValidationRule[] = [
  {
    field: 'company_id',
    required: true,
    type: 'string',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    custom: (value) => {
      if (!value) return 'Company ID is required'
      return null
    }
  },
  {
    field: 'job_name',
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: VALIDATION.JOB_NAME_MAX_LENGTH,
    transform: (value) => String(value || '').trim()
  },
  {
    field: 'job_description',
    required: true,
    type: 'string',
    minLength: 5,
    maxLength: VALIDATION.JOB_DESCRIPTION_MAX_LENGTH,
    transform: (value) => String(value || '').trim()
  },
  {
    field: 'price',
    required: true,
    type: 'number',
    min: 0,
    max: VALIDATION.MAX_PRICE,
    transform: (value) => {
      const num = Number(String(value || '0').replace(/[^\d.]/g, ''))
      if (isNaN(num)) return 0
      return num
    }
  },
  {
    field: 'sort_order',
    required: false,
    type: 'number',
    min: 0,
    transform: (value) => {
      if (!value) return 0
      const num = Number(value)
      return isNaN(num) ? 0 : num
    }
  }
]

// ========== UTILITY FUNCTIONS ==========

export function normalizeGender(value: string): 'Laki-laki' | 'Perempuan' {
  const normalized = value.toLowerCase().trim()
  
  if (['male', 'laki-laki', 'l', 'm', 'laki', 'pria', '1'].includes(normalized)) {
    return 'Laki-laki'
  }
  
  if (['female', 'perempuan', 'p', 'f', 'wanita', '2'].includes(normalized)) {
    return 'Perempuan'
  }
  
  return 'Laki-laki' // default fallback
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Handle Indonesian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '+62' + cleaned.substring(1)
  } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = '+62' + cleaned
  }
  
  return cleaned
}

export function validateNPWP(npwp: string): boolean {
  const cleanNPWP = npwp.replace(/\D/g, '')
  return cleanNPWP.length === VALIDATION.NPWP_LENGTH
}

export function formatNPWP(npwp: string): string {
  const clean = npwp.replace(/\D/g, '')
  if (clean.length !== VALIDATION.NPWP_LENGTH) return npwp
  
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}.${clean.slice(8, 9)}-${clean.slice(9, 12)}.${clean.slice(12, 15)}`
}

export function validatePassport(passport: string): boolean {
  const clean = passport.trim()
  return clean.length >= VALIDATION.PASSPORT_MIN_LENGTH && 
         clean.length <= VALIDATION.PASSPORT_MAX_LENGTH &&
         /^[A-Z0-9]+$/i.test(clean)
}

export function normalizePrice(value: any): number {
  if (typeof value === 'number') return value
  
  const stringValue = String(value || '0')
  // Remove currency symbols and thousands separators
  const cleaned = stringValue.replace(/[Rp\s,.]/g, '').replace(/[^\d]/g, '')
  const number = parseInt(cleaned, 10)
  
  return isNaN(number) ? 0 : number
}

// ========== PREDEFINED VALIDATORS ==========

export const CompanyValidator = new ImportValidator(CompanyValidationRules)
export const TKAWorkerValidator = new ImportValidator(TKAWorkerValidationRules)  
export const JobDescriptionValidator = new ImportValidator(JobDescriptionValidationRules)

// ========== BATCH VALIDATION ==========

export class BatchValidator {
  /**
   * Validate and report on entire dataset
   */
  static validateDataset<T>(
    data: T[],
    validator: ImportValidator,
    options: {
      stopOnFirstError?: boolean
      maxErrors?: number
    } = {}
  ): {
    isValid: boolean
    totalRows: number
    validRows: number
    errorRows: number
    errors: Array<{
      row: number
      field: string
      value: any
      message: string
    }>
    transformedData: T[]
  } {
    const { stopOnFirstError = false, maxErrors = 100 } = options
    
    const errors: any[] = []
    const transformedData: T[] = []
    let validRows = 0
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const result = validator.validate(row)
      
      if (result.isValid && result.transformedData) {
        transformedData.push(result.transformedData as T)
        validRows++
      } else {
        result.errors.forEach(error => {
          errors.push({
            row: i + 1, // 1-based row numbering
            field: error.field,
            value: error.value,
            message: error.message
          })
        })
        
        if (stopOnFirstError || errors.length >= maxErrors) {
          break
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      totalRows: data.length,
      validRows,
      errorRows: data.length - validRows,
      errors,
      transformedData
    }
  }

  /**
   * Generate validation report
   */
  static generateValidationReport(validationResult: ReturnType<typeof BatchValidator.validateDataset>): string {
    const { totalRows, validRows, errorRows, errors } = validationResult
    
    let report = `Validation Report\n`
    report += `================\n`
    report += `Total Rows: ${totalRows}\n`
    report += `Valid Rows: ${validRows}\n`
    report += `Error Rows: ${errorRows}\n`
    report += `Success Rate: ${((validRows / totalRows) * 100).toFixed(1)}%\n\n`
    
    if (errors.length > 0) {
      report += `Errors:\n`
      report += `-------\n`
      errors.forEach((error, index) => {
        report += `${index + 1}. Row ${error.row}, Field '${error.field}': ${error.message}\n`
      })
    }
    
    return report
  }
}

export default ImportValidator