// components/common/ConfirmDialog.tsx
'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isLoading?: boolean
  icon?: React.ReactNode
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  icon
}: ConfirmDialogProps) {
  
  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirmation action failed:', error)
      // Don't close on error - let the parent handle it
    }
  }

  const defaultIcon = isDestructive ? (
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
  ) : (
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  )

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={isLoading ? undefined : onClose}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {icon || defaultIcon}
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <DialogFooter className="sm:flex-row sm:justify-center sm:space-x-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Utility function to use with UI store
export function useConfirmDialog() {
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options: {
      confirmText?: string
      cancelText?: string
      isDestructive?: boolean
    } = {}
  ) => {
    // This would integrate with the UI store
    // For now, return a promise that can be used directly
    return new Promise<boolean>((resolve) => {
      const confirmed = window.confirm(`${title}\n\n${message}`)
      if (confirmed) {
        try {
          const result = onConfirm()
          if (result instanceof Promise) {
            result.then(() => resolve(true)).catch(() => resolve(false))
          } else {
            resolve(true)
          }
        } catch (error) {
          resolve(false)
        }
      } else {
        resolve(false)
      }
    })
  }

  return { showConfirm }
}