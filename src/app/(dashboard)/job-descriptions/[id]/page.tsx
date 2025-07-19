// src/app/(dashboard)/job-descriptions/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJobDescription, useDeleteJobDescription } from '@/hooks/api/useJobDescriptions'
import { useAuth } from '@/hooks/ui/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building, 
  DollarSign, 
  FileText, 
  Calendar,
  Hash,
  BarChart3
} from 'lucide-react'

interface JobDescriptionDetailPageProps {
  params: { id: string }
}

export default function JobDescriptionDetailPage({ params }: JobDescriptionDetailPageProps) {
  const router = useRouter()
  const { canManageCompanies } = useAuth()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // API hooks
  const { data: jobData, isLoading, error } = useJobDescription(params.id)
  const deleteJobMutation = useDeleteJobDescription()

  const job = jobData?.job_description

  if (isLoading) return <LoadingSpinner />
  
  if (error || !job) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description Not Found</h2>
          <p className="text-gray-600 mb-4">The job description you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/job-descriptions')}>
            Back to Job Descriptions
          </Button>
        </div>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteJobMutation.mutateAsync(params.id)
      router.push('/job-descriptions')
    } catch (error) {
      console.error('Failed to delete job description:', error)
    }
  }

  const canEdit = canManageCompanies
  const canDelete = canManageCompanies && job.is_active

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <PageTitle 
              title={job.job_name}
              subtitle={`Job Description • ${formatCurrency(job.price)}`}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/job-descriptions')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to List
            </Button>
            
            <RoleGuard allowedRoles={['admin', 'finance_staff']}>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/job-descriptions/${params.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </RoleGuard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Job Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-500">Job Name</label>
                    <p className="text-gray-900 text-lg font-medium">{job.job_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-500">Price</label>
                    <p className="text-gray-900 text-xl font-semibold">{formatCurrency(job.price)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-500">Company</label>
                    <p className="text-gray-900">{job.company?.company_name || 'Company information not available'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Job Description */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {job.job_description}
                </p>
              </div>
            </Card>

            {/* Usage Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Usage Statistics</h3>
              
              {/* This would be populated with actual usage data */}
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Usage statistics will be available soon</p>
                <p className="text-sm">Track how often this job description is used in invoices</p>
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
                    <Badge variant={job.is_active ? 'default' : 'secondary'}>
                      {job.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <RoleGuard allowedRoles={['admin', 'finance_staff']}>
                  <div className="space-y-2">
                    {canEdit && (
                      <Button
                        onClick={() => router.push(`/job-descriptions/${params.id}/edit`)}
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Job Description
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        onClick={() => setShowDeleteDialog(true)}
                        variant="destructive"
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Job Description
                      </Button>
                    )}
                  </div>
                </RoleGuard>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">{formatCurrency(job.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sort Order:</span>
                  <span className="font-medium">{job.sort_order}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Times Used:</span>
                  <span className="font-medium">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-medium">-</span>
                </div>
              </div>
            </Card>

            {/* Company Information */}
            {job.company && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Name</label>
                    <p className="text-gray-900">{job.company.company_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">NPWP</label>
                    <p className="text-gray-900 font-mono text-sm">{job.company.npwp}</p>
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/companies/${job.company_id}`)}
                      className="w-full"
                    >
                      <Building className="w-4 h-4 mr-2" />
                      View Company
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Metadata */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <div className="font-medium">{formatDate(job.created_at)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Last Updated:</span>
                    <div className="font-medium">{formatDate(job.updated_at)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Job ID:</span>
                    <div className="font-mono text-xs">{job.id}</div>
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
          title="Delete Job Description"
          description={`Are you sure you want to delete "${job.job_name}"? This action cannot be undone and may affect existing invoices.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  )
}