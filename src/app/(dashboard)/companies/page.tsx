// app/(dashboard)/companies/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageTitle } from '@/components/common/PageTitle'
import { CompaniesTable } from '@/components/tables/CompaniesTable'
import { SearchForm } from '@/components/forms/SearchForm'
import { useCompanies, useDeleteCompany } from '@/hooks/api/useCompanies'
import { RoleGuard } from '@/components/auth/RoleGuard'
import type { CompanyWithJobs } from '@/lib/types'

export default function CompaniesPage() {
  const [searchParams, setSearchParams] = useState({
    query: '',
    limit: 20,
    offset: 0,
    orderBy: 'created_at',
    orderDirection: 'desc' as 'asc' | 'desc'
  })

  const { data: companiesData, isLoading } = useCompanies(searchParams)
  const deleteCompany = useDeleteCompany()

  const handleSearch = (params: any) => {
    setSearchParams({
      ...searchParams,
      ...params,
      offset: 0 // Reset to first page
    })
  }

  const handleSort = (column: string) => {
    setSearchParams({
      ...searchParams,
      orderBy: column,
      orderDirection: searchParams.orderBy === column && searchParams.orderDirection === 'asc' ? 'desc' : 'asc',
      offset: 0
    })
  }

  const handleDelete = async (company: CompanyWithJobs) => {
    if (window.confirm(`Are you sure you want to delete "${company.company_name}"?`)) {
      try {
        await deleteCompany.mutateAsync(company.id)
      } catch (error) {
        alert(`Failed to delete company: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleEdit = (company: CompanyWithJobs) => {
    // Navigate to edit page
    window.location.href = `/companies/${company.id}/edit`
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title="Companies"
        description="Manage client companies and their information"
        action={
          <RoleGuard allowedRoles={['admin', 'finance_staff']}>
            <Link href="/companies/create">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Company
              </Button>
            </Link>
          </RoleGuard>
        }
      />

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4">
        <SearchForm
          onSearch={handleSearch}
          initialValues={searchParams}
        />
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg border">
        <CompaniesTable
          companies={companiesData?.companies || []}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          sortBy={searchParams.orderBy}
          sortDirection={searchParams.orderDirection}
          onSort={handleSort}
        />
      </div>

      {/* Pagination - You can implement this */}
      {companiesData?.pagination && (
        <div className="flex justify-center">
          <p className="text-sm text-gray-500">
            Showing {companiesData.companies.length} companies
            {companiesData.pagination.hasMore && ' (more available)'}
          </p>
        </div>
      )}
    </div>
  )
}