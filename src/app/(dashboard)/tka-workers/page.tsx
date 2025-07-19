// app/(dashboard)/tka-workers/page.tsx
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
import { TKAWorkersTable } from '@/components/tables/TKAWorkersTable'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useTKAWorkers, useDeleteTKAWorker } from '@/hooks/api/useTKAWorkers'
import { useAuth } from '@/hooks/ui/useAuth'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { usePagination } from '@/hooks/ui/usePagination'
import { useModal } from '@/hooks/ui/useModal'
import { GENDER_OPTIONS } from '@/lib/constants'

export default function TKAWorkersPage() {
  const router = useRouter()
  const { canManageTKAWorkers } = useAuth()
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('')
  const [divisionFilter, setDivisionFilter] = useState<string>('')
  
  // Pagination
  const pagination = usePagination({ initialLimit: 20 })
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  // Modals
  const deleteModal = useModal()
  const [selectedWorker, setSelectedWorker] = useState<any>(null)
  
  // API calls
  const { 
    data: workersData, 
    isLoading, 
    error,
    refetch 
  } = useTKAWorkers({
    query: debouncedSearch,
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: 'nama',
    orderDirection: 'asc'
  })
  
  const deleteWorker = useDeleteTKAWorker()
  
  // Update pagination total when data changes
  React.useEffect(() => {
    if (workersData?.pagination?.total) {
      pagination.setTotal(workersData.pagination.total)
    }
  }, [workersData?.pagination?.total])
  
  // Gender filter options
  const genderOptions = [
    { value: '', label: 'All Genders' },
    { value: GENDER_OPTIONS.MALE, label: 'Laki-laki' },
    { value: GENDER_OPTIONS.FEMALE, label: 'Perempuan' }
  ]
  
  // Get unique divisions for filter
  const divisionOptions = React.useMemo(() => {
    if (!workersData?.tka_workers) return [{ value: '', label: 'All Divisions' }]
    
    const uniqueDivisions = Array.from(
      new Set(
        workersData.tka_workers
          .map(worker => worker.divisi)
          .filter(Boolean)
      )
    ).sort()
    
    return [
      { value: '', label: 'All Divisions' },
      ...uniqueDivisions.map(division => ({
        value: division,
        label: division
      }))
    ]
  }, [workersData?.tka_workers])
  
  // Filter workers based on current filters
  const filteredWorkers = React.useMemo(() => {
    if (!workersData?.tka_workers) return []
    
    return workersData.tka_workers.filter(worker => {
      if (genderFilter && worker.jenis_kelamin !== genderFilter) return false
      if (divisionFilter && worker.divisi !== divisionFilter) return false
      return true
    })
  }, [workersData?.tka_workers, genderFilter, divisionFilter])
  
  // Handle delete
  const handleDelete = (worker: any) => {
    setSelectedWorker(worker)
    deleteModal.open()
  }
  
  const confirmDelete = async () => {
    if (!selectedWorker) return
    
    try {
      await deleteWorker.mutateAsync(selectedWorker.id)
      deleteModal.close()
      setSelectedWorker(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete worker:', error)
    }
  }
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setGenderFilter('')
    setDivisionFilter('')
    pagination.firstPage()
  }
  
  // Quick stats calculation
  const quickStats = React.useMemo(() => {
    if (!workersData?.tka_workers) return null
    
    const workers = workersData.tka_workers
    const familyCount = workers.reduce((sum, worker) => sum + (worker.family_members?.length || 0), 0)
    
    return {
      total: workers.length,
      active: workers.filter(worker => worker.is_active).length,
      male: workers.filter(worker => worker.jenis_kelamin === GENDER_OPTIONS.MALE).length,
      female: workers.filter(worker => worker.jenis_kelamin === GENDER_OPTIONS.FEMALE).length,
      familyMembers: familyCount,
      totalInvoices: workers.reduce((sum, worker) => sum + (worker.total_invoices || 0), 0)
    }
  }, [workersData?.tka_workers])

  return (
    <div className="space-y-6">
      <PageTitle
        title="TKA Workers"
        description="Manage foreign workers and their family members"
        action={
          <div className="flex space-x-2">
            {canManageTKAWorkers() && (
              <>
                <Button variant="outline" asChild>
                  <Link href="/tka-workers/import">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Import
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/tka-workers/create">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Worker
                  </Link>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Quick Stats */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{quickStats.total}</div>
              <p className="text-xs text-gray-500">Total Workers</p>
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
              <div className="text-2xl font-bold text-cyan-600">{quickStats.male}</div>
              <p className="text-xs text-gray-500">Male</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-pink-600">{quickStats.female}</div>
              <p className="text-xs text-gray-500">Female</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{quickStats.familyMembers}</div>
              <p className="text-xs text-gray-500">Family Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{quickStats.totalInvoices}</div>
              <p className="text-xs text-gray-500">Total Invoices</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by name or passport..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select
                value={genderFilter}
                onValueChange={setGenderFilter}
                options={genderOptions}
                placeholder="Filter by gender"
              />
            </div>
            <div>
              <Select
                value={divisionFilter}
                onValueChange={setDivisionFilter}
                options={divisionOptions}
                placeholder="Filter by division"
              />
            </div>
            <div>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              Error loading TKA workers. Please try again.
            </div>
          ) : !filteredWorkers.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">
                {debouncedSearch || genderFilter || divisionFilter 
                  ? 'No workers found' 
                  : 'No workers yet'
                }
              </p>
              <p className="text-sm mb-4">
                {debouncedSearch || genderFilter || divisionFilter
                  ? 'Try adjusting your search or filters.' 
                  : 'Get started by adding your first TKA worker.'
                }
              </p>
              {!debouncedSearch && !genderFilter && !divisionFilter && canManageTKAWorkers() && (
                <div className="flex space-x-2">
                  <Button asChild>
                    <Link href="/tka-workers/create">
                      Add First Worker
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/tka-workers/import">
                      Import Workers
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <TKAWorkersTable
                workers={filteredWorkers}
                onDelete={handleDelete}
                canEdit={canManageTKAWorkers()}
              />
              
              {/* Pagination */}
              {workersData?.pagination && workersData.pagination.total > pagination.limit && (
                <div className="p-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {pagination.startItem} to {pagination.endItem} of {pagination.total} workers
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
      {deleteModal.isOpen && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete TKA Worker</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{selectedWorker.nama}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Warning
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <p>This will also delete all family members and may affect existing invoices.</p>
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
                  setSelectedWorker(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                loading={deleteWorker.isPending}
                className="flex-1"
              >
                Delete Worker
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}