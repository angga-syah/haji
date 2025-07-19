// components/forms/TKAWorkerForm.tsx
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { tkaWorkerSchema } from '@/lib/validation'
import type { CreateTKAWorkerData, TKAWorker } from '@/lib/types'

interface TKAWorkerFormProps {
  initialData?: Partial<TKAWorker>
  onSubmit: (data: CreateTKAWorkerData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

const genderOptions = [
  { value: 'Laki-laki', label: 'Laki-laki' },
  { value: 'Perempuan', label: 'Perempuan' }
]

export function TKAWorkerForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  submitLabel = 'Save TKA Worker'
}: TKAWorkerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CreateTKAWorkerData>({
    resolver: zodResolver(tkaWorkerSchema),
    defaultValues: {
      nama: initialData?.nama || '',
      passport: initialData?.passport || '',
      divisi: initialData?.divisi || '',
      jenis_kelamin: initialData?.jenis_kelamin || 'Laki-laki'
    }
  })

  const handleFormSubmit = async (data: CreateTKAWorkerData) => {
    try {
      await onSubmit(data)
      if (!initialData) {
        reset() // Only reset for new workers
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit TKA Worker' : 'Create New TKA Worker'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <Input
                {...register('nama')}
                placeholder="Enter full name"
                error={errors.nama?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passport Number *
              </label>
              <Input
                {...register('passport')}
                placeholder="Enter passport number"
                error={errors.passport?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Division
              </label>
              <Input
                {...register('divisi')}
                placeholder="Enter division/department"
                error={errors.divisi?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <Select
                {...register('jenis_kelamin')}
                options={genderOptions}
                placeholder="Select gender"
                error={errors.jenis_kelamin?.message}
              />
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
