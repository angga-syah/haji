// src/app/(dashboard)/job-descriptions/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJobDescriptions, useDeleteJobDescription } from '@/hooks/api/useJobDescriptions'
import { useCompanies } from '@/hooks/api/useCompanies'
import { useAuth } from '@/hooks/ui/useAuth'
import { usePagination } from '@/hooks/ui/usePagination'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { formatCurrency } from '@/lib/utils'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { DataTable } from '@/components/tables/DataTable'
import { TablePagination } from '@/components/tables/TablePagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Building,
  DollarSign,
  FileText,
  ArrowUpDown
} from 'lucide-react'

export default function JobDescriptionsPage() {
  const router = useRouter()
  const { canManageCompanies } = useAuth()
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  // Pagination
  const pagination = usePagination({ initialLimit: 20 })
  
  // API hooks
  const { data: companiesData } = useCompanies({ limit: 100 })
  const { data: jobsData, isLoading, error } = useJobDescriptions(selectedCompany)
  const deleteJobMutation = useDeleteJobDescription()

  const companies = companiesData?.companies || []
  const jobs = jobsData?.job_descriptions || []

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter(job => {
      if (!debouncedSearch) return true
      const searchLower = debouncedSearch.toLowerCase()
      return (
        job.job_name.toLowerCase().includes(searchLower) ||
        job.job_description.toLowerCase().includes(searchLower)
      )
    })
    .sort((a, b) => {
      const aVal = a[sortField as keyof typeof a]
      const bVal = b[sortField as keyof typeof b]
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  // Paginated jobs
  const paginatedJobs = filteredJobs.slice(
    pagination.offset,
    pagination.offset + pagination.limit
  )

  // Update pagination total
  pagination.setTotal(filteredJobs.length)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDelete = async () => {
    if (!deleteJobId) return
    
    try {
      await deleteJobMutation.mutateAsync(deleteJobId)
      setDeleteJobId(null)
    } catch (error) {
      console.error('Failed to delete job description:', error)
    }
  }

  const tableColumns = [
    {
      key: 'job_name',
      label: 'Job Name',
      sortable: true,
      render: (job: any) => (
        <div>
          <div className="font-medium">{job.job_name}</div>
          <div className="text-sm text-gray-500 line-clamp-2">
            {job.job_description}
          </div>
        </div>
      )
    },
    {
      key: 'company_name',
      label: 'Company',
      sortable: true,
      render: (job: any) => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-gray-400" />
          <span>{job.company_name || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (job: any) => (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{formatCurrency(job.price)}</span>
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (job: any) => (
        <Badge variant={job.is_active ? 'default' : 'secondary'}>
          {job.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (job: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/job-descriptions/${job.id}`)}
          >
            <FileText className="w-4 h-4" />
          </Button>
          <RoleGuard allowedRoles={['admin', 'finance_staff']}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/job-descriptions/${job.id}/edit`)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteJobId(job.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </RoleGuard>
        </div>
      )
    }
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageTitle 
            title="Job Descriptions" 
            subtitle="Manage job descriptions and pricing"
          />
          
          <RoleGuard allowedRoles={['admin', 'finance_staff']}>
            <Button onClick={() => router.push('/job-descriptions/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Job Description
            </Button>
          </RoleGuard>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search job descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Company Filter */}
            <Select
              value={selectedCompany}
              onValueChange={setSelectedCompany}
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </Select>

            {/* Sort Field */}
            <Select
              value={sortField}
              onValueChange={setSortField}
            >
              <option value="job_name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="created_at">Sort by Date</option>
            </Select>

            {/* Sort Direction */}
            <Button
              variant="outline"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Total: {filteredJobs.length} job descriptions</span>
            {selectedCompany && (
              <span>• Company: {companies.find(c => c.id === selectedCompany)?.company_name}</span>
            )}
            {debouncedSearch && (
              <span>• Search: "{debouncedSearch}"</span>
            )}
          </div>
        </Card>

        {/* Results */}
        {error ? (
          <Card className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading job descriptions</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : paginatedJobs.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-gray-500">
              {debouncedSearch || selectedCompany ? (
                <div>
                  <p>No job descriptions found matching your criteria</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCompany('')
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div>
                  <p>No job descriptions yet</p>
                  <RoleGuard allowedRoles={['admin', 'finance_staff']}>
                    <Button 
                      onClick={() => router.push('/job-descriptions/create')}
                      className="mt-2"
                    >
                      Create First Job Description
                    </Button>
                  </RoleGuard>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* Table */}
            <Card>
              <DataTable
                data={paginatedJobs}
                columns={tableColumns}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </Card>

            {/* Pagination */}
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={pagination.setPage}
              onItemsPerPageChange={pagination.setLimit}
            />
          </>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteJobId}
          onClose={() => setDeleteJobId(null)}
          onConfirm={handleDelete}
          title="Delete Job Description"
          description="Are you sure you want to delete this job description? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  )
}