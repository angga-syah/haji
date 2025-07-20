// src/app/(dashboard)/reports/invoices/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { formatCurrency, formatDate } from '@/lib/utils'
import { INVOICE_STATUS_LABELS } from '@/lib/constants'

interface InvoiceReportData {
  id: string
  invoice_number: string
  company_name: string
  invoice_date: string
  subtotal: number
  vat_amount: number
  total_amount: number
  status: 'draft' | 'finalized' | 'paid' | 'cancelled'
  created_by_name: string
  created_at: string
  line_count: number
}

interface ReportSummary {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  byStatus: Record<string, { count: number; amount: number }>
  byMonth: Array<{ month: string; count: number; amount: number }>
  topCompanies: Array<{ company_name: string; count: number; amount: number }>
}

export default function InvoiceReportsPage() {
  // State
  const [invoices, setInvoices] = useState<InvoiceReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateeTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Load data
  React.useEffect(() => {
    fetchInvoices()
  }, [debouncedSearch, statusFilter, companyFilter, dateFrom, dateTo])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      if (companyFilter) params.set('company', companyFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('limit', '1000') // Get more data for reports
      
      const response = await fetch(`/api/reports/invoices?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch invoices')
      
      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary
  const summary: ReportSummary = useMemo(() => {
    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0)
    const pendingAmount = invoices
      .filter(inv => ['draft', 'finalized'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.total_amount, 0)

    // By status
    const byStatus = invoices.reduce((acc, inv) => {
      if (!acc[inv.status]) {
        acc[inv.status] = { count: 0, amount: 0 }
      }
      acc[inv.status].count++
      acc[inv.status].amount += inv.total_amount
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    // By month
    const monthlyData = invoices.reduce((acc, inv) => {
      const month = new Date(inv.invoice_date).toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'long' 
      })
      if (!acc[month]) {
        acc[month] = { count: 0, amount: 0 }
      }
      acc[month].count++
      acc[month].amount += inv.total_amount
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    const byMonth = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Top companies
    const companyData = invoices.reduce((acc, inv) => {
      if (!acc[inv.company_name]) {
        acc[inv.company_name] = { count: 0, amount: 0 }
      }
      acc[inv.company_name].count++
      acc[inv.company_name].amount += inv.total_amount
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    const topCompanies = Object.entries(companyData)
      .map(([company_name, data]) => ({ company_name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      byStatus,
      byMonth,
      topCompanies
    }
  }, [invoices])

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      setExporting(true)
      
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      if (companyFilter) params.set('company', companyFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('format', format)
      
      const response = await fetch(`/api/reports/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')
      
      // Download file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `invoice-report-${timestamp}.${format === 'excel' ? 'xlsx' : format}`
      
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
    setDateFrom('')
    setDateeTo('')
    setStatusFilter('')
    setCompanyFilter('')
    setSearchQuery('')
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: INVOICE_STATUS_LABELS.draft },
    { value: 'finalized', label: INVOICE_STATUS_LABELS.finalized },
    { value: 'paid', label: INVOICE_STATUS_LABELS.paid },
    { value: 'cancelled', label: INVOICE_STATUS_LABELS.cancelled }
  ]

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'finalized': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Invoice Reports"
        description="Analyze invoice data and generate reports"
        action={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              loading={exporting}
              disabled={invoices.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              loading={exporting}
              disabled={invoices.length === 0}
            >
              Export Excel
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              loading={exporting}
              disabled={invoices.length === 0}
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
            <div className="text-2xl font-bold text-blue-600">{summary.totalInvoices}</div>
            <p className="text-sm text-gray-500">Total Invoices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.totalAmount)}
            </div>
            <p className="text-sm text-gray-500">Total Amount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(summary.paidAmount)}
            </div>
            <p className="text-sm text-gray-500">Paid Amount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-orange-600">
              {formatCurrency(summary.pendingAmount)}
            </div>
            <p className="text-sm text-gray-500">Pending Amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="Filter by status"
            />
            
            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            
            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateeTo(e.target.value)}
            />
            
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.byStatus).map(([status, data]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusBadgeColor(status)}>
                      {INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS]}
                    </Badge>
                    <span className="text-sm text-gray-600">({data.count})</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(data.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topCompanies.slice(0, 5).map((company, index) => (
                <div key={company.company_name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {company.company_name}
                    </span>
                    <span className="text-xs text-gray-500">({company.count})</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(company.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Month</th>
                  <th className="text-right py-2">Invoices</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.byMonth.map((month) => (
                  <tr key={month.month} className="border-b">
                    <td className="py-2">{month.month}</td>
                    <td className="py-2 text-right">{month.count}</td>
                    <td className="py-2 text-right">{formatCurrency(month.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invoices found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            {invoice.line_count} line{invoice.line_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-[200px] truncate">
                          {invoice.company_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadgeColor(invoice.status)}>
                          {INVOICE_STATUS_LABELS[invoice.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.created_by_name}
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