// lib/constants.ts

// ========== USER ROLES (UPDATED TO MATCH REQUIREMENTS) ==========
export const USER_ROLES = {
  ADMIN: 'admin',
  FINANCE_SUPERVISOR: 'finance_supervisor', 
  FINANCE_STAFF: 'finance_staff'
} as const

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'create', 'read', 'update', 'delete', 'manage_users', 'manage_settings', 'export', 'pay'
  ],
  [USER_ROLES.FINANCE_SUPERVISOR]: [
    'read', 'export', 'pay' // Can change paid status and export
  ],
  [USER_ROLES.FINANCE_STAFF]: [
    'create', 'read', 'update', 'delete', 'export' // Can CRUD all tables except users
  ]
} as const

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.FINANCE_SUPERVISOR]: 'Finance Supervisor',
  [USER_ROLES.FINANCE_STAFF]: 'Finance Staff'
} as const

export const ROLE_DESCRIPTIONS = {
  [USER_ROLES.ADMIN]: 'Can manage users, roles, and all system settings',
  [USER_ROLES.FINANCE_SUPERVISOR]: 'Can change payment status and export reports',
  [USER_ROLES.FINANCE_STAFF]: 'Can create invoices and manage all data except users'
} as const

// ========== INVOICE STATUS ==========
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const

export const INVOICE_STATUS_COLORS = {
  [INVOICE_STATUS.DRAFT]: 'bg-gray-100 text-gray-800',
  [INVOICE_STATUS.FINALIZED]: 'bg-blue-100 text-blue-800',
  [INVOICE_STATUS.PAID]: 'bg-green-100 text-green-800',
  [INVOICE_STATUS.CANCELLED]: 'bg-red-100 text-red-800'
} as const

export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.DRAFT]: 'Draft',
  [INVOICE_STATUS.FINALIZED]: 'Finalized',
  [INVOICE_STATUS.PAID]: 'Paid',
  [INVOICE_STATUS.CANCELLED]: 'Cancelled'
} as const

// ========== GENDER OPTIONS ==========
export const GENDER_OPTIONS = {
  MALE: 'Laki-laki',
  FEMALE: 'Perempuan'
} as const

// ========== FAMILY RELATIONSHIPS ==========
export const FAMILY_RELATIONSHIPS = {
  SPOUSE: 'spouse',
  PARENT: 'parent',
  CHILD: 'child'
} as const

export const FAMILY_RELATIONSHIP_LABELS = {
  [FAMILY_RELATIONSHIPS.SPOUSE]: 'Spouse',
  [FAMILY_RELATIONSHIPS.PARENT]: 'Parent',
  [FAMILY_RELATIONSHIPS.CHILD]: 'Child'
} as const

// ========== PAGINATION ==========
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  DEFAULT_OFFSET: 0
} as const

// ========== SEARCH ==========
export const SEARCH = {
  DEBOUNCE_DELAY: 300,
  MIN_SEARCH_LENGTH: 2,
  MAX_RESULTS: 50,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
} as const

// ========== VAT CALCULATION ==========
export const VAT = {
  DEFAULT_PERCENTAGE: 11.00,
  SPECIAL_ROUNDING_THRESHOLD: 0.49,
  STANDARD_ROUNDING_THRESHOLD: 0.50
} as const

// ========== INVOICE NUMBERS ==========
export const INVOICE_NUMBER = {
  PREFIX: 'INV',
  YEAR_DIGITS: 2,
  MONTH_DIGITS: 2,
  SEQUENCE_DIGITS: 3,
  SEPARATOR: '-'
} as const

// ========== VALIDATION RULES ==========
export const VALIDATION = {
  NPWP_LENGTH: 15,
  PASSPORT_MIN_LENGTH: 6,
  PASSPORT_MAX_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  COMPANY_NAME_MIN_LENGTH: 2,
  COMPANY_NAME_MAX_LENGTH: 200,
  JOB_NAME_MAX_LENGTH: 200,
  JOB_DESCRIPTION_MAX_LENGTH: 1000,
  NOTES_MAX_LENGTH: 1000,
  MAX_DECIMAL_PLACES: 2,
  MAX_PRICE: 999999999.99,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 9999,
  MAX_INVOICE_LINES: 100
} as const

// ========== FILE UPLOAD ==========
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_FORMATS: {
    EXCEL: ['.xlsx', '.xls'],
    CSV: ['.csv'],
    PDF: ['.pdf'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif']
  },
  BATCH_SIZE: 100
} as const

// ========== DATE FORMATS ==========
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
  FILE_NAME: 'YYYYMMDD_HHmmss'
} as const

// ========== CURRENCY ==========
export const CURRENCY = {
  LOCALE: 'id-ID',
  CURRENCY_CODE: 'IDR',
  SYMBOL: 'Rp',
  DECIMAL_PLACES: 0 // Indonesian Rupiah typically doesn't use decimals
} as const

// ========== PRINT SETTINGS ==========
export const PRINT = {
  DPI: 180,
  PAPER_SIZES: {
    A4: { width: 210, height: 297 },
    LETTER: { width: 216, height: 279 },
    DOT_MATRIX: { width: 210, height: 297 }
  },
  MARGINS: {
    DEFAULT: { top: 20, right: 20, bottom: 20, left: 20 },
    NARROW: { top: 10, right: 10, bottom: 10, left: 10 }
  }
} as const

// ========== PDF GENERATION ==========
export const PDF = {
  FONTS: {
    HEADER: 20,
    TITLE: 16,
    NORMAL: 10,
    SMALL: 8,
    TINY: 6
  },
  COLORS: {
    PRIMARY: '#1f2937',
    SECONDARY: '#6b7280',
    ACCENT: '#3b82f6',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444'
  },
  LINE_HEIGHT: {
    NORMAL: 1.4,
    COMPACT: 1.2,
    LOOSE: 1.6
  }
} as const

// ========== API ENDPOINTS ==========
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
    CHANGE_PASSWORD: '/api/auth/change-password',
    PROFILE: '/api/auth/profile'
  },
  COMPANIES: '/api/companies',
  TKA_WORKERS: '/api/tka-workers',
  JOB_DESCRIPTIONS: '/api/job-descriptions',
  INVOICES: '/api/invoices',
  BANK_ACCOUNTS: '/api/bank-accounts',
  SETTINGS: '/api/settings',
  REPORTS: '/api/reports'
} as const

// ========== ERROR CODES ==========
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

// ========== SUCCESS MESSAGES ==========
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in',
  LOGOUT: 'Successfully logged out',
  REGISTER: 'Account created successfully',
  CREATE: 'Item created successfully',
  UPDATE: 'Item updated successfully',
  DELETE: 'Item deleted successfully',
  IMPORT: 'Data imported successfully',
  EXPORT: 'Data exported successfully'
} as const

// ========== ERROR MESSAGES ==========
export const ERROR_MESSAGES = {
  LOGIN_FAILED: 'Invalid email or password',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'The requested item was not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  DUPLICATE_EMAIL: 'An account with this email already exists',
  DUPLICATE_NPWP: 'A company with this NPWP already exists',
  DUPLICATE_PASSPORT: 'A worker with this passport already exists',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred'
} as const

// ========== LOCAL STORAGE KEYS ==========
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth-token',
  USER_PREFERENCES: 'user-preferences',
  SEARCH_CACHE: 'search-cache',
  FORM_DRAFT: 'form-draft',
  THEME: 'theme'
} as const

// ========== ROUTES ==========
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/',
  INVOICES: '/invoices',
  INVOICE_CREATE: '/invoices/create',
  INVOICE_EDIT: (id: string) => `/invoices/${id}/edit`,
  INVOICE_VIEW: (id: string) => `/invoices/${id}`,
  INVOICE_PRINT: (id: string) => `/invoices/${id}/print`,
  COMPANIES: '/companies',
  COMPANY_CREATE: '/companies/create',
  COMPANY_EDIT: (id: string) => `/companies/${id}/edit`,
  COMPANY_VIEW: (id: string) => `/companies/${id}`,
  TKA_WORKERS: '/tka-workers',
  TKA_WORKER_CREATE: '/tka-workers/create',
  TKA_WORKER_EDIT: (id: string) => `/tka-workers/${id}/edit`,
  TKA_WORKER_VIEW: (id: string) => `/tka-workers/${id}`,
  TKA_WORKER_FAMILY: (id: string) => `/tka-workers/${id}/family`,
  JOB_DESCRIPTIONS: '/job-descriptions',
  JOB_DESCRIPTION_CREATE: '/job-descriptions/create',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  SETTINGS_USERS: '/settings/users',
  SETTINGS_BANKS: '/settings/banks',
  SETTINGS_SYSTEM: '/settings/system'
} as const

// ========== FEATURE FLAGS ==========
export const FEATURES = {
  ELECTRON_PRINTING: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_ELECTRON === 'true',
  ADVANCED_SEARCH: true,
  BULK_OPERATIONS: true,
  AUDIT_TRAIL: true,
  REAL_TIME_SYNC: false // For future use
} as const

// ========== BUSINESS RULES ==========
export const BUSINESS_RULES = {
  // Special VAT rounding: .49 rounds down, .50+ rounds up
  VAT_ROUNDING: {
    SPECIAL_CASE: 0.49,
    ROUND_UP_THRESHOLD: 0.50
  },
  // Invoice number format: INV-YY-MM-NNN
  INVOICE_NUMBER_FORMAT: {
    REGEX: /^INV-\d{2}-\d{2}-\d{3}$/,
    EXAMPLE: 'INV-24-12-001'
  },
  // TKA assignment rules
  TKA_ASSIGNMENT: {
    ALLOW_MULTIPLE_COMPANIES: true,
    REQUIRE_ACTIVE_STATUS: true,
    FAMILY_INHERITS_ASSIGNMENTS: true
  },
  // Role access rules
  ROLE_ACCESS: {
    ADMIN_ONLY: ['users', 'system_settings'],
    SUPERVISOR_PAYMENT: ['invoice_payment_status'],
    STAFF_CRUD: ['companies', 'tka_workers', 'job_descriptions', 'invoices']
  }
} as const

// ========== THEMES ==========
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const

// ========== NAVIGATION MENU ==========
export const NAV_ITEMS = {
  DASHBOARD: {
    label: 'Dashboard',
    href: '/',
    icon: 'home',
    roles: ['admin', 'finance_supervisor', 'finance_staff']
  },
  INVOICES: {
    label: 'Invoices',
    href: '/invoices',
    icon: 'receipt',
    roles: ['admin', 'finance_supervisor', 'finance_staff']
  },
  COMPANIES: {
    label: 'Companies',
    href: '/companies',
    icon: 'building',
    roles: ['admin', 'finance_staff']
  },
  TKA_WORKERS: {
    label: 'TKA Workers',
    href: '/tka-workers',
    icon: 'users',
    roles: ['admin', 'finance_staff']
  },
  JOB_DESCRIPTIONS: {
    label: 'Job Descriptions',
    href: '/job-descriptions',
    icon: 'briefcase',
    roles: ['admin', 'finance_staff']
  },
  REPORTS: {
    label: 'Reports',
    href: '/reports',
    icon: 'chart',
    roles: ['admin', 'finance_supervisor', 'finance_staff']
  },
  SETTINGS: {
    label: 'Settings',
    href: '/settings',
    icon: 'settings',
    roles: ['admin']
  }
} as const

// ========== EXPORT ==========
export default {
  USER_ROLES,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  INVOICE_STATUS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  GENDER_OPTIONS,
  FAMILY_RELATIONSHIPS,
  FAMILY_RELATIONSHIP_LABELS,
  PAGINATION,
  SEARCH,
  VAT,
  INVOICE_NUMBER,
  VALIDATION,
  FILE_UPLOAD,
  DATE_FORMATS,
  CURRENCY,
  PRINT,
  PDF,
  API_ENDPOINTS,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  STORAGE_KEYS,
  ROUTES,
  FEATURES,
  BUSINESS_RULES,
  THEMES,
  NAV_ITEMS
}