// hooks/ui/useModal.ts
import { useState, useCallback } from 'react'

interface UseModalReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setOpen: (open: boolean) => void
}

/**
 * Hook for managing modal state
 * @param initialState - Initial open state (default: false)
 * @returns Modal state and control functions
 */
export function useModal(initialState: boolean = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen
  }
}

/**
 * Hook for managing multiple modals with IDs
 * @returns Modal state management for multiple modals
 */
export function useMultiModal() {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set())

  const isOpen = useCallback((id: string) => {
    return openModals.has(id)
  }, [openModals])

  const open = useCallback((id: string) => {
    setOpenModals(prev => new Set(prev).add(id))
  }, [])

  const close = useCallback((id: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [])

  const toggle = useCallback((id: string) => {
    setOpenModals(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const closeAll = useCallback(() => {
    setOpenModals(new Set())
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    closeAll,
    openModals: Array.from(openModals)
  }
}

/**
 * Hook for confirmation modal with promise-based API
 * @returns Confirmation modal controls
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)
  const [config, setConfig] = useState<{
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  }>({})

  const confirm = useCallback((options: typeof config = {}) => {
    setConfig(options)
    setIsOpen(true)
    
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (resolver) {
      resolver(true)
      setResolver(null)
    }
    setIsOpen(false)
  }, [resolver])

  const handleCancel = useCallback(() => {
    if (resolver) {
      resolver(false)
      setResolver(null)
    }
    setIsOpen(false)
  }, [resolver])

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel
  }
}