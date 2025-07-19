// app/(dashboard)/invoices/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Form, FormItem, FormLabel, FormActions } from '@/components/ui/form'
import { PageTitle } from '@/components/common/PageTitle'
import { CompanySearch } from '@/components/search/CompanySearch'
import { TKASearch } from '@/components/search/TKASearch'
import { InvoiceTotals } from '@/components/invoice/InvoiceTotals'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import type { Company, TKAWorker, JobDescription, BankAccount } from '@/lib/types'

interface InvoiceLineItem {
  id: string
  tka_id: string
  tka_name: string
  job_description_id: string
  job_name: string
  custom_job_name: string
  custom_price: string
  quantity: number
  unit_price: number
  line_total: number
  baris: number
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const { hasPermission } = useAuthStore()
  const { showSuccessToast, showErrorToast } = useUIStore()
  const {
    currentInvoice,
    selectedCompany,
    lines,
    totals,
    isDirty,
    setCurrentInvoice,
    setSelectedCompany,
    addLine,
    updateLine,
    removeLine,
    recalculateTotals,
    reset,
    validateInvoice
  } = useInvoiceStore()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  
  // Form state
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  
  // Line item form state
  const [selectedTKA, setSelectedTKA] = useState<TKAWorker | null>(null)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [customJobName, setCustomJobName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [baris, setBaris] = useState(1)

  useEffect(() => {
    // Check permissions
    if (!hasPermission('invoices', 'create')) {
      router.push('/invoices')
      return
    }

    // Reset store on mount
    reset()
    
    // Load initial data
    loadInitialData()

    return () => {
      // Don't reset on unmount to preserve data during navigation
    }
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadJobDescriptions(selectedCompany.id)
    }
  }, [selectedCompany])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // Load invoice number and bank accounts in parallel
      const [numberRes, bankRes] = await Promise.all([
        fetch('/api/invoices/number'),
        fetch('/api/bank-accounts?active=true')
      ])

      if (numberRes.ok) {
        const numberData = await numberRes.json()
        setInvoiceNumber(numberData.invoice_number)
      }

      if (bankRes.ok) {
        const bankData = await bankRes.json()
        setBankAccounts(bankData.bank_accounts || [])
        
        // Set default bank account
        const defaultBank = bankData.bank_accounts?.find((bank: BankAccount) => bank.is_default)
        if (defaultBank) {
          setBankAccountId(defaultBank.id)
        }
      }

    } catch (error) {
      console.error('Error loading initial data:', error)
      showErrorToast('Error', 'Failed to load initial data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobDescriptions = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/jobs?active=true`)
      if (response.ok) {
        const data = await response.json()
        setJobDescriptions(data.job_descriptions || [])
      }
    } catch (error) {
      console.error('Error loading job descriptions:', error)
    }
  }

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    setJobDescriptions([])
    setSelectedJobId('')
  }

  const handleTKASelect = (tka: TKAWorker) => {
    setSelectedTKA(tka)
  }

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId)
    const job = jobDescriptions.find(j => j.id === jobId)
    if (job) {
      setCustomJobName('')
      setCustomPrice('')
    }
  }

  const addLineItem = () => {
    if (!selectedTKA || (!selectedJobId && !customJobName)) {
      showErrorToast('Error', 'Please select TKA worker and job description')
      return
    }

    const selectedJob = jobDescriptions.find(j => j.id === selectedJobId)
    const unitPrice = customPrice ? parseFloat(customPrice) : (selectedJob?.price || 0)
    
    if (quantity <= 0) {
      showErrorToast('Error', 'Quantity must be greater than 0')
      return
    }

    const lineItem = {
      tka_id: selectedTKA.id,
      job_description_id: selectedJobId || '',
      custom_job_name: customJobName || '',
      custom_price: customPrice ? parseFloat(customPrice) : undefined,
      quantity,
      baris
    }

    addLine(lineItem)

    // Reset line form
    setSelectedTKA(null)
    setSelectedJobId('')
    setCustomJobName('')
    setCustomPrice('')
    setQuantity(1)
    setBaris(baris + 1)

    showSuccessToast('Success', 'Line item added')
  }

  const removeLineItem = (index: number) => {
    removeLine(index)
    showSuccessToast('Success', 'Line item removed')
  }

  const saveDraft = async () => {
    const validation = validateInvoice()
    if (!validation.isValid) {
      showErrorToast('Validation Error', validation.errors.join(', '))
      return
    }

    setIsSaving(true)
    try {
      const invoiceData = {
        company_id: selectedCompany!.id,
        invoice_date: invoiceDate,
        notes,
        bank_account_id: bankAccountId || undefined,
        lines: lines.map(line => ({
          tka_id: line.tka_id,
          job_description_id: line.job_description_id,
          custom_job_name: line.custom_job_name || undefined,
          custom_price: line.custom_price || undefined,
          quantity: line.quantity,
          baris: line.baris
        }))
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save invoice')
      }

      const data = await response.json()
      showSuccessToast('Success', 'Invoice saved as draft')
      router.push(`/invoices/${data.invoice.id}`)

    } catch (error) {
      console.error('Error saving invoice:', error)
      showErrorToast(
        'Save Failed',
        error instanceof Error ? error.message : 'Failed to save invoice'
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle title="Create Invoice" description="Create a new invoice" />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const bankOptions = bankAccounts.map(bank => ({
    value: bank.id,
    label: `${bank.bank_name} - ${bank.account_number}`
  }))

  const jobOptions = jobDescriptions.map(job => ({
    value: job.id,
    label: `${job.job_name} - ${formatCurrency(job.price)}`
  }))

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Create Invoice" 
        description="Create a new invoice for services rendered"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem label="Invoice Number">
                    <Input
                      value={invoiceNumber}
                      disabled
                      placeholder="Auto-generated"
                    />
                  </FormItem>

                  <FormItem label="Invoice Date" required>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </FormItem>
                </div>

                <FormItem label="Company" required>
                  <CompanySearch
                    onSelect={handleCompanySelect}
                    selected={selectedCompany}
                    placeholder="Search and select company..."
                  />
                </FormItem>

                <FormItem label="Bank Account">
                  <Select
                    options={bankOptions}
                    value={bankAccountId}
                    onValueChange={setBankAccountId}
                    placeholder="Select bank account"
                  />
                </FormItem>

                <FormItem label="Notes">
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes (optional)"
                  />
                </FormItem>
              </Form>
            </CardContent>
          </Card>

          {/* Add Line Items */}
          {selectedCompany && (
            <Card>
              <CardHeader>
                <CardTitle>Add Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem label="TKA Worker" required>
                      <TKASearch
                        onSelect={handleTKASelect}
                        selected={selectedTKA}
                        placeholder="Search TKA worker..."
                        includeFamily={true}
                      />
                    </FormItem>

                    <FormItem label="Baris Number">
                      <Input
                        type="number"
                        min="1"
                        value={baris}
                        onChange={(e) => setBaris(parseInt(e.target.value) || 1)}
                      />
                    </FormItem>
                  </div>

                  <FormItem label="Job Description" required>
                    <Select
                      options={jobOptions}
                      value={selectedJobId}
                      onValueChange={handleJobSelect}
                      placeholder="Select job description..."
                      disabled={!selectedCompany}
                    />
                  </FormItem>

                  {!selectedJobId && (
                    <>
                      <FormItem label="Custom Job Name" required>
                        <Input
                          value={customJobName}
                          onChange={(e) => setCustomJobName(e.target.value)}
                          placeholder="Enter custom job name..."
                        />
                      </FormItem>

                      <FormItem label="Custom Price" required>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          placeholder="Enter custom price..."
                        />
                      </FormItem>
                    </>
                  )}

                  <FormItem label="Quantity" required>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </FormItem>

                  <Button 
                    type="button"
                    onClick={addLineItem}
                    className="w-full"
                  >
                    Add Line Item
                  </Button>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Line Items List */}
          {lines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Line Items ({lines.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Baris {line.baris}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">TKA:</span> {line.tka_name}
                          </div>
                          <div>
                            <span className="text-gray-600">Job:</span> {line.custom_job_name || line.job_name}
                          </div>
                          <div>
                            <span className="text-gray-600">Qty:</span> {line.quantity} × {formatCurrency(line.unit_price)}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="font-medium">Total: {formatCurrency(line.line_total)}</span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Totals and Actions */}
        <div className="space-y-6">
          <InvoiceTotals
            subtotal={totals.subtotal}
            vatAmount={totals.vat_amount}
            total={totals.total_amount}
            vatPercentage={totals.vat_percentage}
          />

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={saveDraft}
                  disabled={isSaving || lines.length === 0}
                  loading={isSaving}
                  className="w-full"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/invoices')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}