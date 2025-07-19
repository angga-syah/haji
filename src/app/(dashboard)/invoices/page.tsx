// app/(dashboard)/invoices/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { InvoicesTable } from '@/components/tables/InvoicesTable'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice } from '@/hooks/api/useInvoices'
import { useAuth } from '@/hooks/ui/useAuth'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { usePagination } from '@/hooks/ui/usePagination'
import { useModal } from '@/hooks/ui/useModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { INVOICE_STATUS, INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/constants'
import type { InvoiceSearchParams } from '@/lib/types'

export default function InvoicesPage() {
  const router = useRouter()
  const { canCreateInvoices, canMarkAsPaid } = useAuth()
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Pagination
  const pagination = usePagination({ initialLimit: 20 })
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  // Modals
  const deleteModal = useModal()
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  
  // API calls
  const searchParams: InvoiceSearchParams = {
    query: debouncedSearch,
    status: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    limit: pagination.limit,
    offset: pagination.offset
  }
  
  const { 
    data: invoicesData, 
    isLoading, 
    error,
    refetch 
  } = useInvoices(searchParams)
  
  const updateStatus = useUpdateInvoiceStatus()
  const deleteInvoice = useDeleteInvoice()
  
  // Update pagination total when data changes
  React.useEffect(() => {
    if (invoicesData?.pagination?.total) {
      pagination.setTotal(invoicesData.pagination.total)
    }
  }, [invoicesData?.pagination?.total])
  
  // Status options for filter
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: INVOICE_STATUS.DRAFT, label: INVOICE_STATUS_LABELS.draft },
    { value: INVOICE_STATUS.FINALIZED, label: INVOICE_STATUS_LABELS.finalized },
    { value: INVOICE_STATUS.PAID, label: INVOICE_STATUS_LABELS.paid },
    { value: INVOICE_STATUS.CANCELLED, label: INVOICE_STATUS_LABELS.cancelled }
  ]
  
  // Handle status change
  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: invoiceId, status: newStatus as any })
      refetch()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }
  
  // Handle delete
  const handleDelete = (invoice: any) => {
    setSelectedInvoice(invoice)
    deleteModal.open()
  }
  
  const confirmDelete = async () => {
    if (!selectedInvoice) return
    
    try {
      await deleteInvoice.mutateAsync(selectedInvoice.id)
      deleteModal.close()
      setSelectedInvoice(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
    }
  }
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    pagination.firstPage()
  }
  
  // Quick stats calculation
  const quickStats = React.useMemo(() => {
    if (!invoicesData?.invoices) return null
    
    const invoices = invoicesData.invoices
    return {
      total: invoices.length,
      draft: invoices.filter(inv => inv.status === 'draft').length,
      finalized: invoices.filter(inv => inv.status === 'finalized').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    }
  }, [invoicesData?.invoices])

  return (
    <div className="space-y-6">
      <PageTitle
        title="Invoices"
        description="Manage your invoices and track payments"
        action={
          canCreateInvoices() && (
            <Button asChild>
              <Link href="/invoices/create">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Invoice
              </Link>
            </Button>
          )
        }
      />

      {/* Quick Stats */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{quickStats.total}</div>
              <p className="text-xs text-gray-500">Total Invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{quickStats.draft}</div>
              <p className="text-xs text-gray-500">Draft</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{quickStats.finalized}</div>
              <p className="text-xs text-gray-500">Finalized</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{quickStats.paid}</div>
              <p className="text-xs text-gray-500">Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(quickStats.totalAmount)}
              </div>
              <p className="text-xs text-gray-500">Total Value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
                placeholder="Filter by status"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="From date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              Error loading invoices. Please try again.
            </div>
          ) : !invoicesData?.invoices?.length ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {debouncedSearch || statusFilter || dateFrom || dateTo ? 
                'No invoices found matching your filters.' : 
                'No invoices created yet.'
              }
            </div>
          ) : (
            <>
              <InvoicesTable
                invoices={invoicesData.invoices}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                canMarkAsPaid={canMarkAsPaid()}
                canEdit={canCreateInvoices()}
              />
              
              {/* Pagination */}
              {invoicesData.pagination && invoicesData.pagination.total > pagination.limit && (
                <div className="p-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {pagination.startItem} to {pagination.endItem} of {pagination.total} invoices
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pagination.previousPage}
                        disabled={!pagination.hasPrevious}
                      >
                        Previous
                      </Button>
                      {pagination.pageRange.map((page) => (
                        <Button
                          key={page}
                          variant={page === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => pagination.setPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pagination.nextPage}
                        disabled={!pagination.hasNext}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Invoice</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete invoice <strong>{selectedInvoice.invoice_number}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  deleteModal.close()
                  setSelectedInvoice(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                loading={deleteInvoice.isPending}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}