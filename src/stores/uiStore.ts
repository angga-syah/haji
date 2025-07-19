// stores/uiStore.ts
'use client'

import { create } from 'zustand'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface Modal {
  id: string
  type: 'confirm' | 'alert' | 'custom'
  title: string
  message?: string
  content?: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  isDestructive?: boolean
}

interface GlobalLoading {
  isLoading: boolean
  message?: string
}

interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
}

interface UIState {
  // Toast notifications
  toasts: Toast[]
  
  // Modals
  modals: Modal[]
  
  // Global loading
  globalLoading: GlobalLoading
  
  // Sidebar
  sidebar: SidebarState
  
  // Page loading states
  pageLoading: Record<string, boolean>
  
  // Form states
  formLoading: Record<string, boolean>
  
  // Bulk operation state
  bulkSelection: string[]
  bulkOperationLoading: boolean
  
  // Actions - Toasts
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  
  // Actions - Modals
  openModal: (modal: Omit<Modal, 'id'>) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void
  setPageLoading: (page: string, loading: boolean) => void
  setFormLoading: (form: string, loading: boolean) => void
  
  // Actions - Sidebar
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapse: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Actions - Bulk operations
  toggleBulkSelection: (id: string) => void
  setBulkSelection: (ids: string[]) => void
  clearBulkSelection: () => void
  setBulkOperationLoading: (loading: boolean) => void
  
  // Utilities
  showSuccessToast: (title: string, message?: string) => void
  showErrorToast: (title: string, message?: string) => void
  showWarningToast: (title: string, message?: string) => void
  showInfoToast: (title: string, message?: string) => void
  
  // Confirmation helpers
  showConfirmDialog: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string
      cancelText?: string
      isDestructive?: boolean
    }
  ) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  modals: [],
  globalLoading: { isLoading: false },
  sidebar: {
    isOpen: true,
    isCollapsed: false
  },
  pageLoading: {},
  formLoading: {},
  bulkSelection: [],
  bulkOperationLoading: false,

  // Toast actions
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    }
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))
    
    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }))
  },

  clearToasts: () => set({ toasts: [] }),

  // Modal actions
  openModal: (modal) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newModal: Modal = {
      ...modal,
      id
    }
    
    set((state) => ({
      modals: [...state.modals, newModal]
    }))
  },

  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter(modal => modal.id !== id)
    }))
  },

  closeAllModals: () => set({ modals: [] }),

  // Loading actions
  setGlobalLoading: (isLoading, message) => {
    set({ globalLoading: { isLoading, message } })
  },

  setPageLoading: (page, loading) => {
    set((state) => ({
      pageLoading: {
        ...state.pageLoading,
        [page]: loading
      }
    }))
  },

  setFormLoading: (form, loading) => {
    set((state) => ({
      formLoading: {
        ...state.formLoading,
        [form]: loading
      }
    }))
  },

  // Sidebar actions
  toggleSidebar: () => {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        isOpen: !state.sidebar.isOpen
      }
    }))
  },

  setSidebarOpen: (open) => {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        isOpen: open
      }
    }))
  },

  toggleSidebarCollapse: () => {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        isCollapsed: !state.sidebar.isCollapsed
      }
    }))
  },

  setSidebarCollapsed: (collapsed) => {
    set((state) => ({
      sidebar: {
        ...state.sidebar,
        isCollapsed: collapsed
      }
    }))
  },

  // Bulk selection actions
  toggleBulkSelection: (id) => {
    set((state) => {
      const isSelected = state.bulkSelection.includes(id)
      return {
        bulkSelection: isSelected
          ? state.bulkSelection.filter(selectedId => selectedId !== id)
          : [...state.bulkSelection, id]
      }
    })
  },

  setBulkSelection: (ids) => set({ bulkSelection: ids }),

  clearBulkSelection: () => set({ bulkSelection: [] }),

  setBulkOperationLoading: (loading) => set({ bulkOperationLoading: loading }),

  // Toast utilities
  showSuccessToast: (title, message) => {
    get().addToast({
      type: 'success',
      title,
      message
    })
  },

  showErrorToast: (title, message) => {
    get().addToast({
      type: 'error',
      title,
      message,
      duration: 8000 // Longer duration for errors
    })
  },

  showWarningToast: (title, message) => {
    get().addToast({
      type: 'warning',
      title,
      message,
      duration: 6000
    })
  },

  showInfoToast: (title, message) => {
    get().addToast({
      type: 'info',
      title,
      message
    })
  },

  // Confirmation dialog utility
  showConfirmDialog: (title, message, onConfirm, options = {}) => {
    get().openModal({
      type: 'confirm',
      title,
      message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      isDestructive: options.isDestructive || false,
      onConfirm,
      onCancel: () => {} // Default empty cancel handler
    })
  }
}))

// Export utilities for easier usage
export const uiUtils = {
  toast: {
    success: (title: string, message?: string) => useUIStore.getState().showSuccessToast(title, message),
    error: (title: string, message?: string) => useUIStore.getState().showErrorToast(title, message),
    warning: (title: string, message?: string) => useUIStore.getState().showWarningToast(title, message),
    info: (title: string, message?: string) => useUIStore.getState().showInfoToast(title, message)
  },
  
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string
      cancelText?: string
      isDestructive?: boolean
    }
  ) => useUIStore.getState().showConfirmDialog(title, message, onConfirm, options),
  
  loading: {
    setGlobal: (loading: boolean, message?: string) => useUIStore.getState().setGlobalLoading(loading, message),
    setPage: (page: string, loading: boolean) => useUIStore.getState().setPageLoading(page, loading),
    setForm: (form: string, loading: boolean) => useUIStore.getState().setFormLoading(form, loading)
  }
}