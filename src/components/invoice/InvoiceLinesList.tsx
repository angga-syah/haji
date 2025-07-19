// components/invoice/InvoiceLinesList.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InvoiceLineItem } from './InvoiceLineItem'
import { useInvoiceStore } from '@/stores/invoiceStore'
import { uiUtils } from '@/stores/uiStore'
import type { CreateInvoiceLineData } from '@/lib/types'

interface InvoiceLinesListProps {
  companyId: string
  editable?: boolean
  onLineChange?: (lines: any[]) => void
}

export function InvoiceLinesList({ 
  companyId, 
  editable = true, 
  onLineChange 
}: InvoiceLinesListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  
  const {
    lines,
    addLine,
    updateLine,
    removeLine,
    reorderLines
  } = useInvoiceStore()

  const handleAddLine = () => {
    const newLine: CreateInvoiceLineData = {
      tka_id: '',
      job_description_id: '',
      quantity: 1,
      baris: lines.length + 1
    }
    
    addLine(newLine)
    setEditingIndex(lines.length) // Edit the newly added line
  }

  const handleUpdateLine = (index: number, updates: any) => {
    updateLine(index, updates)
    onLineChange?.(lines)
  }

  const handleRemoveLine = (index: number) => {
    uiUtils.confirm(
      'Remove Line Item',
      'Are you sure you want to remove this line item?',
      () => {
        removeLine(index)
        setEditingIndex(null)
        onLineChange?.(lines)
      }
    )
  }

  const handleReorderLine = (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      reorderLines(fromIndex, toIndex)
      onLineChange?.(lines)
    }
  }

  const handleStartEdit = (index: number) => {
    if (editable) {
      setEditingIndex(index)
    }
  }

  const handleFinishEdit = () => {
    setEditingIndex(null)
  }

  const canMoveUp = (index: number) => index > 0
  const canMoveDown = (index: number) => index < lines.length - 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Line Items ({lines.length})
        </h3>
        
        {editable && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddLine}
            disabled={!companyId}
          >
            Add Line Item
          </Button>
        )}
      </div>

      {/* Line Items */}
      {lines.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {!companyId ? (
            'Please select a company first'
          ) : (
            'No line items added yet'
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-lg">
            <div className="col-span-1">Baris</div>
            <div className="col-span-3">TKA Worker</div>
            <div className="col-span-3">Job Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-2">Total</div>
            {editable && <div className="col-span-1">Actions</div>}
          </div>

          {/* Line Items */}
          {lines.map((line, index) => (
            <InvoiceLineItem
              key={`line-${index}`}
              line={line}
              index={index}
              companyId={companyId}
              isEditing={editingIndex === index}
              editable={editable}
              canMoveUp={canMoveUp(index)}
              canMoveDown={canMoveDown(index)}
              onUpdate={(updates) => handleUpdateLine(index, updates)}
              onRemove={() => handleRemoveLine(index)}
              onMoveUp={() => handleReorderLine(index, index - 1)}
              onMoveDown={() => handleReorderLine(index, index + 1)}
              onStartEdit={() => handleStartEdit(index)}
              onFinishEdit={handleFinishEdit}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {lines.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Total Line Items:</span>
            <span className="font-medium">{lines.length}</span>
          </div>
          
          <div className="flex justify-between text-sm mt-1">
            <span>Total Quantity:</span>
            <span className="font-medium">
              {lines.reduce((sum, line) => sum + line.quantity, 0)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm mt-1">
            <span>Unique Workers:</span>
            <span className="font-medium">
              {new Set(lines.map(line => line.tka_id).filter(Boolean)).size}
            </span>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {editable && lines.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            Tip: You can group multiple jobs under the same "Baris" number
          </div>
          
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                uiUtils.confirm(
                  'Clear All Lines',
                  'Are you sure you want to remove all line items? This action cannot be undone.',
                  () => {
                    lines.forEach((_, index) => removeLine(0)) // Remove from beginning
                    setEditingIndex(null)
                    onLineChange?.([])
                  },
                  { isDestructive: true }
                )
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}