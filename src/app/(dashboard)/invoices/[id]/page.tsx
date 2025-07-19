// src/app/(dashboard)/invoices/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoice, useUpdateInvoiceStatus, useDeleteInvoice, useInvoicePDF } from '@/hooks/api/useInvoices'
import { usePrint } from '@/hooks/business/usePrint'
import { useAuth } from '@/hooks/ui/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  FileText, 
  Printer, 
  Edit, 
  Trash2, 
  Download, 
  Copy,
  CheckCircle,
  Building,
  User,
  Calendar,
  DollarSign
} from 'lucide-react'

interface InvoiceDetailPageProps {
  params: { id: string }
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const router = useRouter()
  const { user, canMarkAsPaid, canCreateInvoices } = useAuth()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // API hooks
  const { data: invoiceData, isLoading, error } = useInvoice(params.id)
  const updateStatusMutation = useUpdateInvoiceStatus()
  const deleteInvoiceMutation = useDeleteInvoice()
  const generatePDFMutation = useInvoicePDF()
  
  // Print hook
  const { printInvoice, generateAndDownloadPDF, openPrintPreview } = usePrint()

  const invoice = invoiceData?.invoice

  if (isLoading) return <LoadingSpinner />
  
  if (error || !invoice) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  const handleStatusUpdate = async (status: 'finalized' | 'paid' | 'cancelled') => {
    try {
      await updateStatusMutation.mutateAsync({ id: params.id, status })
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteInvoiceMutation.mutateAsync(params.id)
      router.push('/invoices')
    } catch (error) {
      console.error('Failed to delete invoice:', error)
    }
  }

  const handlePrint = async () => {
    try {
      await printInvoice(params.id, invoice.invoice_number)
    } catch (error) {
      console.error('Failed to print invoice:', error)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await generateAndDownloadPDF(params.id, `${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    }
  }

  const handlePrintPreview = () => {
    openPrintPreview(params.id)
  }

  const handleDuplicate = () => {
    // Navigate to create page with pre-filled data
    router.push(`/invoices/create?duplicate=${params.id}`)
  }

  const canEdit = canCreateInvoices && invoice.status === 'draft'
  const canDelete = canCreateInvoices && ['draft', 'cancelled'].includes(invoice.status)
  const canFinalize = canCreateInvoices && invoice.status === 'draft'
  const canMarkPaid = canMarkAsPaid && invoice.status === 'finalized'

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <PageTitle 
              title={`Invoice ${invoice.invoice_number}`} 
              subtitle={`${invoice.company_name} • ${formatDate(invoice.invoice_date)}`}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/invoices')}
            >
              Back to List
            </Button>
            
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/invoices/${params.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
            >
              <Copy className="w-4 h-4 mr-1" />
              Duplicate
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPreview}
            >
              <FileText className="w-4 h-4 mr-1" />
              Preview
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={generatePDFMutation.isPending}
            >
              <Download className="w-4 h-4 mr-1" />
              {generatePDFMutation.isPending ? 'Generating...' : 'PDF'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header Info */}
            <Card className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Invoice Details</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date: {formatDate(invoice.invoice_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Number: {invoice.invoice_number}
                    </div>
                  </div>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
              </div>

              {/* Company Info */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4" />
                  <span className="font-medium">Bill To:</span>
                </div>
                <div className="text-sm text-gray-900">
                  <div className="font-medium">{invoice.company_name}</div>
                  <div className="text-gray-600">NPWP: {invoice.company_npwp}</div>
                  <div className="text-gray-600 mt-1">{invoice.company_address}</div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="border-t pt-4 mt-4">
                  <div className="font-medium mb-2">Notes:</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">
                    {invoice.notes}
                  </div>
                </div>
              )}
            </Card>

            {/* Invoice Lines */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 text-sm font-medium text-gray-600">No</th>
                      <th className="pb-2 text-sm font-medium text-gray-600">Worker</th>
                      <th className="pb-2 text-sm font-medium text-gray-600">Job Description</th>
                      <th className="pb-2 text-sm font-medium text-gray-600 text-center">Qty</th>
                      <th className="pb-2 text-sm font-medium text-gray-600 text-right">Unit Price</th>
                      <th className="pb-2 text-sm font-medium text-gray-600 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines?.map((line, index) => (
                      <tr key={line.id} className="border-b">
                        <td className="py-3 text-sm">{line.baris}</td>
                        <td className="py-3 text-sm">
                          <div className="font-medium">{line.tka_nama}</div>
                          <div className="text-gray-500 text-xs">{line.tka_passport}</div>
                        </td>
                        <td className="py-3 text-sm">
                          <div className="font-medium">
                            {line.custom_job_name || line.job_name}
                          </div>
                          {line.custom_job_description && (
                            <div className="text-gray-500 text-xs mt-1">
                              {line.custom_job_description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-sm text-center">{line.quantity}</td>
                        <td className="py-3 text-sm text-right">
                          {formatCurrency(line.custom_price || line.unit_price)}
                        </td>
                        <td className="py-3 text-sm text-right font-medium">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                {canFinalize && (
                  <Button
                    onClick={() => handleStatusUpdate('finalized')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalize Invoice
                  </Button>
                )}

                <RoleGuard allowedRoles={['admin', 'finance_supervisor']}>
                  {canMarkPaid && (
                    <Button
                      onClick={() => handleStatusUpdate('paid')}
                      disabled={updateStatusMutation.isPending}
                      variant="default"
                      className="w-full"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </RoleGuard>

                {invoice.status === 'draft' && (
                  <Button
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={updateStatusMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel Invoice
                  </Button>
                )}

                {canDelete && (
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteInvoiceMutation.isPending}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Invoice
                  </Button>
                )}
              </div>
            </Card>

            {/* Totals */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT ({invoice.vat_percentage}%):</span>
                  <span>{formatCurrency(invoice.vat_amount)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Info */}
              {invoice.bank_name && (
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Payment Details:</div>
                    <div className="text-gray-600">
                      <div>{invoice.bank_name}</div>
                      <div>Acc: {invoice.bank_account_number}</div>
                      <div>{invoice.bank_account_name}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Metadata */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDate(invoice.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span>{formatDate(invoice.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lines:</span>
                  <span>{invoice.line_count || invoice.lines?.length || 0}</span>
                </div>
                {invoice.printed_count > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Printed:</span>
                    <span>{invoice.printed_count} times</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Invoice"
          description={`Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  )
}