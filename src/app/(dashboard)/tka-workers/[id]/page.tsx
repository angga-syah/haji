// src/app/(dashboard)/tka-workers/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTKAWorker, useDeleteTKAWorker } from '@/hooks/api/useTKAWorkers'
import { useAuth } from '@/hooks/ui/useAuth'
import { formatDate } from '@/lib/utils'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  User, 
  CreditCard, 
  Building2, 
  Users, 
  Calendar, 
  Edit, 
  Trash2, 
  UserPlus,
  FileText,
  ArrowLeft
} from 'lucide-react'

interface TKAWorkerDetailPageProps {
  params: { id: string }
}

export default function TKAWorkerDetailPage({ params }: TKAWorkerDetailPageProps) {
  const router = useRouter()
  const { canManageTKAWorkers } = useAuth()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // API hooks
  const { data: workerData, isLoading, error } = useTKAWorker(params.id)
  const deleteWorkerMutation = useDeleteTKAWorker()

  const worker = workerData?.tka_worker

  if (isLoading) return <LoadingSpinner />
  
  if (error || !worker) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">TKA Worker Not Found</h2>
          <p className="text-gray-600 mb-4">The TKA worker you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/tka-workers')}>
            Back to TKA Workers
          </Button>
        </div>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteWorkerMutation.mutateAsync(params.id)
      router.push('/tka-workers')
    } catch (error) {
      console.error('Failed to delete TKA worker:', error)
    }
  }

  const canEdit = canManageTKAWorkers
  const canDelete = canManageTKAWorkers && worker.is_active

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <PageTitle 
              title={worker.nama}
              subtitle={`TKA Worker • ${worker.passport}`}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/tka-workers')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to List
            </Button>
            
            <RoleGuard allowedRoles={['admin', 'finance_staff']}>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/tka-workers/${params.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/tka-workers/${params.id}/family`)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Manage Family
              </Button>
            </RoleGuard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Worker Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-gray-900">{worker.nama}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Passport Number</label>
                      <p className="text-gray-900 font-mono">{worker.passport}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Division</label>
                      <p className="text-gray-900">{worker.divisi || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p className="text-gray-900">{worker.jenis_kelamin}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Family Members */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Family Members</h3>
                <RoleGuard allowedRoles={['admin', 'finance_staff']}>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/tka-workers/${params.id}/family`)}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Family Member
                  </Button>
                </RoleGuard>
              </div>
              
              {worker.family_members && worker.family_members.length > 0 ? (
                <div className="space-y-3">
                  {worker.family_members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">{member.nama}</div>
                          <div className="text-sm text-gray-500">
                            {member.passport} • {member.relationship} • {member.jenis_kelamin}
                          </div>
                        </div>
                      </div>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No family members registered</p>
                  <RoleGuard allowedRoles={['admin', 'finance_staff']}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/tka-workers/${params.id}/family`)}
                      className="mt-2"
                    >
                      Add Family Member
                    </Button>
                  </RoleGuard>
                </div>
              )}
            </Card>

            {/* Recent Invoices */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Invoices</h3>
              
              {/* This would be populated with actual invoice data */}
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent invoices found</p>
                <p className="text-sm">Invoices will appear here when this worker is assigned to jobs</p>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Status & Actions</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={worker.is_active ? 'default' : 'secondary'}>
                      {worker.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <RoleGuard allowedRoles={['admin', 'finance_staff']}>
                  <div className="space-y-2">
                    {canEdit && (
                      <Button
                        onClick={() => router.push(`/tka-workers/${params.id}/edit`)}
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Worker
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => router.push(`/tka-workers/${params.id}/family`)}
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Family
                    </Button>

                    {canDelete && (
                      <Button
                        onClick={() => setShowDeleteDialog(true)}
                        variant="destructive"
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Worker
                      </Button>
                    )}
                  </div>
                </RoleGuard>
              </div>
            </Card>

            {/* Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Family Members:</span>
                  <span className="font-medium">{worker.family_members?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Invoices:</span>
                  <span className="font-medium">{worker.total_invoices || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Family:</span>
                  <span className="font-medium">
                    {worker.family_members?.filter(m => m.is_active).length || 0}
                  </span>
                </div>
              </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Registered:</span>
                    <div className="font-medium">{formatDate(worker.created_at)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Last Updated:</span>
                    <div className="font-medium">{formatDate(worker.updated_at)}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete TKA Worker"
          description={`Are you sure you want to delete ${worker.nama}? This will also delete all family members and cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  )
}