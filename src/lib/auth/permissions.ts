// src/lib/auth/permissions.ts
import type { AuthUser } from '@/lib/types'

// ========== PERMISSION DEFINITIONS ==========
export type Permission = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'manage' 
  | 'export' 
  | 'pay' 
  | 'finalize'

export type Resource = 
  | 'users'
  | 'companies' 
  | 'tka_workers'
  | 'job_descriptions'
  | 'invoices'
  | 'bank_accounts'
  | 'settings'
  | 'reports'

export type UserRole = 'admin' | 'finance_supervisor' | 'finance_staff'

// ========== ROLE PERMISSION MATRIX ==========
const ROLE_PERMISSIONS: Record<UserRole, Record<Resource, Permission[]>> = {
  admin: {
    // Admin has full access to everything
    users: ['create', 'read', 'update', 'delete', 'manage'],
    companies: ['create', 'read', 'update', 'delete'],
    tka_workers: ['create', 'read', 'update', 'delete'],
    job_descriptions: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete', 'finalize', 'pay'],
    bank_accounts: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update', 'manage'],
    reports: ['read', 'export']
  },
  
  finance_supervisor: {
    // Finance Supervisor can view data and change payment status + export
    users: [],
    companies: ['read'],
    tka_workers: ['read'],
    job_descriptions: ['read'],
    invoices: ['read', 'pay', 'export'], // Can change payment status and export
    bank_accounts: ['read'],
    settings: ['read'],
    reports: ['read', 'export']
  },
  
  finance_staff: {
    // Finance Staff can CRUD all data except users (no payment status change)
    users: [],
    companies: ['create', 'read', 'update', 'delete'],
    tka_workers: ['create', 'read', 'update', 'delete'],
    job_descriptions: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete', 'finalize'], // Cannot change payment status
    bank_accounts: ['read'],
    settings: ['read'],
    reports: ['read', 'export']
  }
}

// ========== PERMISSION SERVICE ==========
export class PermissionService {
  /**
   * Check if user has specific permission for resource
   */
  static hasPermission(
    role: UserRole,
    resource: Resource,
    permission: Permission
  ): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role]
    if (!rolePermissions) return false

    const resourcePermissions = rolePermissions[resource]
    if (!resourcePermissions) return false

    return resourcePermissions.includes(permission)
  }

  /**
   * Check multiple permissions at once
   */
  static hasAnyPermission(
    role: UserRole,
    resource: Resource,
    permissions: Permission[]
  ): boolean {
    return permissions.some(permission => 
      this.hasPermission(role, resource, permission)
    )
  }

  /**
   * Check all permissions are granted
   */
  static hasAllPermissions(
    role: UserRole,
    resource: Resource,
    permissions: Permission[]
  ): boolean {
    return permissions.every(permission => 
      this.hasPermission(role, resource, permission)
    )
  }

  /**
   * Get all permissions for a role and resource
   */
  static getPermissions(role: UserRole, resource: Resource): Permission[] {
    return ROLE_PERMISSIONS[role]?.[resource] || []
  }

  /**
   * Get all resources accessible by role
   */
  static getAccessibleResources(role: UserRole): Resource[] {
    const rolePermissions = ROLE_PERMISSIONS[role]
    if (!rolePermissions) return []

    return Object.keys(rolePermissions).filter(resource => 
      ROLE_PERMISSIONS[role][resource as Resource].length > 0
    ) as Resource[]
  }

  /**
   * Check if user can perform action on specific record
   */
  static canAccessRecord(
    user: AuthUser,
    resource: Resource,
    permission: Permission,
    recordOwnerId?: string
  ): boolean {
    // Admin can access everything
    if (user.role === 'admin') {
      return this.hasPermission(user.role, resource, permission)
    }

    // Check basic permission first
    if (!this.hasPermission(user.role, resource, permission)) {
      return false
    }

    // Additional business logic for record-level access
    switch (resource) {
      case 'invoices':
        // Users can only access their own invoices (except admin)
        if (recordOwnerId && recordOwnerId !== user.id && user.role !== 'admin') {
          // Finance supervisor can view all invoices for payment status
          if (user.role === 'finance_supervisor' && permission === 'read') {
            return true
          }
          return false
        }
        return true

      case 'companies':
      case 'tka_workers':
      case 'job_descriptions':
        // Finance staff can access records they created
        if (recordOwnerId && recordOwnerId !== user.id && user.role === 'finance_staff') {
          return permission === 'read' // Can only read others' records
        }
        return true

      default:
        return true
    }
  }

  /**
   * Require permission or throw error
   */
  static requirePermission(
    role: UserRole,
    resource: Resource,
    permission: Permission
  ): void {
    if (!this.hasPermission(role, resource, permission)) {
      throw new Error(
        `Access denied: ${role} cannot ${permission} ${resource}`
      )
    }
  }

  /**
   * Check if role is higher or equal in hierarchy
   */
  static isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      'admin': 3,
      'finance_supervisor': 2,
      'finance_staff': 1
    }

    return hierarchy[userRole] >= hierarchy[requiredRole]
  }
}

// ========== PERMISSION DECORATORS & HELPERS ==========

/**
 * Permission check for API routes
 */
export function requirePermission(
  resource: Resource,
  permission: Permission
) {
  return function(user: AuthUser, recordOwnerId?: string): void {
    if (!PermissionService.canAccessRecord(user, resource, permission, recordOwnerId)) {
      throw new Error(`Insufficient permissions: cannot ${permission} ${resource}`)
    }
  }
}

/**
 * Multiple permission check
 */
export function requireAnyPermission(
  resource: Resource,
  permissions: Permission[]
) {
  return function(user: AuthUser): void {
    if (!PermissionService.hasAnyPermission(user.role, resource, permissions)) {
      throw new Error(`Insufficient permissions: cannot access ${resource}`)
    }
  }
}

/**
 * Admin-only check
 */
export function requireAdmin(user: AuthUser): void {
  if (user.role !== 'admin') {
    throw new Error('Admin access required')
  }
}

/**
 * Finance roles check (supervisor or staff)
 */
export function requireFinanceRole(user: AuthUser): void {
  if (!['finance_supervisor', 'finance_staff'].includes(user.role)) {
    throw new Error('Finance role required')
  }
}

// ========== INVOICE-SPECIFIC PERMISSIONS ==========
export class InvoicePermissions {
  /**
   * Check if user can change invoice status
   */
  static canChangeStatus(
    user: AuthUser,
    fromStatus: string,
    toStatus: string,
    invoiceOwnerId?: string
  ): boolean {
    // Admin can change any status
    if (user.role === 'admin') return true

    // Finance supervisor can change payment status
    if (user.role === 'finance_supervisor') {
      return (fromStatus === 'finalized' && toStatus === 'paid') ||
             (fromStatus === 'paid' && toStatus === 'finalized')
    }

    // Finance staff can change draft to finalized (only their own)
    if (user.role === 'finance_staff') {
      const isOwner = !invoiceOwnerId || invoiceOwnerId === user.id
      return isOwner && fromStatus === 'draft' && toStatus === 'finalized'
    }

    return false
  }

  /**
   * Check if user can edit invoice
   */
  static canEdit(user: AuthUser, status: string, invoiceOwnerId?: string): boolean {
    // Cannot edit paid or cancelled invoices
    if (['paid', 'cancelled'].includes(status)) return false

    // Admin can edit any invoice
    if (user.role === 'admin') return true

    // Finance staff can edit their own drafts and finalized invoices
    if (user.role === 'finance_staff') {
      const isOwner = !invoiceOwnerId || invoiceOwnerId === user.id
      return isOwner && ['draft', 'finalized'].includes(status)
    }

    // Finance supervisor cannot edit invoices
    return false
  }

  /**
   * Check if user can delete invoice
   */
  static canDelete(user: AuthUser, status: string, invoiceOwnerId?: string): boolean {
    // Cannot delete paid invoices
    if (status === 'paid') return false

    // Admin can delete any invoice
    if (user.role === 'admin') return true

    // Finance staff can delete their own non-paid invoices
    if (user.role === 'finance_staff') {
      const isOwner = !invoiceOwnerId || invoiceOwnerId === user.id
      return isOwner
    }

    return false
  }
}

// ========== UI PERMISSION HELPERS ==========
export class UIPermissions {
  /**
   * Check if menu item should be visible
   */
  static canAccessRoute(role: UserRole, path: string): boolean {
    const routePermissions: Record<string, UserRole[]> = {
      '/': ['admin', 'finance_supervisor', 'finance_staff'],
      '/invoices': ['admin', 'finance_supervisor', 'finance_staff'],
      '/companies': ['admin', 'finance_staff'],
      '/tka-workers': ['admin', 'finance_staff'],
      '/job-descriptions': ['admin', 'finance_staff'],
      '/reports': ['admin', 'finance_supervisor', 'finance_staff'],
      '/settings': ['admin'],
      '/settings/users': ['admin'],
      '/settings/banks': ['admin'],
      '/settings/system': ['admin']
    }

    return routePermissions[path]?.includes(role) ?? false
  }

  /**
   * Get filtered navigation items based on role
   */
  static getNavigationItems(role: UserRole) {
    const allItems = [
      { path: '/', label: 'Dashboard', icon: 'home' },
      { path: '/invoices', label: 'Invoices', icon: 'receipt' },
      { path: '/companies', label: 'Companies', icon: 'building' },
      { path: '/tka-workers', label: 'TKA Workers', icon: 'users' },
      { path: '/job-descriptions', label: 'Job Descriptions', icon: 'briefcase' },
      { path: '/reports', label: 'Reports', icon: 'chart' },
      { path: '/settings', label: 'Settings', icon: 'settings' }
    ]

    return allItems.filter(item => this.canAccessRoute(role, item.path))
  }
}

// Export default permission service
export default PermissionService