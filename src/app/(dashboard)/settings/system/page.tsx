// src/app/(dashboard)/settings/system/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useAuth } from '@/hooks/ui/useAuth'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface SystemSetting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: string
  description?: string
  is_system: boolean
  updated_at: string
}

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
}

export default function SystemSettingsPage() {
  const { isAdmin } = useAuth()
  
  // States
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [vatPercentage, setVatPercentage] = useState(11.0)
  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'Spirit of Services',
    address: 'Jakarta Office, Indonesia',
    phone: '+62-21-12345678',
    email: 'info@spiritofservices.com'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check admin permission
  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <div className="max-w-md mx-auto">
          <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need administrator privileges to access system settings.</p>
          <Link href="/settings">
            <Button variant="outline">Back to Settings</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Load settings
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/system')
      if (!response.ok) throw new Error('Failed to fetch settings')
      
      const data = await response.json()
      setSettings(data.settings || [])
      
      // Populate form fields
      data.settings?.forEach((setting: SystemSetting) => {
        switch (setting.setting_key) {
          case 'vat_percentage':
            setVatPercentage(parseFloat(setting.setting_value) || 11.0)
            break
          case 'invoice_prefix':
            setInvoicePrefix(setting.setting_value || 'INV')
            break
          case 'company_info':
            if (typeof setting.setting_value === 'object') {
              setCompanyInfo({
                name: setting.setting_value.name || 'Spirit of Services',
                address: setting.setting_value.address || 'Jakarta Office, Indonesia',
                phone: setting.setting_value.phone || '+62-21-12345678',
                email: setting.setting_value.email || 'info@spiritofservices.com'
              })
            }
            break
        }
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setErrors({})
    
    // Validation
    const newErrors: Record<string, string> = {}
    
    if (vatPercentage < 0 || vatPercentage > 100) {
      newErrors.vatPercentage = 'VAT percentage must be between 0 and 100'
    }
    
    if (!invoicePrefix.trim()) {
      newErrors.invoicePrefix = 'Invoice prefix is required'
    }
    
    if (!companyInfo.name.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    
    if (!companyInfo.email.trim() || !/\S+@\S+\.\S+/.test(companyInfo.email)) {
      newErrors.companyEmail = 'Valid email is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    try {
      setSaving(true)
      
      const settingsToUpdate = [
        {
          setting_key: 'vat_percentage',
          setting_value: vatPercentage,
          setting_type: 'number',
          description: 'Default VAT percentage for invoices'
        },
        {
          setting_key: 'invoice_prefix',
          setting_value: invoicePrefix,
          setting_type: 'string',
          description: 'Default prefix for invoice numbers'
        },
        {
          setting_key: 'company_info',
          setting_value: companyInfo,
          setting_type: 'json',
          description: 'Company information for invoices'
        }
      ]
      
      for (const setting of settingsToUpdate) {
        const response = await fetch('/api/settings/system', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save settings')
        }
      }
      
      alert('Settings saved successfully!')
      fetchSettings() // Refresh settings
      
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
      return
    }
    
    try {
      setSaving(true)
      
      const response = await fetch('/api/settings/system', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to reset settings')
      }
      
      // Reset form to defaults
      setVatPercentage(11.0)
      setInvoicePrefix('INV')
      setCompanyInfo({
        name: 'Spirit of Services',
        address: 'Jakarta Office, Indonesia',
        phone: '+62-21-12345678',
        email: 'info@spiritofservices.com'
      })
      
      alert('Settings reset to default values!')
      fetchSettings()
      
    } catch (error: any) {
      console.error('Error resetting settings:', error)
      alert(error.message || 'Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="System Settings"
        description="Configure global system settings and defaults"
        action={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleResetSettings}
              disabled={saving}
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSaveSettings}
              loading={saving}
              disabled={saving}
            >
              Save Settings
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default VAT Percentage (%)
              </label>
              <Input
                type="number"
                value={vatPercentage}
                onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
                error={errors.vatPercentage}
              />
              <p className="text-xs text-gray-500 mt-1">
                Applied to new invoices. Current: {vatPercentage}%
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number Prefix
              </label>
              <Input
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                maxLength={10}
                error={errors.invoicePrefix}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: {invoicePrefix}-YY-MM-NNN (e.g., {invoicePrefix}-24-12-001)
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2">VAT Calculation Rules</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• If VAT amount ends with .49, round down</li>
                <li>• If VAT amount ends with .50+, round up</li>
                <li>• Standard rounding for other cases</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <Input
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                error={errors.companyName}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                error={errors.companyEmail}
              />
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-900 mb-1">Usage</h4>
              <p className="text-xs text-green-800">
                This information appears on all generated invoices and reports.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900">Version</div>
              <div className="text-sm text-gray-600">1.0.0</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900">Environment</div>
              <div className="text-sm text-gray-600">
                {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900">Database</div>
              <div className="text-sm text-gray-600">PostgreSQL</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900">Last Updated</div>
              <div className="text-sm text-gray-600">
                {settings.length > 0 
                  ? new Date(Math.max(...settings.map(s => new Date(s.updated_at).getTime()))).toLocaleDateString()
                  : 'Never'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Setting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {setting.setting_key}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-[200px] truncate">
                        {setting.setting_type === 'json' 
                          ? JSON.stringify(setting.setting_value)
                          : setting.setting_value?.toString()
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {setting.setting_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {setting.description || 'No description'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}