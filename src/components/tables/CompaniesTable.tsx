
// components/tables/CompaniesTable.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { DataTable, Column } from './DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency, truncateText } from '@/lib/utils'
import type { CompanyWithJobs } from '@/lib/types'

interface CompaniesTableProps {
  companies: CompanyWithJobs[]
  loading?: boolean
  onEdit?: (company: CompanyWithJobs) => void
  onDelete?: (company: CompanyWithJobs) => void
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  canEdit?: boolean
}

export function CompaniesTable({
  companies,
  loading = false,
  onEdit,
  onDelete,
  sortBy,
  sortDirection,
  onSort
}: CompaniesTableProps) {
  const columns: Column<CompanyWithJobs>[] = [
    {
      key: 'company_name',
      label: 'Company Name',
      sortable: true,
      render: (value, company) => (
        <div>
          <Link
            href={`/companies/${company.id}`}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {value}
          </Link>
          <div className="text-sm text-gray-500">
            NPWP: {company.npwp}
          </div>
        </div>
      )
    },
    {
      key: 'idtku',
      label: 'IDTKU',
      sortable: true
    },
    {
      key: 'address',
      label: 'Address',
      render: (value) => (
        <span title={value}>
          {truncateText(value, 50)}
        </span>
      )
    },
    {
      key: 'job_count',
      label: 'Jobs',
      render: (value) => (
        <Badge variant="secondary">
          {value} job{value !== 1 ? 's' : ''}
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
      key: 'total_amount',
      label: 'Total Revenue',
      render: (value) => (
        <span className="font-medium">
          {formatCurrency(value || 0)}
        </span>
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
      render: (_, company) => (
        <div className="flex space-x-2">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(company)
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
                onDelete(company)
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
      data={companies}
      columns={columns}
      loading={loading}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={onSort}
      emptyMessage="No companies found"
    />
  )
}
