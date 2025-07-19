// src/app/(dashboard)/invoices/[id]/edit/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoice, useUpdateInvoice } from '@/hooks/api/useInvoices'
import { useInvoiceWorkflow } from '@/hooks/business/useInvoiceWorkflow'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ArrowLeft, Save, Eye } from 'lucide-react'

interface InvoiceEditPageProps {
  params: { id: string }
}

export default function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const router = useRouter()
  const { canCreateInvoices } = useAuth()
  
  // API hooks
  const { data: invoiceData, isLoading, error } = useInvoice(params.id)
  const updateInvoiceMutation = useUpdateInvoice()
  
  // Workflow hook
  const workflow = useInvoiceWorkflow()

  const invoice = invoiceData?.invoice

  // Check if user can edit this invoice
  const canEdit = canCreateInvoices && invoice?.status === 'draft'

  // Load existing invoice data into workflow
  useEffect(() => {
    if (invoice && !workflow.formData.company_id) {
      // Set company
      workflow.updateCompany(invoice.company_id)
      
      // Set invoice details
      workflow.updateField('invoice_date', invoice.invoice_date)
      workflow.updateField('notes', invoice.notes || '')
      workflow.updateField('bank_account_id', invoice.bank_account_id || '')
      
      // Convert invoice lines to workflow format
      if (invoice.lines && invoice.lines.length > 0) {
        // Clear existing lines first
        workflow.clearLines()
        
        // Add each line
        invoice.lines.forEach((line) => {
          workflow.addLine({
            baris: line.baris,
            tka_id: line.tka_id,
            job_description_id: line.job_description_id,
            custom_job_name: line.custom_job_name || '',
            custom_job_description: line.custom_job_description || '',
            custom_price: line.custom_price,
            quantity: line.quantity
          })
        })
      }
    }
  }, [invoice, workflow])

  if (isLoading) return <LoadingSpinner />

  if (error || !invoice) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're trying to edit doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cannot Edit Invoice</h2>
          <p className="text-gray-600 mb-4">
            This invoice cannot be edited because it has been finalized or you don't have permission.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push(`/invoices/${params.id}`)}>
              View Invoice
            </Button>
            <Button variant="outline" onClick={() => router.push('/invoices')}>
              Back to List
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    const validation = workflow.validateStep(workflow.currentStep)
    if (!validation.isValid) {
      // Show validation errors
      return
    }

    try {
      workflow.setIsSubmitting(true)
      
      const submissionData = workflow.prepareSubmissionData()
      
      await updateInvoiceMutation.mutateAsync({
        id: params.id,
        data: submissionData
      })

      // Clear workflow data
      workflow.resetWorkflow()
      
      // Navigate back to invoice detail
      router.push(`/invoices/${params.id}`)
      
    } catch (error) {
      console.error('Failed to update invoice:', error)
    } finally {
      workflow.setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (workflow.hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }
    
    workflow.resetWorkflow()
    router.push(`/invoices/${params.id}`)
  }

  const isFormValid = workflow.validateStep(2).isValid // Check if lines step is valid
  const hasUnsavedChanges = workflow.hasUnsavedChanges

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['admin', 'finance_staff']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <PageTitle 
                title={`Edit Invoice ${invoice.invoice_number}`}
                subtitle={invoice.company_name}
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
                onClick={() => router.push(`/invoices/${params.id}`)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!isFormValid || workflow.isSubmitting || updateInvoiceMutation.isPending}
                size="sm"
              >
                <Save className="w-4 h-4 mr-1" />
                {workflow.isSubmitting || updateInvoiceMutation.isPending ? 'Saving...' : 'Save Changes'}
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
            <InvoiceForm 
              workflow={workflow}
              mode="edit"
              invoiceId={params.id}
              onSave={handleSave}
              onCancel={handleCancel}
              isSubmitting={workflow.isSubmitting || updateInvoiceMutation.isPending}
            />
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border rounded-lg p-4 mt-6">
              <details>
                <summary className="cursor-pointer font-medium text-gray-700">
                  Debug Information
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {JSON.stringify({
                    invoiceId: params.id,
                    currentStep: workflow.currentStep,
                    isValid: isFormValid,
                    hasChanges: hasUnsavedChanges,
                    company: workflow.selectedCompany?.company_name,
                    linesCount: workflow.formData.lines.length,
                    totals: workflow.calculations
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