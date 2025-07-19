// components/tables/DataTable.tsx
'use client'

import React from 'react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, item: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  sortBy,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  emptyMessage = 'No data available',
  className
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key as string)
    }
  }

  const renderCellValue = (column: Column<T>, item: T, index: number) => {
    const value = getNestedValue(item, column.key as string)
    
    if (column.render) {
      return column.render(value, item, index)
    }
    
    return value
  }

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, p) => o?.[p], obj)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key as string}
                style={{ width: column.width }}
                className={cn(
                  column.sortable && 'cursor-pointer hover:bg-gray-50 select-none',
                  sortBy === column.key && 'bg-gray-50'
                )}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center space-x-2">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <div className="flex flex-col">
                      <svg
                        className={cn(
                          'h-3 w-3',
                          sortBy === column.key && sortDirection === 'asc'
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      <svg
                        className={cn(
                          'h-3 w-3 -mt-1',
                          sortBy === column.key && sortDirection === 'desc'
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12 text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow
                key={item.id || index}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-gray-50'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key as string}>
                    {renderCellValue(column, item, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
