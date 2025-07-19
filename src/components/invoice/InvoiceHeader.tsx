// components/invoice/InvoiceHeader.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/constants'
import type { InvoiceWithDetails } from '@/lib/types'

interface InvoiceHeaderProps {
  invoice: InvoiceWithDetails
  showActions?: boolean
  onEdit?: () => void
  onPrint?: () => void
  onDelete?: () => void
  onStatusChange?: (status: string) => void
  canEdit?: boolean
  canDelete?: boolean
  canChangeStatus?: boolean
}

export function InvoiceHeader({
  invoice,
  showActions = true,
  onEdit,
  onPrint,
  onDelete,
  onStatusChange,
  canEdit = true,
  canDelete = true,
  canChangeStatus = false
}: InvoiceHeaderProps) {

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'finalized':
        return 'default'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-start justify-between">
        {/* Invoice Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {invoice.invoice_number}
            </h1>
            
            <Badge 
              variant={getStatusBadgeVariant(invoice.status)}
              className="text-sm"
            >
              {INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Company:</span>
              <div className="font-medium">{invoice.company_name}</div>
            </div>
            
            <div>
              <span className="text-gray-500">Date:</span>
              <div className="font-medium">{formatDate(invoice.invoice_date)}</div>
            </div>
            
            <div>
              <span className="text-gray-500">Total Amount:</span>
              <div className="font-medium text-lg text-green-600">
                {formatCurrency(invoice.total_amount)}
              </div>
            </div>
            
            <div>
              <span className="text-gray-500">Line Items:</span>
              <div className="font-medium">{invoice.line_count}</div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-3">
              <span className="text-gray-500 text-sm">Notes:</span>
              <div className="text-sm text-gray-700 mt-1">{invoice.notes}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-3 ml-6">
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
              >
                Print
              </Button>
            )}

            {canEdit && onEdit && invoice.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                Edit
              </Button>
            )}

            {canChangeStatus && onStatusChange && (
              <div className="flex space-x-2">
                {invoice.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => onStatusChange('finalized')}
                  >
                    Finalize
                  </Button>
                )}
                
                {invoice.status === 'finalized' && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onStatusChange('paid')}
                  >
                    Mark as Paid
                  </Button>
                )}
              </div>
            )}

            {canDelete && onDelete && invoice.status === 'draft' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Additional Info Row */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
          <div>
            Created: {formatDate(invoice.created_at)} by {invoice.created_by}
          </div>
          
          {invoice.updated_at !== invoice.created_at && (
            <div>
              Last updated: {formatDate(invoice.updated_at)}
            </div>
          )}
          
          {invoice.printed_count > 0 && (
            <div>
              Printed: {invoice.printed_count} time{invoice.printed_count > 1 ? 's' : ''}
              {invoice.last_printed_at && ` (last: ${formatDate(invoice.last_printed_at)})`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}