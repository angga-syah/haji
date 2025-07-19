
// components/tables/InvoicesTable.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { DataTable, Column } from './DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { InvoiceWithDetails } from '@/lib/types'

interface InvoicesTableProps {
  invoices: InvoiceWithDetails[]
  loading?: boolean
  onEdit?: (invoice: InvoiceWithDetails) => void
  onDelete?: (invoice: InvoiceWithDetails) => void
  onPrint?: (invoice: InvoiceWithDetails) => void
  onStatusChange?: (invoiceId: string, newStatus: string) => Promise<void>
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  canMarkAsPaid?: boolean
  canEdit?: boolean
}

const getStatusBadge = (status: string) => {
  const variants = {
    draft: 'secondary',
    finalized: 'default',
    paid: 'success',
    cancelled: 'destructive'
  } as const

  return (
    <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function InvoicesTable({
  invoices,
  loading = false,
  onEdit,
  onDelete,
  onPrint,
  sortBy,
  sortDirection,
  onSort
}: InvoicesTableProps) {
  const columns: Column<InvoiceWithDetails>[] = [
    {
      key: 'invoice_number',
      label: 'Invoice Number',
      sortable: true,
      render: (value, invoice) => (
        <div>
          <Link
            href={`/invoices/${invoice.id}`}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {value}
          </Link>
          <div className="text-sm text-gray-500">
            {formatDate(invoice.invoice_date)}
          </div>
        </div>
      )
    },
    {
      key: 'company_name',
      label: 'Company',
      sortable: true,
      render: (value, invoice) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">
            NPWP: {invoice.company_npwp}
          </div>
        </div>
      )
    },
    {
      key: 'line_count',
      label: 'Items',
      render: (value) => (
        <Badge variant="outline">
          {value} item{value !== 1 ? 's' : ''}
        </Badge>
      )
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      sortable: true,
      render: (value) => (
        <span className="font-medium">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '180px',
      render: (_, invoice) => (
        <div className="flex space-x-1">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(invoice)
              }}
            >
              Edit
            </Button>
          )}
          {onPrint && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onPrint(invoice)
              }}
            >
              Print
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(invoice)
              }}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <DataTable
      data={invoices}
      columns={columns}
      loading={loading}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={onSort}
      emptyMessage="No invoices found"
    />
  )
}