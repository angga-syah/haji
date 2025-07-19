// src/app/(dashboard)/invoices/[id]/print/page.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoice } from '@/hooks/api/useInvoices'
import { usePrint } from '@/hooks/business/usePrint'
import { formatCurrency, formatDate } from '@/lib/utils'
import { numberToWords } from '@/lib/calculations/terbilang'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Printer, Download, ArrowLeft, Eye } from 'lucide-react'

interface InvoicePrintPageProps {
  params: { id: string }
}

export default function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  
  // API hooks
  const { data: invoiceData, isLoading, error } = useInvoice(params.id)
  const { printInvoice, generateAndDownloadPDF } = usePrint()

  const invoice = invoiceData?.invoice

  // Auto-focus on component mount for better print UX
  useEffect(() => {
    if (invoice && printRef.current) {
      printRef.current.focus()
    }
  }, [invoice])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'p':
            e.preventDefault()
            handlePrint()
            break
          case 's':
            e.preventDefault()
            handleDownloadPDF()
            break
        }
      }
      if (e.key === 'Escape') {
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (isLoading) return <LoadingSpinner />

  if (error || !invoice) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're trying to preview doesn't exist.</p>
          <Button onClick={() => router.push('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  const handlePrint = async () => {
    try {
      // For web browsers, use window.print()
      window.print()
      
      // Also track the print via our API
      await printInvoice(params.id, invoice.invoice_number)
    } catch (error) {
      console.error('Print failed:', error)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await generateAndDownloadPDF(params.id, `${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('PDF download failed:', error)
    }
  }

  const handleBack = () => {
    router.push(`/invoices/${params.id}`)
  }

  // Group lines by baris number
  const groupedLines = invoice.lines?.reduce((groups, line) => {
    const baris = line.baris.toString()
    if (!groups[baris]) groups[baris] = []
    groups[baris].push(line)
    return groups
  }, {} as Record<string, any[]>) || {}

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Print Controls - Hidden when printing */}
        <div className="bg-white border-b px-4 py-3 print:hidden">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/invoices/${params.id}`)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
              
              <Button
                onClick={handlePrint}
                size="sm"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print (Ctrl+P)
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="container mx-auto py-8 print:py-0">
          <div 
            ref={printRef}
            className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              padding: '20mm'
            }}
            tabIndex={-1}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-lg text-gray-700">Spirit of Services</p>
              <p className="text-sm text-gray-600">Professional TKA Services</p>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Invoice Details:</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Invoice No:</strong> {invoice.invoice_number}</div>
                  <div><strong>Date:</strong> {formatDate(invoice.invoice_date)}</div>
                  <div><strong>Place:</strong> Jakarta</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600">Page: 1 of 1</div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Bill To:</h3>
              <div className="text-sm">
                <div className="font-medium text-lg">{invoice.company_name}</div>
                <div className="text-gray-600">NPWP: {invoice.company_npwp}</div>
                <div className="text-gray-700 mt-2 whitespace-pre-line">{invoice.company_address}</div>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="mb-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">No</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Date</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Expatriate</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Description</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedLines).map(([barisNum, lines]) => (
                    lines.map((line, index) => (
                      <tr key={line.id}>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {index === 0 ? barisNum : ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <div className="font-medium">{line.tka_nama}</div>
                          <div className="text-gray-500 text-xs">({line.tka_passport})</div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <div className="font-medium">
                            {line.custom_job_name || line.job_name}
                          </div>
                          {line.custom_job_description && (
                            <div className="text-gray-600 text-xs mt-1">
                              {line.custom_job_description}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({invoice.vat_percentage}%):</span>
                    <span>{formatCurrency(invoice.vat_amount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terbilang */}
            <div className="mb-8">
              <div className="text-sm">
                <strong>Terbilang:</strong> {numberToWords(invoice.total_amount)} Rupiah
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {invoice.notes}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="grid grid-cols-2 gap-8 mt-12">
              {/* Bank Information */}
              {invoice.bank_name && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Details:</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Bank:</strong> {invoice.bank_name}</div>
                    <div><strong>Account:</strong> {invoice.bank_account_number}</div>
                    <div><strong>Name:</strong> {invoice.bank_account_name}</div>
                  </div>
                </div>
              )}

              {/* Signature */}
              <div className="text-right">
                <div className="mb-16">
                  <div className="text-sm mb-4">Authorized by:</div>
                  <div className="border-b border-gray-400 w-32 ml-auto mb-2"></div>
                  <div className="text-sm font-medium">Spirit of Services</div>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
              Thank you for your business!
            </div>
          </div>
        </div>

        {/* Print Instructions - Hidden when printing */}
        <div className="bg-blue-50 border-t px-4 py-3 print:hidden">
          <div className="container mx-auto text-center text-sm text-blue-800">
            <p className="mb-2">
              <strong>Print Instructions:</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs">
              <span>• Press Ctrl+P (Cmd+P on Mac) to print</span>
              <span>• Press Esc to go back</span>
              <span>• Press Ctrl+S to download PDF</span>
              <span>• Recommended: A4 paper, Portrait orientation</span>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}