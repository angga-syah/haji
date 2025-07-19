
// hooks/ui/useAuth.ts
'use client'

import { useCurrentUser } from '@/hooks/api/useAuth'

export function useAuth() {
  const { data: currentUser, isLoading, error } = useCurrentUser()

  const isAuthenticated = !!currentUser?.user
  const user = currentUser?.user || null

  const hasRole = (roles: string | string[]) => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  const isAdmin = () => hasRole('admin')
  const isFinanceSupervisor = () => hasRole('finance_supervisor')
  const isFinanceStaff = () => hasRole('finance_staff')

  const canManageUsers = () => isAdmin()
  const canManageSettings = () => isAdmin()
  const canMarkAsPaid = () => hasRole(['admin', 'finance_supervisor'])
  const canCreateInvoices = () => hasRole(['admin', 'finance_supervisor', 'finance_staff'])
  const canManageCompanies = () => hasRole(['admin', 'finance_staff'])
  const canManageTKAWorkers = () => hasRole(['admin', 'finance_staff'])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    hasRole,
    isAdmin,
    isFinanceSupervisor,
    isFinanceStaff,
    canManageUsers,
    canManageSettings,
    canMarkAsPaid,
    canCreateInvoices,
    canManageCompanies,
    canManageTKAWorkers
  }
}