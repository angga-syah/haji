// lib/types.ts

// ========== USER & AUTH TYPES ==========
export interface User {
  id: string
  email: string
  password_hash?: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  username: string
  role: 'admin' | 'finance_supervisor' | 'finance_staff'
  full_name: string
  avatar_url?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'finance_supervisor' | 'finance_staff'
  full_name: string
}

// ========== COMPANY TYPES ==========
export interface Company {
  id: string
  company_name: string
  npwp: string
  idtku: string
  address: string
  contact_phone?: string
  contact_email?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateCompanyData {
  company_name: string
  npwp: string
  idtku: string
  address: string
  contact_phone?: string
  contact_email?: string
}

// ========== TKA WORKER TYPES ==========
export interface TKAWorker {
  id: string
  nama: string
  passport: string
  divisi?: string
  jenis_kelamin: 'Laki-laki' | 'Perempuan'
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface TKAFamilyMember {
  id: string
  tka_id: string
  nama: string
  passport: string
  jenis_kelamin: 'Laki-laki' | 'Perempuan'
  relationship: 'spouse' | 'parent' | 'child'
  is_active: boolean
  created_at: string
}

export interface CreateTKAWorkerData {
  nama: string
  passport: string
  divisi?: string
  jenis_kelamin: 'Laki-laki' | 'Perempuan'
}

// ========== JOB DESCRIPTION TYPES ==========
export interface JobDescription {
  id: string
  company_id: string
  job_name: string
  job_description: string
  price: number
  is_active: boolean
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateJobDescriptionData {
  company_id: string
  job_name: string
  job_description: string
  price: number
  sort_order?: number
}

// ========== BANK ACCOUNT TYPES ==========
export interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  account_name: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateBankAccountData {
  bank_name: string
  account_number: string
  account_name: string
  is_default?: boolean
  sort_order?: number
}

// ========== INVOICE TYPES ==========
export interface Invoice {
  id: string
  invoice_number: string
  company_id: string
  invoice_date: string
  subtotal: number
  vat_percentage: number
  vat_amount: number
  total_amount: number
  status: 'draft' | 'finalized' | 'paid' | 'cancelled'
  notes?: string
  bank_account_id?: string
  printed_count: number
  last_printed_at?: string
  imported_from?: string
  import_batch_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  baris: number
  line_order: number
  tka_id: string
  job_description_id: string
  custom_job_name?: string
  custom_job_description?: string
  custom_price?: number
  quantity: number
  unit_price: number
  line_total: number
  created_at: string
}

export interface CreateInvoiceData {
  company_id: string
  invoice_date: string
  notes?: string
  bank_account_id?: string
  lines?: CreateInvoiceLineData[]
}

export interface CreateInvoiceLineData {
  baris?: number
  tka_id: string
  job_description_id: string
  custom_job_name?: string
  custom_job_description?: string
  custom_price?: number
  quantity: number
}

// ========== EXTENDED TYPES FOR VIEWS ==========
export interface InvoiceWithDetails extends Invoice {
  company_name: string
  company_npwp: string
  company_address: string
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  line_count: number
  lines?: InvoiceLineWithDetails[]
}

export interface InvoiceLineWithDetails extends InvoiceLine {
  tka_nama: string
  tka_passport: string
  job_name: string
  job_description: string
  job_price: number
}

export interface CompanyWithJobs extends Company {
  job_descriptions: JobDescription[]
  total_invoices: number
  total_amount: number
}

export interface TKAWorkerWithFamily extends TKAWorker {
  family_members: TKAFamilyMember[]
  total_invoices: number
}

// ========== SEARCH & FILTER TYPES ==========
export interface SearchParams {
  query?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface InvoiceSearchParams extends SearchParams {
  status?: string
  company_id?: string
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
}

export interface PaginationData {
  offset: number
  limit: number
  total: number
  hasMore: boolean
}

// ========== API RESPONSE TYPES ==========
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationData
}

export interface ApiError {
  error: string
  code?: string
  field?: string
}

// ========== FORM TYPES ==========
export interface LoginFormData {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  full_name: string
  username: string
  role: 'admin' | 'finance_supervisor' | 'finance_staff'
}

// ========== BUSINESS LOGIC TYPES ==========
export interface InvoiceCalculation {
  subtotal: number
  vatAmount: number
  total: number
}

export interface InvoiceSequence {
  id: string
  year: number
  month: number
  current_number: number
  prefix: string
  suffix: string
  created_at: string
  updated_at: string
}

export interface AppSetting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: string
  description?: string
  is_system: boolean
  updated_by?: string
  updated_at: string
}

// ========== IMPORT/EXPORT TYPES ==========
export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  includeDetails?: boolean
  dateRange?: {
    from: string
    to: string
  }
}

// ========== PRINT TYPES ==========
export interface PrintOptions {
  printer?: string
  copies?: number
  format?: 'a4' | 'letter' | 'dotmatrix'
}

// ========== PERMISSION TYPES ==========
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  condition?: Record<string, any>
}

export interface RolePermissions {
  admin: Permission[]
  finance_supervisor: Permission[]
  finance_staff: Permission[]
}