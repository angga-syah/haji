// src/app/(dashboard)/tka-workers/[id]/edit/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTKAWorker, useUpdateTKAWorker } from '@/hooks/api/useTKAWorkers'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { TKAWorkerForm } from '@/components/forms/TKAWorkerForm'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ArrowLeft, Save, Eye } from 'lucide-react'

interface TKAWorkerEditPageProps {
  params: { id: string }
}

export default function TKAWorkerEditPage({ params }: TKAWorkerEditPageProps) {
  const router = useRouter()
  const { canManageTKAWorkers } = useAuth()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // API hooks
  const { data: workerData, isLoading, error } = useTKAWorker(params.id)
  const updateWorkerMutation = useUpdateTKAWorker()

  const worker = workerData?.tka_worker

  // Check if user can edit
  const canEdit = canManageTKAWorkers

  if (isLoading) return <LoadingSpinner />

  if (error || !worker) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">TKA Worker Not Found</h2>
          <p className="text-gray-600 mb-4">The TKA worker you're trying to edit doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/tka-workers')}>
            Back to TKA Workers
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
            You don't have permission to edit TKA workers.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push(`/tka-workers/${params.id}`)}>
              View Worker
            </Button>
            <Button variant="outline" onClick={() => router.push('/tka-workers')}>
              Back to List
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (formData: any) => {
    try {
      await updateWorkerMutation.mutateAsync({
        id: params.id,
        data: formData
      })

      setHasUnsavedChanges(false)
      
      // Navigate back to worker detail
      router.push(`/tka-workers/${params.id}`)
      
    } catch (error) {
      console.error('Failed to update TKA worker:', error)
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
    
    router.push(`/tka-workers/${params.id}`)
  }

  const handleFormChange = () => {
    setHasUnsavedChanges(true)
  }

  // Initial form data from worker
  const initialData = {
    nama: worker.nama,
    passport: worker.passport,
    divisi: worker.divisi || '',
    jenis_kelamin: worker.jenis_kelamin
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['admin', 'finance_staff']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <PageTitle 
                title={`Edit ${worker.nama}`}
                subtitle="Update TKA worker information"
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
                onClick={() => router.push(`/tka-workers/${params.id}`)}
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
            <TKAWorkerForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onChange={handleFormChange}
              isSubmitting={updateWorkerMutation.isPending}
              submitText="Save Changes"
              mode="edit"
            />
          </div>

          {/* Worker Information Summary */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Current Worker Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{worker.nama}</span>
              </div>
              <div>
                <span className="text-gray-600">Passport:</span>
                <span className="ml-2 font-mono">{worker.passport}</span>
              </div>
              <div>
                <span className="text-gray-600">Division:</span>
                <span className="ml-2">{worker.divisi || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-gray-600">Gender:</span>
                <span className="ml-2">{worker.jenis_kelamin}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  worker.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {worker.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Family Members:</span>
                <span className="ml-2 font-medium">{worker.family_members?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Editing Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Passport number must be unique across all workers</li>
              <li>• Name should match the passport exactly</li>
              <li>• Division is optional but helpful for organization</li>
              <li>• Changes will affect all future invoices for this worker</li>
              <li>• Family members can be managed separately</li>
            </ul>
          </div>

          {/* Family Members Link */}
          {worker.family_members && worker.family_members.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-900 mb-1">Family Members</h4>
                  <p className="text-sm text-green-800">
                    This worker has {worker.family_members.length} family member(s) registered.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/tka-workers/${params.id}/family`)}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Manage Family
                </Button>
              </div>
            </div>
          )}

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <details>
                <summary className="cursor-pointer font-medium text-gray-700">
                  Debug Information
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {JSON.stringify({
                    workerId: params.id,
                    hasUnsavedChanges,
                    isUpdating: updateWorkerMutation.isPending,
                    currentData: initialData,
                    familyCount: worker.family_members?.length || 0
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