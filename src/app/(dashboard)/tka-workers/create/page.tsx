// app/(dashboard)/tka-workers/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Form, FormItem, FormActions } from '@/components/ui/form'
import { PageTitle } from '@/components/common/PageTitle'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { GENDER_OPTIONS } from '@/lib/constants'

interface TKAWorkerFormData {
  nama: string
  passport: string
  divisi: string
  jenis_kelamin: 'Laki-laki' | 'Perempuan'
}

export default function CreateTKAWorkerPage() {
  const router = useRouter()
  const { hasPermission } = useAuthStore()
  const { showSuccessToast, showErrorToast } = useUIStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<TKAWorkerFormData>({
    nama: '',
    passport: '',
    divisi: '',
    jenis_kelamin: 'Laki-laki'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Check permissions
    if (!hasPermission('tka_workers', 'create')) {
      showErrorToast('Access Denied', 'You do not have permission to create TKA workers')
      router.push('/tka-workers')
      return
    }
  }, [hasPermission, router, showErrorToast])

  const handleInputChange = (field: keyof TKAWorkerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nama.trim()) {
      newErrors.nama = 'Name is required'
    } else if (formData.nama.trim().length < 2) {
      newErrors.nama = 'Name must be at least 2 characters'
    } else if (formData.nama.trim().length > 100) {
      newErrors.nama = 'Name must not exceed 100 characters'
    }

    if (!formData.passport.trim()) {
      newErrors.passport = 'Passport number is required'
    } else if (formData.passport.trim().length < 3) {
      newErrors.passport = 'Passport number must be at least 3 characters'
    } else if (formData.passport.trim().length > 20) {
      newErrors.passport = 'Passport number must not exceed 20 characters'
    }

    if (formData.divisi && formData.divisi.length > 100) {
      newErrors.divisi = 'Division must not exceed 100 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/tka-workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama: formData.nama.trim(),
          passport: formData.passport.trim().toUpperCase(),
          divisi: formData.divisi.trim() || undefined,
          jenis_kelamin: formData.jenis_kelamin
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create TKA worker')
      }

      showSuccessToast('Success', 'TKA worker created successfully')
      router.push(`/tka-workers/${data.tka_worker.id}`)

    } catch (error) {
      console.error('Create TKA worker error:', error)
      showErrorToast(
        'Create Failed',
        error instanceof Error ? error.message : 'Failed to create TKA worker'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/tka-workers')
  }

  const genderOptions = [
    { value: GENDER_OPTIONS.MALE, label: 'Laki-laki' },
    { value: GENDER_OPTIONS.FEMALE, label: 'Perempuan' }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitle 
        title="Add New TKA Worker" 
        description="Register a new foreign worker in the system"
      />

      <Card>
        <CardHeader>
          <CardTitle>TKA Worker Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handleSubmit}>
            <FormItem
              label="Full Name"
              error={errors.nama}
              required
            >
              <Input
                type="text"
                placeholder="Enter full name"
                value={formData.nama}
                onChange={(e) => handleInputChange('nama', e.target.value)}
                error={errors.nama}
                maxLength={100}
              />
            </FormItem>

            <FormItem
              label="Passport Number"
              error={errors.passport}
              required
            >
              <Input
                type="text"
                placeholder="Enter passport number"
                value={formData.passport}
                onChange={(e) => handleInputChange('passport', e.target.value.toUpperCase())}
                error={errors.passport}
                maxLength={20}
                style={{ textTransform: 'uppercase' }}
              />
            </FormItem>

            <FormItem
              label="Division"
              error={errors.divisi}
              description="Department or work division (optional)"
            >
              <Input
                type="text"
                placeholder="Enter division (optional)"
                value={formData.divisi}
                onChange={(e) => handleInputChange('divisi', e.target.value)}
                error={errors.divisi}
                maxLength={100}
              />
            </FormItem>

            <FormItem
              label="Gender"
              required
            >
              <Select
                options={genderOptions}
                value={formData.jenis_kelamin}
                onValueChange={(value) => handleInputChange('jenis_kelamin', value)}
              />
            </FormItem>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create TKA Worker'}
              </Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Make sure the passport number is unique and accurate</p>
            <p>• Passport numbers will be automatically converted to uppercase</p>
            <p>• Division field is optional but helpful for organization</p>
            <p>• You can add family members after creating the TKA worker</p>
            <p>• This worker will be available for selection in invoices</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}