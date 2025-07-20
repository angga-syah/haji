// src/components/invoice/InvoicePrintPreview.tsx
'use client'

import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { amountToWords } from '@/lib/calculations/terbilang'
import { generateInvoicePDF } from '@/lib/pdf/generator'
import type { InvoiceWithDetails } from '@/lib/types'

interface InvoicePrintPreviewProps {
  invoice: InvoiceWithDetails
  onPrint?: () => void
  onDownloadPDF?: () => void
  showActions?: boolean
}

export function InvoicePrintPreview({
  invoice,
  onPrint,
  onDownloadPDF,
  showActions = true
}: InvoicePrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  // Group lines by baris number
  const groupedLines = React.useMemo(() => {
    if (!invoice.lines) return {}
    
    return invoice.lines.reduce((groups, line) => {
      const baris = line.baris.toString()
      if (!groups[baris]) {
        groups[baris] = []
      }
      groups[baris].push(line)
      return groups
    }, {} as Record<string, typeof invoice.lines>)
  }, [invoice.lines])

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const originalContent = document.body.innerHTML
      
      document.body.innerHTML = `
        <html>
          <head>
            <title>Invoice ${invoice.invoice_number}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .no-print { display: none !important; }
                .print-page { page-break-after: always; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .text-lg { font-size: 1.125rem; }
                .text-xl { font-size: 1.25rem; }
                .text-2xl { font-size: 1.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mt-4 { margin-top: 1rem; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gap-4 { gap: 1rem; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `
      
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload() // Reload to restore React app
    }
    
    onPrint?.()
  }

  const handleDownloadPDF = async () => {
    try {
      const pdfBuffer = await generateInvoicePDF(invoice)
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      onDownloadPDF?.()
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      {showActions && (
        <div className="flex justify-between items-center no-print">
          <h2 className="text-xl font-semibold">Print Preview</h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
            >
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              Print Invoice
            </Button>
          </div>
        </div>
      )}

      {/* Print Content */}
      <Card>
        <CardContent className="p-8">
          <div ref={printRef} className="print-content">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-2">INVOICE</h1>
              <p className="text-lg">Spirit of Services</p>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p><strong>Invoice No:</strong> {invoice.invoice_number}</p>
                <p><strong>Date:</strong> {formatDate(invoice.invoice_date)}</p>
                <p><strong>Place:</strong> Jakarta</p>
              </div>
              <div className="text-right">
                <p>Page: 1 of 1</p>
              </div>
            </div>

            {/* Recipient Information */}
            <div className="mb-4">
              <p className="font-bold">To:</p>
              <p className="font-bold">{invoice.company_name}</p>
              <p>{invoice.company_address}</p>
            </div>

            {/* Invoice Table */}
            <table className="w-full mb-4">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '10%' }}>No</th>
                  <th className="text-center" style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '25%' }}>Expatriate</th>
                  <th style={{ width: '35%' }}>Description</th>
                  <th className="text-right" style={{ width: '15%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedLines).map(([barisNum, lines]) =>
                  lines.map((line, index) => (
                    <tr key={`${barisNum}-${index}`}>
                      <td className="text-center">
                        {index === 0 ? barisNum : ''}
                      </td>
                      <td className="text-center">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td>{line.tka_nama}</td>
                      <td>
                        <div>
                          <div className="font-bold">
                            {line.custom_job_name || line.job_name}
                          </div>
                          {line.custom_job_description && (
                            <div className="text-sm text-gray-600 mt-1">
                              {line.custom_job_description}
                            </div>
                          )}
                          {line.quantity > 1 && (
                            <div className="text-sm text-gray-600 mt-1">
                              Qty: {line.quantity} × {formatCurrency(line.unit_price)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        {formatCurrency(line.line_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div></div>
              <div>
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>VAT ({invoice.vat_percentage}%):</span>
                    <span>{formatCurrency(invoice.vat_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terbilang */}
            <div className="mb-4">
              <p className="text-sm">
                <strong>Terbilang:</strong> {amountToWords(invoice.total_amount)}
              </p>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              {/* Bank Information */}
              {invoice.bank_name && (
                <div>
                  <p className="font-bold mb-2">Bank Details:</p>
                  <p>{invoice.bank_name}</p>
                  <p>Account: {invoice.bank_account_number}</p>
                  <p>Name: {invoice.bank_account_name}</p>
                </div>
              )}

              {/* Signature */}
              <div className="text-right">
                <p className="mb-8">Company,</p>
                <div className="border-b border-gray-400 w-32 ml-auto mb-2"></div>
                <p>Authorized Signature</p>
              </div>
            </div>

            {/* Office Address */}
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>Office Address: Jakarta Office, Indonesia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Instructions */}
      {showActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
          <h3 className="font-medium text-blue-900 mb-2">Print Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use "Download PDF" for sharing or archiving</li>
            <li>• Use "Print Invoice" for immediate printing</li>
            <li>• Ensure your printer is set to A4 or Letter size</li>
            <li>• For dot matrix printers, use the Electron app version</li>
          </ul>
        </div>
      )}
    </div>
  )
}