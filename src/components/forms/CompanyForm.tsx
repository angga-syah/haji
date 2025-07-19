// components/forms/CompanyForm.tsx
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { companySchema } from '@/lib/validation'
import type { CreateCompanyData, Company } from '@/lib/types'

interface CompanyFormProps {
  initialData?: Partial<Company>
  onSubmit: (data: CreateCompanyData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function CompanyForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  submitLabel = 'Save Company'
}: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateCompanyData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: initialData?.company_name || '',
      npwp: initialData?.npwp || '',
      idtku: initialData?.idtku || '',
      address: initialData?.address || '',
      contact_phone: initialData?.contact_phone || '',
      contact_email: initialData?.contact_email || ''
    }
  })

  const handleFormSubmit = async (data: CreateCompanyData) => {
    try {
      await onSubmit(data)
      if (!initialData) {
        reset() // Only reset for new companies
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Company' : 'Create New Company'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <Input
                {...register('company_name')}
                placeholder="Enter company name"
                error={errors.company_name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NPWP *
              </label>
              <Input
                {...register('npwp')}
                placeholder="15 digits NPWP"
                maxLength={15}
                error={errors.npwp?.message}
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: 15 digit numbers only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IDTKU *
              </label>
              <Input
                {...register('idtku')}
                placeholder="Enter IDTKU"
                error={errors.idtku?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <Input
                {...register('contact_phone')}
                placeholder="Enter phone number"
                type="tel"
                error={errors.contact_phone?.message}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <Input
                {...register('contact_email')}
                placeholder="Enter email address"
                type="email"
                error={errors.contact_email?.message}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                {...register('address')}
                placeholder="Enter complete address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
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
