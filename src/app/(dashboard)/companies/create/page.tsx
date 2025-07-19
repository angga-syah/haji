// app/(dashboard)/companies/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormItem, FormActions } from '@/components/ui/form'
import { PageTitle } from '@/components/common/PageTitle'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

interface CompanyFormData {
  company_name: string
  npwp: string
  idtku: string
  address: string
  contact_phone: string
  contact_email: string
}

export default function CreateCompanyPage() {
  const router = useRouter()
  const { hasPermission } = useAuthStore()
  const { showSuccessToast, showErrorToast } = useUIStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CompanyFormData>({
    company_name: '',
    npwp: '',
    idtku: '',
    address: '',
    contact_phone: '',
    contact_email: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Check permissions
    if (!hasPermission('companies', 'create')) {
      showErrorToast('Access Denied', 'You do not have permission to create companies')
      router.push('/companies')
      return
    }
  }, [hasPermission, router, showErrorToast])

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Company name validation
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    } else if (formData.company_name.trim().length < 2) {
      newErrors.company_name = 'Company name must be at least 2 characters'
    } else if (formData.company_name.trim().length > 200) {
      newErrors.company_name = 'Company name must not exceed 200 characters'
    }

    // NPWP validation
    if (!formData.npwp.trim()) {
      newErrors.npwp = 'NPWP is required'
    } else {
      const npwpClean = formData.npwp.replace(/\D/g, '') // Remove non-digits
      if (npwpClean.length !== 15) {
        newErrors.npwp = 'NPWP must be exactly 15 digits'
      }
    }

    // IDTKU validation
    if (!formData.idtku.trim()) {
      newErrors.idtku = 'IDTKU is required'
    } else if (formData.idtku.trim().length > 20) {
      newErrors.idtku = 'IDTKU must not exceed 20 characters'
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters'
    } else if (formData.address.trim().length > 500) {
      newErrors.address = 'Address must not exceed 500 characters'
    }

    // Phone validation (optional)
    if (formData.contact_phone && formData.contact_phone.length > 20) {
      newErrors.contact_phone = 'Phone number must not exceed 20 characters'
    }

    // Email validation (optional)
    if (formData.contact_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.contact_email)) {
        newErrors.contact_email = 'Please enter a valid email address'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatNPWP = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as XX.XXX.XXX.X-XXX.XXX
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12, 15)}`
  }

  const handleNPWPChange = (value: string) => {
    const formatted = formatNPWP(value)
    handleInputChange('npwp', formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Clean NPWP for submission (digits only)
      const npwpClean = formData.npwp.replace(/\D/g, '')
      
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: formData.company_name.trim(),
          npwp: npwpClean,
          idtku: formData.idtku.trim(),
          address: formData.address.trim(),
          contact_phone: formData.contact_phone.trim() || undefined,
          contact_email: formData.contact_email.trim() || undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company')
      }

      showSuccessToast('Success', 'Company created successfully')
      router.push(`/companies/${data.company.id}`)

    } catch (error) {
      console.error('Create company error:', error)
      showErrorToast(
        'Create Failed',
        error instanceof Error ? error.message : 'Failed to create company'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/companies')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitle 
        title="Add New Company" 
        description="Register a new company in the system"
      />

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handleSubmit}>
            <FormItem
              label="Company Name"
              error={errors.company_name}
              required
            >
              <Input
                type="text"
                placeholder="Enter company name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                error={errors.company_name}
                maxLength={200}
              />
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem
                label="NPWP"
                error={errors.npwp}
                required
                description="15-digit tax identification number"
              >
                <Input
                  type="text"
                  placeholder="XX.XXX.XXX.X-XXX.XXX"
                  value={formData.npwp}
                  onChange={(e) => handleNPWPChange(e.target.value)}
                  error={errors.npwp}
                  maxLength={20}
                />
              </FormItem>

              <FormItem
                label="IDTKU"
                error={errors.idtku}
                required
                description="Work permit identification"
              >
                <Input
                  type="text"
                  placeholder="Enter IDTKU"
                  value={formData.idtku}
                  onChange={(e) => handleInputChange('idtku', e.target.value)}
                  error={errors.idtku}
                  maxLength={20}
                />
              </FormItem>
            </div>

            <FormItem
              label="Address"
              error={errors.address}
              required
            >
              <Input
                type="text"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                error={errors.address}
                maxLength={500}
              />
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem
                label="Contact Phone"
                error={errors.contact_phone}
                description="Optional"
              >
                <Input
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  error={errors.contact_phone}
                  maxLength={20}
                />
              </FormItem>

              <FormItem
                label="Contact Email"
                error={errors.contact_email}
                description="Optional"
              >
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  error={errors.contact_email}
                />
              </FormItem>
            </div>

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
                {isLoading ? 'Creating...' : 'Create Company'}
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
            <p>• NPWP must be exactly 15 digits (formatting will be applied automatically)</p>
            <p>• IDTKU should be the official work permit identification number</p>
            <p>• Ensure all required information is accurate as it will appear on invoices</p>
            <p>• Contact information is optional but recommended for communication</p>
            <p>• After creating the company, you can add job descriptions and pricing</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}