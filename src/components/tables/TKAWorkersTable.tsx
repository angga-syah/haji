
// components/tables/TKAWorkersTable.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { DataTable, Column } from './DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { TKAWorkerWithFamily } from '@/lib/types'

interface TKAWorkersTableProps {
  workers: TKAWorkerWithFamily[]
  loading?: boolean
  onEdit?: (worker: TKAWorkerWithFamily) => void
  onDelete?: (worker: TKAWorkerWithFamily) => void
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
}

export function TKAWorkersTable({
  workers,
  loading = false,
  onEdit,
  onDelete,
  sortBy,
  sortDirection,
  onSort
}: TKAWorkersTableProps) {
  const columns: Column<TKAWorkerWithFamily>[] = [
    {
      key: 'nama',
      label: 'Name',
      sortable: true,
      render: (value, worker) => (
        <div>
          <Link
            href={`/tka-workers/${worker.id}`}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {value}
          </Link>
          <div className="text-sm text-gray-500">
            {worker.jenis_kelamin}
          </div>
        </div>
      )
    },
    {
      key: 'passport',
      label: 'Passport',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'divisi',
      label: 'Division',
      render: (value) => value || '-'
    },
    {
      key: 'family_count',
      label: 'Family',
      render: (value) => (
        <Badge variant="secondary">
          {value} member{value !== 1 ? 's' : ''}
        </Badge>
      )
    },
    {
      key: 'invoice_count',
      label: 'Invoices',
      render: (value) => (
        <Badge variant="outline">
          {value} invoice{value !== 1 ? 's' : ''}
        </Badge>
      )
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
      width: '120px',
      render: (_, worker) => (
        <div className="flex space-x-2">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(worker)
              }}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(worker)
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
      data={workers}
      columns={columns}
      loading={loading}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={onSort}
      emptyMessage="No TKA workers found"
    />
  )
}
