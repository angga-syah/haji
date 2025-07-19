// components/forms/JobDescriptionForm.tsx
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { jobDescriptionSchema } from '@/lib/validation'
import { formatCurrency } from '@/lib/utils'
import type { CreateJobDescriptionData, JobDescription } from '@/lib/types'

interface JobDescriptionFormProps {
  companyId: string
  initialData?: Partial<JobDescription>
  onSubmit: (data: CreateJobDescriptionData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function JobDescriptionForm({ 
  companyId,
  initialData, 
  onSubmit, 
  isLoading = false,
  submitLabel = 'Save Job Description'
}: JobDescriptionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateJobDescriptionData>({
    resolver: zodResolver(jobDescriptionSchema),
    defaultValues: {
      company_id: companyId,
      job_name: initialData?.job_name || '',
      job_description: initialData?.job_description || '',
      price: initialData?.price || 0,
      sort_order: initialData?.sort_order || 0
    }
  })

  const priceValue = watch('price')

  const handleFormSubmit = async (data: CreateJobDescriptionData) => {
    try {
      await onSubmit(data)
      if (!initialData) {
        reset() // Only reset for new job descriptions
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '')
    setValue('price', parseInt(value) || 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Job Description' : 'Create New Job Description'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Name *
              </label>
              <Input
                {...register('job_name')}
                placeholder="Enter job name"
                error={errors.job_name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <Input
                type="text"
                placeholder="0"
                onChange={handlePriceChange}
                value={priceValue ? priceValue.toLocaleString('id-ID') : ''}
                error={errors.price?.message}
              />
              <p className="mt-1 text-xs text-gray-500">
                Current value: {formatCurrency(priceValue || 0)}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                {...register('job_description')}
                placeholder="Enter detailed job description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
              {errors.job_description && (
                <p className="mt-1 text-sm text-red-600">{errors.job_description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <Input
                {...register('sort_order', { valueAsNumber: true })}
                type="number"
                placeholder="0"
                min="0"
                error={errors.sort_order?.message}
              />
              <p className="mt-1 text-xs text-gray-500">
                Lower numbers appear first
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              loading={isLoading}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}