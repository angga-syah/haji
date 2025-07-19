// components/forms/InvoiceForm.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormMessage, FormSection } from '@/components/ui/form'
import { CompanySearch } from '@/components/search/CompanySearch'
import { InvoiceLinesList } from '@/components/invoice/InvoiceLinesList'
import { InvoiceTotals } from '@/components/invoice/InvoiceTotals'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { useCreateInvoice, useUpdateInvoice } from '@/hooks/api/useInvoices'
import { useBankAccounts } from '@/hooks/api/useBankAccounts'
import { useInvoiceWorkflow } from '@/hooks/business/useInvoiceWorkflow'
import { uiUtils } from '@/stores/uiStore'
import { invoiceSchema } from '@/lib/validation'
import { formatDate } from '@/lib/utils'
import type { CreateInvoiceData, Invoice, Company } from '@/lib/types'

interface InvoiceFormProps {
  invoice?: Invoice
  onSuccess?: (invoice: Invoice) => void
  onCancel?: () => void
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  
  const {
    currentInvoice,
    lines,
    totals,
    isDirty,
    setCurrentInvoice,
    setSelectedCompany: setStoreCompany,
    validateInvoice,
    reset
  } = useInvoiceStore()

  const { data: bankAccounts } = useBankAccounts()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const { generateInvoiceNumber, autoSave } = useInvoiceWorkflow()

  const isEditing = !!invoice

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset: resetForm
  } = useForm<CreateInvoiceData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      company_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      notes: '',
      bank_account_id: '',
      lines: []
    }
  })

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && selectedCompany) {
      const timer = setTimeout(() => {
        autoSave({
          company_id: selectedCompany.id,
          invoice_date: watch('invoice_date'),
          notes: watch('notes'),
          lines: lines.map(line => ({
            tka_id: line.tka_id,
            job_description_id: line.job_description_id,
            quantity: line.quantity,
            custom_job_name: line.custom_job_name,
            custom_price: line.custom_price,
            baris: line.baris
          }))
        })
      }, 30000) // Auto-save every 30 seconds

      return () => clearTimeout(timer)
    }
  }, [isDirty, selectedCompany, lines, watch, autoSave])

  // Load existing invoice data
  useEffect(() => {
    if (invoice) {
      setCurrentInvoice(invoice)
      resetForm({
        company_id: invoice.company_id,
        invoice_date: invoice.invoice_date,
        notes: invoice.notes || '',
        bank_account_id: invoice.bank_account_id || ''
      })
    }
  }, [invoice, setCurrentInvoice, resetForm])

  // Generate invoice number for new invoices
  useEffect(() => {
    if (!isEditing && selectedCompany) {
      generateInvoiceNumber().then(number => {
        setCurrentInvoice({ 
          ...currentInvoice,
          invoice_number: number,
          company_id: selectedCompany.id
        })
      })
    }
  }, [selectedCompany, isEditing, generateInvoiceNumber, setCurrentInvoice, currentInvoice])

  const onSubmit = async (data: CreateInvoiceData) => {
    // Validate invoice
    const validation = validateInvoice()
    if (!validation.isValid) {
      uiUtils.toast.error('Validation Error', validation.errors.join(', '))
      return
    }

    if (lines.length === 0) {
      uiUtils.toast.error('Error', 'Please add at least one line item')
      return
    }

    try {
      const invoiceData: CreateInvoiceData = {
        ...data,
        company_id: selectedCompany!.id,
        lines: lines.map(line => ({
          tka_id: line.tka_id,
          job_description_id: line.job_description_id,
          quantity: line.quantity,
          custom_job_name: line.custom_job_name,
          custom_price: line.custom_price,
          baris: line.baris
        }))
      }

      let result: Invoice
      if (isEditing) {
        result = await updateInvoice.mutateAsync({
          id: invoice!.id,
          data: invoiceData
        })
        uiUtils.toast.success('Success', 'Invoice updated successfully')
      } else {
        result = await createInvoice.mutateAsync(invoiceData)
        uiUtils.toast.success('Success', 'Invoice created successfully')
        reset() // Clear form after successful creation
      }

      onSuccess?.(result)
    } catch (error) {
      console.error('Error saving invoice:', error)
      uiUtils.toast.error('Error', 'Failed to save invoice')
    }
  }

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    setStoreCompany(company)
    setValue('company_id', company.id)
  }

  const handleCancel = () => {
    if (isDirty) {
      uiUtils.confirm(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        () => {
          reset()
          onCancel?.()
        }
      )
    } else {
      onCancel?.()
    }
  }

  const bankAccountOptions = bankAccounts?.bank_accounts?.map(bank => ({
    value: bank.id,
    label: `${bank.bank_name} - ${bank.account_number}`
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          {currentInvoice?.invoice_number && (
            <p className="text-gray-600">
              Invoice Number: {currentInvoice.invoice_number}
            </p>
          )}
        </div>
        
        {isDirty && (
          <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded">
            Unsaved changes
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField>
              <FormLabel>Select Company *</FormLabel>
              <CompanySearch
                onSelect={handleCompanySelect}
                selected={selectedCompany}
                placeholder="Search and select company..."
              />
              {errors.company_id && (
                <FormMessage>{errors.company_id.message}</FormMessage>
              )}
            </FormField>

            {selectedCompany && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{selectedCompany.company_name}</h4>
                <p className="text-sm text-gray-600">NPWP: {selectedCompany.npwp}</p>
                <p className="text-sm text-gray-600">IDTKU: {selectedCompany.idtku}</p>
                <p className="text-sm text-gray-600">{selectedCompany.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField>
                <FormLabel>Invoice Date *</FormLabel>
                <Input
                  {...register('invoice_date')}
                  type="date"
                  error={errors.invoice_date?.message}
                />
              </FormField>

              <FormField>
                <FormLabel>Bank Account</FormLabel>
                <Select
                  {...register('bank_account_id')}
                  options={bankAccountOptions}
                  placeholder="Select bank account (optional)"
                  error={errors.bank_account_id?.message}
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField>
                  <FormLabel>Notes</FormLabel>
                  <textarea
                    {...register('notes')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes (optional)"
                  />
                  {errors.notes && (
                    <FormMessage>{errors.notes.message}</FormMessage>
                  )}
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        {selectedCompany && (
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceLinesList 
                companyId={selectedCompany.id}
                editable={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        {lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTotals 
                totals={totals}
                showTerbilang={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createInvoice.isPending || updateInvoice.isPending}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            loading={createInvoice.isPending || updateInvoice.isPending}
            disabled={!selectedCompany || lines.length === 0}
          >
            {isEditing ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}