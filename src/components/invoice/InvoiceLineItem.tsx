// components/invoice/InvoiceLineItem.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TKASearch } from '@/components/search/TKASearch'
import { useTKAWorkers } from '@/hooks/api/useTKAWorkers'
import { useJobDescriptions } from '@/hooks/api/useJobDescriptions'
import { formatCurrency } from '@/lib/utils'
import { InvoiceCalculator } from '@/lib/calculations/invoice'
import type { TKAWorker, JobDescription } from '@/lib/types'

interface InvoiceLineItemProps {
  line: any
  index: number
  companyId: string
  isEditing: boolean
  editable: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onUpdate: (updates: any) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onStartEdit: () => void
  onFinishEdit: () => void
}

export function InvoiceLineItem({
  line,
  index,
  companyId,
  isEditing,
  editable,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onStartEdit,
  onFinishEdit
}: InvoiceLineItemProps) {
  const [selectedTKA, setSelectedTKA] = useState<TKAWorker | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null)
  const [localLine, setLocalLine] = useState(line)
  
  const { data: tkaWorkers } = useTKAWorkers()
  const { data: jobDescriptions } = useJobDescriptions(companyId)

  // Sync local state with props
  useEffect(() => {
    setLocalLine(line)
  }, [line])

  // Load selected TKA and Job when editing existing line
  useEffect(() => {
    if (line.tka_id && tkaWorkers?.workers) {
      const tka = tkaWorkers.workers.find(w => w.id === line.tka_id)
      setSelectedTKA(tka || null)
    }
    
    if (line.job_description_id && jobDescriptions?.jobs) {
      const job = jobDescriptions.jobs.find(j => j.id === line.job_description_id)
      setSelectedJob(job || null)
    }
  }, [line.tka_id, line.job_description_id, tkaWorkers, jobDescriptions])

  const handleTKASelect = (tka: TKAWorker) => {
    setSelectedTKA(tka)
    const updates = {
      tka_id: tka.id,
      tka_name: tka.nama
    }
    setLocalLine({ ...localLine, ...updates })
    onUpdate(updates)
  }

  const handleJobSelect = (jobId: string) => {
    const job = jobDescriptions?.jobs?.find(j => j.id === jobId)
    if (job) {
      setSelectedJob(job)
      const unitPrice = localLine.custom_price || job.price
      const lineTotal = InvoiceCalculator.calculateLineTotal(localLine.quantity, unitPrice)
      
      const updates = {
        job_description_id: job.id,
        job_name: job.job_name,
        unit_price: unitPrice,
        line_total: lineTotal
      }
      setLocalLine({ ...localLine, ...updates })
      onUpdate(updates)
    }
  }

  const handleQuantityChange = (quantity: number) => {
    const unitPrice = localLine.custom_price || localLine.unit_price
    const lineTotal = InvoiceCalculator.calculateLineTotal(quantity, unitPrice)
    
    const updates = {
      quantity,
      line_total: lineTotal
    }
    setLocalLine({ ...localLine, ...updates })
    onUpdate(updates)
  }

  const handleCustomPriceChange = (customPrice: number | undefined) => {
    const unitPrice = customPrice || selectedJob?.price || 0
    const lineTotal = InvoiceCalculator.calculateLineTotal(localLine.quantity, unitPrice)
    
    const updates = {
      custom_price: customPrice,
      unit_price: unitPrice,
      line_total: lineTotal
    }
    setLocalLine({ ...localLine, ...updates })
    onUpdate(updates)
  }

  const handleBarisChange = (baris: number) => {
    const updates = { baris }
    setLocalLine({ ...localLine, ...updates })
    onUpdate(updates)
  }

  const handleCustomJobNameChange = (customJobName: string) => {
    const updates = { custom_job_name: customJobName }
    setLocalLine({ ...localLine, ...updates })
    onUpdate(updates)
  }

  const jobOptions = jobDescriptions?.jobs?.map(job => ({
    value: job.id,
    label: `${job.job_name} - ${formatCurrency(job.price)}`
  })) || []

  if (isEditing) {
    return (
      <div className="grid grid-cols-12 gap-2 p-3 border border-blue-200 bg-blue-50 rounded-lg">
        {/* Baris Number */}
        <div className="col-span-1">
          <Input
            type="number"
            value={localLine.baris || index + 1}
            onChange={(e) => handleBarisChange(parseInt(e.target.value) || index + 1)}
            min={1}
            max={999}
            className="text-sm"
          />
        </div>

        {/* TKA Worker */}
        <div className="col-span-3">
          <TKASearch
            onSelect={handleTKASelect}
            selected={selectedTKA}
            placeholder="Select TKA worker..."
            size="sm"
          />
        </div>

        {/* Job Description */}
        <div className="col-span-3 space-y-2">
          <Select
            value={localLine.job_description_id}
            onChange={(e) => handleJobSelect(e.target.value)}
            options={jobOptions}
            placeholder="Select job..."
            className="text-sm"
          />
          
          {/* Custom Job Name */}
          <Input
            value={localLine.custom_job_name || ''}
            onChange={(e) => handleCustomJobNameChange(e.target.value)}
            placeholder="Custom job name (optional)"
            className="text-sm"
          />
        </div>

        {/* Quantity */}
        <div className="col-span-1">
          <Input
            type="number"
            value={localLine.quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            min={1}
            max={9999}
            className="text-sm"
          />
        </div>

        {/* Custom Price */}
        <div className="col-span-2">
          <Input
            type="number"
            value={localLine.custom_price || ''}
            onChange={(e) => {
              const value = e.target.value
              handleCustomPriceChange(value ? parseFloat(value) : undefined)
            }}
            placeholder={selectedJob ? formatCurrency(selectedJob.price) : 'Enter price'}
            className="text-sm"
            step="0.01"
            min="0"
          />
        </div>

        {/* Line Total */}
        <div className="col-span-1">
          <div className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded border">
            {formatCurrency(localLine.line_total || 0)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex space-x-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onFinishEdit}
            className="text-xs"
          >
            ✓
          </Button>
          
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRemove}
            className="text-xs text-red-600 hover:text-red-700"
          >
            ✕
          </Button>
        </div>
      </div>
    )
  }

  // Display mode
  return (
    <div className="grid grid-cols-12 gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      {/* Baris Number */}
      <div className="col-span-1">
        <span className="text-sm font-medium">
          {localLine.baris || index + 1}
        </span>
      </div>

      {/* TKA Worker */}
      <div className="col-span-3">
        <div className="text-sm">
          <div className="font-medium">
            {selectedTKA?.nama || localLine.tka_name || 'Not selected'}
          </div>
          {selectedTKA?.passport && (
            <div className="text-xs text-gray-500">
              Passport: {selectedTKA.passport}
            </div>
          )}
        </div>
      </div>

      {/* Job Description */}
      <div className="col-span-3">
        <div className="text-sm">
          <div className="font-medium">
            {localLine.custom_job_name || selectedJob?.job_name || localLine.job_name || 'Not selected'}
          </div>
          {selectedJob?.job_description && (
            <div className="text-xs text-gray-500 truncate">
              {selectedJob.job_description}
            </div>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="col-span-1">
        <span className="text-sm font-medium">
          {localLine.quantity}
        </span>
      </div>

      {/* Unit Price */}
      <div className="col-span-2">
        <div className="text-sm">
          <div className="font-medium">
            {formatCurrency(localLine.unit_price || 0)}
          </div>
          {localLine.custom_price && (
            <div className="text-xs text-amber-600">
              Custom price
            </div>
          )}
        </div>
      </div>

      {/* Line Total */}
      <div className="col-span-2">
        <span className="text-sm font-medium">
          {formatCurrency(localLine.line_total || 0)}
        </span>
      </div>

      {/* Actions */}
      {editable && (
        <div className="col-span-1 flex items-center space-x-1">
          <button
            type="button"
            onClick={onStartEdit}
            className="text-xs text-blue-600 hover:text-blue-700"
            title="Edit line"
          >
            ✏️
          </button>
          
          {canMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="text-xs text-gray-600 hover:text-gray-700"
              title="Move up"
            >
              ↑
            </button>
          )}
          
          {canMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="text-xs text-gray-600 hover:text-gray-700"
              title="Move down"
            >
              ↓
            </button>
          )}
          
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 hover:text-red-700"
            title="Remove line"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}