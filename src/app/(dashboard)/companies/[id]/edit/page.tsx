// src/app/(dashboard)/companies/[id]/edit/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany, useUpdateCompany } from '@/hooks/api/useCompanies'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { CompanyForm } from '@/components/forms/CompanyForm'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ArrowLeft, Save, Eye } from 'lucide-react'

interface CompanyEditPageProps {
  params: { id: string }
}

export default function CompanyEditPage({ params }: CompanyEditPageProps) {
  const router = useRouter()
  const { canManageCompanies } = useAuth()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // API hooks
  const { data: companyData, isLoading, error } = useCompany(params.id)
  const updateCompanyMutation = useUpdateCompany()

  const company = companyData?.company

  // Check if user can edit
  const canEdit = canManageCompanies

  if (isLoading) return <LoadingSpinner />

  if (error || !company) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h2>
          <p className="text-gray-600 mb-4">The company you're trying to edit doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/companies')}>
            Back to Companies
          </Button>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to edit companies.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push(`/companies/${params.id}`)}>
              View Company
            </Button>
            <Button variant="outline" onClick={() => router.push('/companies')}>
              Back to List
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (formData: any) => {
    try {
      await updateCompanyMutation.mutateAsync({
        id: params.id,
        data: formData
      })

      setHasUnsavedChanges(false)
      
      // Navigate back to company detail
      router.push(`/companies/${params.id}`)
      
    } catch (error) {
      console.error('Failed to update company:', error)
      throw error // Let the form handle the error
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }
    
    router.push(`/companies/${params.id}`)
  }

  const handleFormChange = () => {
    setHasUnsavedChanges(true)
  }

  // Initial form data from company
  const initialData = {
    company_name: company.company_name,
    npwp: company.npwp,
    idtku: company.idtku,
    address: company.address,
    contact_phone: company.contact_phone || '',
    contact_email: company.contact_email || ''
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['admin', 'finance_staff']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <PageTitle 
                title={`Edit ${company.company_name}`}
                subtitle="Update company information"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${params.id}`)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </div>
          </div>

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-amber-400 mr-3"></div>
                <div>
                  <p className="text-amber-800 font-medium">Unsaved Changes</p>
                  <p className="text-amber-700 text-sm">You have unsaved changes. Don't forget to save before leaving.</p>
                </div>
              </div>
            </div>
          )}

          {/* Edit Form */}
          <div className="bg-white rounded-lg shadow">
            <CompanyForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onChange={handleFormChange}
              isSubmitting={updateCompanyMutation.isPending}
              submitText="Save Changes"
              mode="edit"
            />
          </div>

          {/* Company Information Summary */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Current Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Company Name:</span>
                <span className="ml-2 font-medium">{company.company_name}</span>
              </div>
              <div>
                <span className="text-gray-600">NPWP:</span>
                <span className="ml-2 font-mono">{company.npwp}</span>
              </div>
              <div>
                <span className="text-gray-600">IDTKU:</span>
                <span className="ml-2 font-mono">{company.idtku}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  company.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {company.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="mt-3">
              <span className="text-gray-600">Address:</span>
              <p className="mt-1 text-sm">{company.address}</p>
            </div>
            
            {(company.contact_phone || company.contact_email) && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {company.contact_phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2">{company.contact_phone}</span>
                  </div>
                )}
                {company.contact_email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2">{company.contact_email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Editing Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• NPWP must be exactly 15 digits</li>
              <li>• IDTKU must be unique for each company</li>
              <li>• Address should be complete for invoice generation</li>
              <li>• Contact information is optional but recommended</li>
              <li>• Changes will affect all future invoices for this company</li>
            </ul>
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <details>
                <summary className="cursor-pointer font-medium text-gray-700">
                  Debug Information
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {JSON.stringify({
                    companyId: params.id,
                    hasUnsavedChanges,
                    isUpdating: updateCompanyMutation.isPending,
                    currentData: initialData
                  }, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </RoleGuard>
    </ProtectedRoute>
  )
}