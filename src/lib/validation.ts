// lib/validation.ts
import { z } from 'zod'

// ========== AUTH VALIDATION ==========
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional()
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  role: z.enum(['admin', 'finance_supervisor', 'finance_staff']).default('finance_staff')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// ========== COMPANY VALIDATION ==========
export const companySchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  npwp: z.string().regex(/^\d{15}$/, 'NPWP must be exactly 15 digits'),
  idtku: z.string().min(1, 'IDTKU is required').max(20),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500),
  contact_phone: z.string().max(20).optional().or(z.literal('')),
  contact_email: z.string().email('Invalid email format').optional().or(z.literal(''))
})

// ========== TKA WORKER VALIDATION ==========
export const tkaWorkerSchema = z.object({
  nama: z.string().min(2, 'Name must be at least 2 characters').max(100),
  passport: z.string().min(3, 'Passport must be at least 3 characters').max(20),
  divisi: z.string().max(100).optional().or(z.literal('')),
  jenis_kelamin: z.enum(['Laki-laki', 'Perempuan'])
})

export const tkaFamilyMemberSchema = z.object({
  nama: z.string().min(2, 'Name must be at least 2 characters').max(100),
  passport: z.string().min(3, 'Passport must be at least 3 characters').max(20),
  jenis_kelamin: z.enum(['Laki-laki', 'Perempuan']),
  relationship: z.enum(['spouse', 'parent', 'child'])
})

// ========== JOB DESCRIPTION VALIDATION ==========
export const jobDescriptionSchema = z.object({
  company_id: z.string().uuid('Invalid company ID'),
  job_name: z.string().min(2, 'Job name must be at least 2 characters').max(200),
  job_description: z.string().min(5, 'Job description must be at least 5 characters').max(1000),
  price: z.coerce.number().min(0, 'Price must be positive').max(999999999.99, 'Price is too large'),
  sort_order: z.coerce.number().int().min(0).optional()
})

// ========== BANK ACCOUNT VALIDATION ==========
export const bankAccountSchema = z.object({
  bank_name: z.string().min(2, 'Bank name must be at least 2 characters').max(100),
  account_number: z.string().min(5, 'Account number must be at least 5 characters').max(50),
  account_name: z.string().min(2, 'Account name must be at least 2 characters').max(100),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional()
})

// ========== INVOICE VALIDATION ==========
export const invoiceLineSchema = z.object({
  baris: z.number().int().min(1).max(999).optional(),
  tka_id: z.string().uuid('Invalid TKA worker ID'),
  job_description_id: z.string().uuid('Invalid job description ID'),
  custom_job_name: z.string().max(200).optional().or(z.literal('')),
  custom_job_description: z.string().max(1000).optional().or(z.literal('')),
  custom_price: z.number().min(0).max(999999999.99).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(9999, 'Quantity is too large')
})

export const invoiceSchema = z.object({
  company_id: z.string().uuid('Invalid company ID'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).optional().or(z.literal('')),
  bank_account_id: z.string().uuid().optional().or(z.literal('')),
  lines: z.array(invoiceLineSchema).min(1, 'At least one line item is required').max(100, 'Too many line items')
})

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'finalized', 'paid', 'cancelled'])
})

// ========== SEARCH VALIDATION ==========
export const searchParamsSchema = z.object({
  query: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  orderBy: z.string().max(50).optional(),
  orderDirection: z.enum(['asc', 'desc']).optional()
})

export const invoiceSearchSchema = searchParamsSchema.extend({
  status: z.enum(['draft', 'finalized', 'paid', 'cancelled']).optional(),
  company_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount_min: z.number().min(0).optional(),
  amount_max: z.number().min(0).optional()
})

// ========== SETTINGS VALIDATION ==========
export const appSettingSchema = z.object({
  setting_key: z.string().min(1).max(50),
  setting_value: z.any(),
  setting_type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  description: z.string().max(200).optional()
})

// ========== PROFILE VALIDATION ==========
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  settings: z.record(z.any()).optional()
})

export const userRoleUpdateSchema = z.object({
  role: z.enum(['admin', 'finance_supervisor', 'finance_staff'])
})

// ========== EXPORT/IMPORT VALIDATION ==========
export const exportOptionsSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']),
  includeDetails: z.boolean().optional(),
  dateRange: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).optional()
})

// ========== PRINT VALIDATION ==========
export const printOptionsSchema = z.object({
  printer: z.string().optional(),
  copies: z.number().int().min(1).max(10).optional(),
  format: z.enum(['a4', 'letter', 'dotmatrix']).optional()
})

// ========== VALIDATION HELPER FUNCTION ==========
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      throw new Error(`Validation error: ${errorMessages}`)
    }
    throw error
  }
}

// ========== VALIDATION WITH CUSTOM MESSAGES ==========
export function validateWithCustomError<T>(
  schema: z.ZodSchema<T>, 
  data: unknown, 
  customMessage?: string
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (customMessage) {
        throw new Error(customMessage)
      }
      
      // Return first error message for better UX
      const firstError = error.issues[0]
      const fieldName = firstError.path.join(' ')
      throw new Error(`${fieldName ? fieldName + ': ' : ''}${firstError.message}`)
    }
    throw error
  }
}

// ========== ASYNC VALIDATION HELPERS ==========
export async function validateUniqueField(
  table: string,
  field: string,
  value: string,
  excludeId?: string
): Promise<boolean> {
  const { Database } = await import('@/lib/database')
  
  let whereClause = { [field]: value }
  if (excludeId) {
    // For updates, exclude current record
    const existing = await Database.query(
      `SELECT id FROM ${table} WHERE ${field} = $1 AND id != $2`,
      [value, excludeId]
    )
    return existing.length === 0
  }
  
  const existing = await Database.findOne(table, whereClause)
  return !existing
}

export async function validateForeignKey(
  table: string,
  id: string
): Promise<boolean> {
  const { Database } = await import('@/lib/database')
  const record = await Database.findOne(table, { id, is_active: true })
  return !!record
}

// Custom validation for NPWP format
export const npwpRegex = /^(\d{2})\.(\d{3})\.(\d{3})\.(\d{1})-(\d{3})\.(\d{3})$|^\d{15}$/

// Custom validation for Indonesian phone numbers
export const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/