
// components/auth/RegisterForm.tsx
'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRegister } from '@/hooks/api/useAuth'
import { registerSchema } from '@/lib/validation'
import type { RegisterFormData } from '@/lib/types'

interface RegisterFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const roleOptions = [
  { value: 'finance_staff', label: 'Finance Staff' },
  { value: 'finance_supervisor', label: 'Finance Supervisor' },
  { value: 'admin', label: 'Admin' }
]

export function RegisterForm({ onSuccess, onCancel }: RegisterFormProps) {
  const register_mutation = useRegister()
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      username: '',
      role: 'finance_staff'
    }
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('')
      setSuccess('')
      await register_mutation.mutateAsync(data)
      setSuccess('User created successfully!')
      reset()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <Input
                {...register('full_name')}
                placeholder="Enter full name"
                error={errors.full_name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <Input
                {...register('username')}
                placeholder="Enter username"
                error={errors.username?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="Enter email address"
                error={errors.email?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <Select
                {...register('role')}
                options={roleOptions}
                error={errors.role?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <Input
                {...register('password')}
                type="password"
                placeholder="Enter password"
                error={errors.password?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <Input
                {...register('confirmPassword')}
                type="password"
                placeholder="Confirm password"
                error={errors.confirmPassword?.message}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={register_mutation.isPending}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              loading={register_mutation.isPending}
            >
              Create User
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
