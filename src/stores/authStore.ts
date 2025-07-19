// stores/authStore.ts
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/lib/types'
import { ROLE_PERMISSIONS, USER_ROLES } from '@/lib/constants'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
  
  // Actions
  setUser: (user: AuthUser | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (user: AuthUser, token: string) => void
  logout: () => void
  clearError: () => void
  
  // Permission helpers
  hasPermission: (resource: string, action: string) => boolean
  hasRole: (roles: string[]) => boolean
  canManageUsers: () => boolean
  canManagePayments: () => boolean
  canCreateInvoices: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      setToken: (token) => set({ token }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      login: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true, 
        error: null 
      }),

      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        error: null 
      }),

      clearError: () => set({ error: null }),

      // Permission helpers
      hasPermission: (resource, action) => {
        const { user } = get()
        if (!user) return false
        
        const permissions = ROLE_PERMISSIONS[user.role]
        if (!permissions) return false
        
        // Admin has all permissions
        if (user.role === USER_ROLES.ADMIN) return true
        
        return permissions.includes(action)
      },

      hasRole: (roles) => {
        const { user } = get()
        if (!user) return false
        return roles.includes(user.role)
      },

      canManageUsers: () => {
        const { user } = get()
        return user?.role === USER_ROLES.ADMIN
      },

      canManagePayments: () => {
        const { user } = get()
        return user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.FINANCE_SUPERVISOR
      },

      canCreateInvoices: () => {
        const { user } = get()
        return user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.FINANCE_STAFF
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
)