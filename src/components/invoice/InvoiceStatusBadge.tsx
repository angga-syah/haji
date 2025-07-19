// components/invoice/InvoiceStatusBadge.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { INVOICE_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface InvoiceStatusBadgeProps {
  status: 'draft' | 'finalized' | 'paid' | 'cancelled'
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function InvoiceStatusBadge({ 
  status, 
  className, 
  size = 'md',
  showIcon = true 
}: InvoiceStatusBadgeProps) {
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          variant: 'secondary' as const,
          color: 'bg-gray-100 text-gray-800',
          icon: '📝',
          label: INVOICE_STATUS_LABELS.draft
        }
      case 'finalized':
        return {
          variant: 'default' as const,
          color: 'bg-blue-100 text-blue-800',
          icon: '📋',
          label: INVOICE_STATUS_LABELS.finalized
        }
      case 'paid':
        return {
          variant: 'success' as const,
          color: 'bg-green-100 text-green-800',
          icon: '✅',
          label: INVOICE_STATUS_LABELS.paid
        }
      case 'cancelled':
        return {
          variant: 'destructive' as const,
          color: 'bg-red-100 text-red-800',
          icon: '❌',
          label: INVOICE_STATUS_LABELS.cancelled
        }
      default:
        return {
          variant: 'outline' as const,
          color: 'bg-gray-100 text-gray-800',
          icon: '❓',
          label: 'Unknown'
        }
    }
  }

  const config = getStatusConfig(status)
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        sizeClasses[size],
        config.color,
        'inline-flex items-center space-x-1 font-medium',
        className
      )}
    >
      {showIcon && <span className="text-xs">{config.icon}</span>}
      <span>{config.label}</span>
    </Badge>
  )
}

// Utility component for status transitions
export function InvoiceStatusTransition({ 
  currentStatus, 
  onStatusChange,
  canChangeStatus = false 
}: {
  currentStatus: string
  onStatusChange: (newStatus: string) => void
  canChangeStatus?: boolean
}) {
  
  if (!canChangeStatus) {
    return <InvoiceStatusBadge status={currentStatus as any} />
  }

  const getNextStatuses = (status: string) => {
    switch (status) {
      case 'draft':
        return ['finalized', 'cancelled']
      case 'finalized':
        return ['paid', 'cancelled']
      case 'paid':
        return [] // Final status
      case 'cancelled':
        return [] // Final status
      default:
        return []
    }
  }

  const nextStatuses = getNextStatuses(currentStatus)

  if (nextStatuses.length === 0) {
    return <InvoiceStatusBadge status={currentStatus as any} />
  }

  return (
    <div className="flex items-center space-x-2">
      <InvoiceStatusBadge status={currentStatus as any} />
      
      <span className="text-gray-400">→</span>
      
      <div className="flex space-x-1">
        {nextStatuses.map(nextStatus => (
          <button
            key={nextStatus}
            onClick={() => onStatusChange(nextStatus)}
            className="inline-flex items-center space-x-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title={`Change to ${INVOICE_STATUS_LABELS[nextStatus as keyof typeof INVOICE_STATUS_LABELS]}`}
          >
            <InvoiceStatusBadge 
              status={nextStatus as any} 
              size="sm"
              showIcon={false}
            />
          </button>
        ))}
      </div>
    </div>
  )
}