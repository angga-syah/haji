// components/forms/BankAccountForm.tsx
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { bankAccountSchema } from '@/lib/validation'
import type { CreateBankAccountData, BankAccount } from '@/lib/types'

interface BankAccountFormProps {
  initialData?: Partial<BankAccount>
  onSubmit: (data: CreateBankAccountData) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export function BankAccountForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  submitLabel = 'Save Bank Account'
}: BankAccountFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateBankAccountData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_name: initialData?.bank_name || '',
      account_number: initialData?.account_number || '',
      account_name: initialData?.account_name || '',
      is_default: initialData?.is_default || false,
      sort_order: initialData?.sort_order || 0
    }
  })

  const handleFormSubmit = async (data: CreateBankAccountData) => {
    try {
      await onSubmit(data)
      if (!initialData) {
        reset() // Only reset for new bank accounts
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Bank Account' : 'Create New Bank Account'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name *
              </label>
              <Input
                {...register('bank_name')}
                placeholder="Enter bank name"
                error={errors.bank_name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number *
              </label>
              <Input
                {...register('account_number')}
                placeholder="Enter account number"
                error={errors.account_number?.message}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name *
              </label>
              <Input
                {...register('account_name')}
                placeholder="Enter account holder name"
                error={errors.account_name?.message}
              />
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
            </div>

            <div className="flex items-center">
              <input
                {...register('is_default')}
                type="checkbox"
                id="is_default"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                Set as default bank account
              </label>
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