// app/(dashboard)/companies/create/page.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PageTitle } from '@/components/common/PageTitle'
import { CompanyForm } from '@/components/forms/CompanyForm'
import { useCreateCompany } from '@/hooks/api/useCompanies'
import { RoleGuard } from '@/components/auth/RoleGuard'
import type { CreateCompanyData } from '@/lib/types'

export default function CreateCompanyPage() {
  const router = useRouter()
  const createCompany = useCreateCompany()

  const handleSubmit = async (data: CreateCompanyData) => {
    try {
      await createCompany.mutateAsync(data)
      router.push('/companies')
    } catch (error) {
      // Error is handled by the form
      throw error
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'finance_staff']}>
      <div className="p-6 space-y-6">
        <PageTitle
          title="Create New Company"
          description="Add a new client company to the system"
        />

        <CompanyForm
          onSubmit={handleSubmit}
          isLoading={createCompany.isPending}
        />
      </div>
    </RoleGuard>
  )
}