// src/app/(dashboard)/reports/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInvoiceStats, useExportInvoices } from '@/hooks/api/useInvoices'
import { useAuth } from '@/hooks/ui/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  BarChart3,
  PieChart,
  Filter,
  FileSpreadsheet,
  FileImage
} from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // State for date range filter
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')
  
  // API hooks
  const { data: statsData, isLoading } = useInvoiceStats(dateRange)
  const exportMutation = useExportInvoices()

  const stats = statsData || {
    total_invoices: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    by_status: {},
    by_month: []
  }

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        format: exportFormat,
        filters: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      })
      
      // Create download link
      const url = window.URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoices-report-${dateRange.from}-to-${dateRange.to}.${exportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const quickReports = [
    {
      title: 'Invoice Report',
      description: 'Detailed invoice analysis with line items',
      icon: FileText,
      color: 'blue',
      action: () => router.push('/reports/invoices')
    },
    {
      title: 'Company Report', 
      description: 'Company-wise revenue and invoice summary',
      icon: BarChart3,
      color: 'green',
      action: () => router.push('/reports/companies')
    },
    {
      title: 'Monthly Trends',
      description: 'Month-over-month performance analysis',
      icon: TrendingUp,
      color: 'purple',
      action: () => console.log('Monthly trends coming soon')
    },
    {
      title: 'Payment Status',
      description: 'Outstanding and paid invoices overview',
      icon: DollarSign,
      color: 'orange',
      action: () => console.log('Payment status coming soon')
    }
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <PageTitle 
          title="Reports & Analytics" 
          subtitle="Business insights and data exports"
        />

        {/* Date Range Filter */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select
                value={exportFormat}
                onValueChange={(value: 'pdf' | 'excel' | 'csv') => setExportFormat(value)}
              >
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </Select>
              
              <Button 
                onClick={handleExport}
                disabled={exportMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                {exportMutation.isPending ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_invoices}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.total_amount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Gross revenue for period
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.paid_amount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {((stats.paid_amount / stats.total_amount) * 100 || 0).toFixed(1)}% of total
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.pending_amount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Awaiting payment
            </p>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Invoice Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(stats.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'paid' ? 'bg-green-500' :
                      status === 'finalized' ? 'bg-blue-500' :
                      status === 'draft' ? 'bg-gray-500' :
                      'bg-red-500'
                    }`} />
                    <span className="capitalize">{status}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
            {stats.by_month.length > 0 ? (
              <div className="space-y-3">
                {stats.by_month.slice(-6).map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{month.month}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{month.count} invoices</span>
                      <span className="font-medium">{formatCurrency(month.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available for selected period</p>
            )}
          </Card>
        </div>

        {/* Quick Reports */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Quick Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickReports.map((report, index) => (
              <div
                key={index}
                onClick={report.action}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 bg-${report.color}-100`}>
                  <report.icon className={`w-6 h-6 text-${report.color}-600`} />
                </div>
                <h4 className="font-medium mb-1">{report.title}</h4>
                <p className="text-sm text-gray-600">{report.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Export Options */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Export Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-medium">Excel Export</h4>
                <p className="text-sm text-gray-600">Detailed data with formulas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="font-medium">CSV Export</h4>
                <p className="text-sm text-gray-600">Raw data for analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileImage className="w-8 h-8 text-red-600" />
              <div>
                <h4 className="font-medium">PDF Report</h4>
                <p className="text-sm text-gray-600">Formatted summary report</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  )
}