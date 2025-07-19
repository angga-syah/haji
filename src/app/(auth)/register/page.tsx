// app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Form, FormItem, FormLabel } from '@/components/ui/form'
import { USER_ROLES, ROLE_LABELS } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  full_name: string
  username: string
  role: 'admin' | 'finance_supervisor' | 'finance_staff'
}

export default function RegisterPage() {
  const router = useRouter()
  const { showErrorToast, showSuccessToast } = useUIStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    username: '',
    role: 'finance_staff'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.full_name) {
      newErrors.full_name = 'Full name is required'
    } else if (formData.full_name.length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters'
    }

    if (!formData.username) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      showSuccessToast('Registration Successful', 'Account created successfully. Please login.')
      router.push('/login')

    } catch (error) {
      console.error('Registration error:', error)
      showErrorToast(
        'Registration Failed',
        error instanceof Error ? error.message : 'Please try again later'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const roleOptions = [
    { value: USER_ROLES.FINANCE_STAFF, label: ROLE_LABELS[USER_ROLES.FINANCE_STAFF] },
    { value: USER_ROLES.FINANCE_SUPERVISOR, label: ROLE_LABELS[USER_ROLES.FINANCE_SUPERVISOR] },
    { value: USER_ROLES.ADMIN, label: ROLE_LABELS[USER_ROLES.ADMIN] }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <p className="text-sm text-gray-600">
              Register for Invoice Management System
            </p>
          </CardHeader>
          <CardContent>
            <Form onSubmit={handleSubmit}>
              <FormItem
                label="Full Name"
                error={errors.full_name}
                required
              >
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  error={errors.full_name}
                />
              </FormItem>

              <FormItem
                label="Username"
                error={errors.username}
                required
              >
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  error={errors.username}
                />
              </FormItem>

              <FormItem
                label="Email"
                error={errors.email}
                required
              >
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                />
              </FormItem>

              <FormItem
                label="Role"
                required
              >
                <Select
                  options={roleOptions}
                  value={formData.role}
                  onValueChange={(value) => handleInputChange('role', value)}
                  placeholder="Select role"
                />
              </FormItem>

              <FormItem
                label="Password"
                error={errors.password}
                required
              >
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={errors.password}
                />
              </FormItem>

              <FormItem
                label="Confirm Password"
                error={errors.confirmPassword}
                required
              >
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={errors.confirmPassword}
                />
              </FormItem>

              <Button 
                type="submit" 
                className="w-full mt-6"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}