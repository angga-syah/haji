// app/(dashboard)/companies/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CompaniesTable } from '@/components/tables/CompaniesTable'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useCompanies, useDeleteCompany } from '@/hooks/api/useCompanies'
import { useAuth } from '@/hooks/ui/useAuth'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { usePagination } from '@/hooks/ui/usePagination'
import { useModal } from '@/hooks/ui/useModal'
import { formatCurrency } from '@/lib/utils'

export default function CompaniesPage() {
  const router = useRouter()
  const { canManageCompanies } = useAuth()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  // Pagination
  const pagination = usePagination({ initialLimit: 20 })
  
  // Modals
  const deleteModal = useModal()
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  
  // API calls
  const { 
    data: companiesData, 
    isLoading, 
    error,
    refetch 
  } = useCompanies({
    query: debouncedSearch,
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: 'company_name',
    orderDirection: 'asc'
  })
  
  const deleteCompany = useDeleteCompany()
  
  // Update pagination total when data changes
  React.useEffect(() => {
    if (companiesData?.pagination?.total) {
      pagination.setTotal(companiesData.pagination.total)
    }
  }, [companiesData?.pagination?.total])
  
  // Handle delete
  const handleDelete = (company: any) => {
    setSelectedCompany(company)
    deleteModal.open()
  }
  
  const confirmDelete = async () => {
    if (!selectedCompany) return
    
    try {
      await deleteCompany.mutateAsync(selectedCompany.id)
      deleteModal.close()
      setSelectedCompany(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete company:', error)
    }
  }
  
  // Quick stats calculation
  const quickStats = React.useMemo(() => {
    if (!companiesData?.companies) return null
    
    const companies = companiesData.companies
    return {
      total: companies.length,
      active: companies.filter(comp => comp.is_active).length,
      totalJobs: companies.reduce((sum, comp) => sum + (comp.job_descriptions?.length || 0), 0),
      totalInvoices: companies.reduce((sum, comp) => sum + (comp.total_invoices || 0), 0),
      totalAmount: companies.reduce((sum, comp) => sum + (comp.total_amount || 0), 0)
    }
  }, [companiesData?.companies])

  return (
    <div className="space-y-6">
      <PageTitle
        title="Companies"
        description="Manage client companies and their job descriptions"
        action={
          canManageCompanies() && (
            <Button asChild>
              <Link href="/companies/create">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Company
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
              <p className="text-xs text-gray-500">Total Companies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{quickStats.active}</div>
              <p className="text-xs text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{quickStats.totalJobs}</div>
              <p className="text-xs text-gray-500">Job Descriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{quickStats.totalInvoices}</div>
              <p className="text-xs text-gray-500">Total Invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(quickStats.totalAmount)}
              </div>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search companies by name, NPWP, or IDTKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              Error loading companies. Please try again.
            </div>
          ) : !companiesData?.companies?.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg font-medium mb-2">
                {debouncedSearch ? 'No companies found' : 'No companies yet'}
              </p>
              <p className="text-sm mb-4">
                {debouncedSearch 
                  ? 'Try adjusting your search terms.' 
                  : 'Get started by adding your first company.'
                }
              </p>
              {!debouncedSearch && canManageCompanies() && (
                <Button asChild>
                  <Link href="/companies/create">
                    Add First Company
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <CompaniesTable
                companies={companiesData.companies}
                onDelete={handleDelete}
                canEdit={canManageCompanies()}
              />
              
              {/* Pagination */}
              {companiesData.pagination && companiesData.pagination.total > pagination.limit && (
                <div className="p-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {pagination.startItem} to {pagination.endItem} of {pagination.total} companies
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
      {deleteModal.isOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Company</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{selectedCompany.company_name}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Warning
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <p>This will also delete all job descriptions and may affect existing invoices.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  deleteModal.close()
                  setSelectedCompany(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                loading={deleteCompany.isPending}
                className="flex-1"
              >
                Delete Company
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}