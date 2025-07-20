// src/app/(dashboard)/reports/companies/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CompanyReportData {
  id: string
  company_name: string
  npwp: string
  idtku: string
  address: string
  contact_email?: string
  contact_phone?: string
  is_active: boolean
  created_at: string
  job_count: number
  invoice_count: number
  total_amount: number
  last_invoice_date?: string
  tka_count: number
}

interface CompanySummary {
  totalCompanies: number
  activeCompanies: number
  totalRevenue: number
  averageRevenuePerCompany: number
  totalJobs: number
  totalInvoices: number
  companiesWithInvoices: number
}

export default function CompanyReportsPage() {
  // State
  const [companies, setCompanies] = useState<CompanyReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const debouncedSearch = useDebounce(searchQuery, 300)

  // Load data
  React.useEffect(() => {
    fetchCompanies()
  }, [debouncedSearch, activeFilter])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (activeFilter !== 'all') params.set('active', activeFilter)
      params.set('include_stats', 'true')
      
      const response = await fetch(`/api/companies?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch companies')
      
      const data = await response.json()
      setCompanies(data.companies || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary
  const summary: CompanySummary = useMemo(() => {
    const totalCompanies = companies.length
    const activeCompanies = companies.filter(c => c.is_active).length
    const totalRevenue = companies.reduce((sum, c) => sum + c.total_amount, 0)
    const averageRevenuePerCompany = totalCompanies > 0 ? totalRevenue / totalCompanies : 0
    const totalJobs = companies.reduce((sum, c) => sum + c.job_count, 0)
    const totalInvoices = companies.reduce((sum, c) => sum + c.invoice_count, 0)
    const companiesWithInvoices = companies.filter(c => c.invoice_count > 0).length

    return {
      totalCompanies,
      activeCompanies,
      totalRevenue,
      averageRevenuePerCompany,
      totalJobs,
      totalInvoices,
      companiesWithInvoices
    }
  }, [companies])

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      setExporting(true)
      
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (activeFilter !== 'all') params.set('active', activeFilter)
      params.set('format', format)
      params.set('type', 'companies')
      
      const response = await fetch(`/api/reports/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')
      
      // Download file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `company-report-${timestamp}.${format === 'excel' ? 'xlsx' : format}`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActiveFilter('all')
  }

  // Sort companies by revenue descending
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => b.total_amount - a.total_amount)
  }, [companies])

  return (
    <div className="space-y-6">
      <PageTitle
        title="Company Reports"
        description="Analyze company performance and statistics"
        action={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              loading={exporting}
              disabled={companies.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              loading={exporting}
              disabled={companies.length === 0}
            >
              Export Excel
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              loading={exporting}
              disabled={companies.length === 0}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.totalCompanies}</div>
            <p className="text-sm text-gray-500">Total Companies</p>
            <p className="text-xs text-gray-400 mt-1">
              {summary.activeCompanies} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-xs text-gray-400 mt-1">
              Avg: {formatCurrency(summary.averageRevenuePerCompany)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.totalInvoices}</div>
            <p className="text-sm text-gray-500">Total Invoices</p>
            <p className="text-xs text-gray-400 mt-1">
              {summary.companiesWithInvoices} companies with invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{summary.totalJobs}</div>
            <p className="text-sm text-gray-500">Job Descriptions</p>
            <p className="text-xs text-gray-400 mt-1">
              Avg: {(summary.totalJobs / Math.max(summary.totalCompanies, 1)).toFixed(1)} per company
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div className="flex space-x-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'true' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('true')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={activeFilter === 'false' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('false')}
                size="sm"
              >
                Inactive
              </Button>
            </div>
            
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Companies by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedCompanies.slice(0, 10).map((company, index) => (
                <div key={company.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium truncate max-w-[200px]">
                        {company.company_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {company.invoice_count} invoices
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(company.total_amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.job_count} jobs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Companies with Job Descriptions</span>
                <span className="font-medium">
                  {companies.filter(c => c.job_count > 0).length} / {companies.length}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Companies with Invoices</span>
                <span className="font-medium">
                  {summary.companiesWithInvoices} / {companies.length}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Jobs per Company</span>
                <span className="font-medium">
                  {(summary.totalJobs / Math.max(summary.totalCompanies, 1)).toFixed(1)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Invoices per Company</span>
                <span className="font-medium">
                  {(summary.totalInvoices / Math.max(summary.totalCompanies, 1)).toFixed(1)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Companies Created This Month</span>
                <span className="font-medium">
                  {companies.filter(c => 
                    new Date(c.created_at).getMonth() === new Date().getMonth() &&
                    new Date(c.created_at).getFullYear() === new Date().getFullYear()
                  ).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Company List */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No companies found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      NPWP / IDTKU
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Jobs
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Invoices
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Invoice
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                            {company.company_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(company.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <div>NPWP: {company.npwp}</div>
                          <div>IDTKU: {company.idtku}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium">{company.job_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium">{company.invoice_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium">
                          {formatCurrency(company.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.last_invoice_date ? 
                          formatDate(company.last_invoice_date) : 
                          'No invoices'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          company.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}