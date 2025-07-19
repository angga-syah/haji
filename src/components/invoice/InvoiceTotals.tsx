// components/invoice/InvoiceTotals.tsx
'use client'

import React from 'react'
import { formatCurrency } from '@/lib/utils'
import { amountToWords } from '@/lib/calculations/terbilang'
import { InvoiceCalculator } from '@/lib/calculations/invoice'
import type { InvoiceTotals as InvoiceTotalsType } from '@/lib/types'

interface InvoiceTotalsProps {
  totals: InvoiceTotalsType
  showTerbilang?: boolean
  showCalculationDetails?: boolean
  editable?: boolean
  onVATPercentageChange?: (percentage: number) => void
}

export function InvoiceTotals({
  totals,
  showTerbilang = false,
  showCalculationDetails = false,
  editable = false,
  onVATPercentageChange
}: InvoiceTotalsProps) {
  
  const handleVATChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value) || 0
    if (percentage >= 0 && percentage <= 100) {
      onVATPercentageChange?.(percentage)
    }
  }

  // Get VAT calculation explanation for debugging
  const vatExplanation = showCalculationDetails 
    ? InvoiceCalculator.getVATCalculationExplanation(totals.subtotal, totals.vat_percentage)
    : null

  return (
    <div className="space-y-4">
      {/* Calculation Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="font-medium text-gray-900">Invoice Totals</h3>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-medium text-lg">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>

            {/* VAT */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700">VAT</span>
                {editable ? (
                  <div className="flex items-center space-x-1">
                    <span>(</span>
                    <input
                      type="number"
                      value={totals.vat_percentage}
                      onChange={handleVATChange}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <span>%):</span>
                  </div>
                ) : (
                  <span className="text-gray-500">({totals.vat_percentage}%):</span>
                )}
              </div>
              <span className="font-medium text-lg">
                {formatCurrency(totals.vat_amount)}
              </span>
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terbilang (Amount in Words) */}
      {showTerbilang && totals.total_amount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <strong>Terbilang:</strong>
          </div>
          <div className="text-sm text-blue-700 mt-1 italic">
            {amountToWords(totals.total_amount)}
          </div>
        </div>
      )}

      {/* VAT Calculation Details (for debugging/admin) */}
      {showCalculationDetails && vatExplanation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            <strong>VAT Calculation Details:</strong>
          </div>
          <div className="text-xs text-yellow-700 mt-2 space-y-1">
            <div>Raw VAT: {formatCurrency(vatExplanation.rawVAT)}</div>
            <div>Fractional part: {vatExplanation.fractional}</div>
            <div>Applied rule: {vatExplanation.rule}</div>
            <div>Final VAT: {formatCurrency(vatExplanation.finalVAT)}</div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Subtotal</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(totals.subtotal)}
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600">VAT ({totals.vat_percentage}%)</div>
          <div className="text-lg font-semibold text-blue-900">
            {formatCurrency(totals.vat_amount)}
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600">Total Amount</div>
          <div className="text-xl font-bold text-green-900">
            {formatCurrency(totals.total_amount)}
          </div>
        </div>
      </div>

      {/* Quick Facts */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>
          • VAT calculation follows special business rules (0.49 rounds down, 0.50+ rounds up)
        </div>
        <div>
          • All amounts are in Indonesian Rupiah (IDR)
        </div>
        {totals.vat_percentage !== 11 && (
          <div className="text-amber-600">
            • Non-standard VAT percentage ({totals.vat_percentage}% instead of 11%)
          </div>
        )}
      </div>
    </div>
  )
}