// src/app/(dashboard)/job-descriptions/create/page.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCreateJobDescription } from '@/hooks/api/useJobDescriptions'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { JobDescriptionForm } from '@/components/forms/JobDescriptionForm'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ArrowLeft } from 'lucide-react'

export default function JobDescriptionCreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canManageCompanies } = useAuth()
  
  // Get company_id from query params if provided
  const preselectedCompanyId = searchParams.get('company_id')
  
  // API hooks
  const createJobMutation = useCreateJobDescription()

  if (!canManageCompanies) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to create job descriptions.
          </p>
          <Button onClick={() => router.push('/job-descriptions')}>
            Back to Job Descriptions
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (formData: any) => {
    try {
      const result = await createJobMutation.mutateAsync(formData)
      
      // Navigate to the created job description
      router.push(`/job-descriptions/${result.job_description.id}`)
      
    } catch (error) {
      console.error('Failed to create job description:', error)
      throw error // Let the form handle the error
    }
  }

  const handleCancel = () => {
    router.push('/job-descriptions')
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['admin', 'finance_staff']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <PageTitle 
                title="Create Job Description"
                subtitle="Add a new job description with pricing"
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
            </div>
          </div>

          {/* Create Form */}
          <div className="bg-white rounded-lg shadow">
            <JobDescriptionForm
              initialData={preselectedCompanyId ? { company_id: preselectedCompanyId } : undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={createJobMutation.isPending}
              submitText="Create Job Description"
              mode="create"
            />
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-3">Job Description Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Job name should be descriptive and professional</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Description should include key responsibilities and requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Price should reflect the value and complexity of the work</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Each company can have different prices for the same type of job</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Sort order determines display sequence in invoice forms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Job descriptions can be reused across multiple invoices</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Examples */}
          <div className="bg-gray-50 border rounded-lg p-6">
            <h3 className="font-medium text-gray-900 mb-3">Example Job Descriptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2">Technical Support Specialist</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Provide technical support for IT systems, troubleshoot hardware and software issues, 
                  maintain network infrastructure, and assist with system upgrades.
                </p>
                <p className="text-sm font-medium text-blue-600">Price: Rp 2,500,000</p>
              </div>
              
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2">Administrative Assistant</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Handle administrative tasks, manage documentation, coordinate meetings, 
                  assist with correspondence, and maintain office organization.
                </p>
                <p className="text-sm font-medium text-blue-600">Price: Rp 1,800,000</p>
              </div>
              
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2">Project Manager</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Lead project planning and execution, coordinate team activities, 
                  manage timelines and budgets, ensure deliverable quality.
                </p>
                <p className="text-sm font-medium text-blue-600">Price: Rp 4,500,000</p>
              </div>
              
              <div className="bg-white p-4 rounded border">
                <h4 className="font-medium mb-2">Quality Assurance Specialist</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Develop and implement quality control procedures, conduct testing, 
                  document processes, and ensure compliance with standards.
                </p>
                <p className="text-sm font-medium text-blue-600">Price: Rp 3,200,000</p>
              </div>
            </div>
          </div>

          {/* Pricing Guidelines */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-medium text-green-900 mb-3">Pricing Guidelines</h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>
                <strong>Entry Level (Rp 1,500,000 - Rp 2,500,000):</strong> Basic administrative tasks, 
                data entry, simple customer service roles.
              </p>
              <p>
                <strong>Mid Level (Rp 2,500,000 - Rp 4,000,000):</strong> Technical support, 
                specialized administrative roles, junior management positions.
              </p>
              <p>
                <strong>Senior Level (Rp 4,000,000 - Rp 6,000,000):</strong> Project management, 
                senior technical roles, department supervision.
              </p>
              <p>
                <strong>Executive Level (Rp 6,000,000+):</strong> Strategic leadership, 
                specialized expertise, high-level management roles.
              </p>
            </div>
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
                    preselectedCompanyId,
                    isCreating: createJobMutation.isPending,
                    userRole: 'debug-role',
                    canManageCompanies
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