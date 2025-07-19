// app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/common/PageTitle'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '@/lib/constants'

interface DashboardStats {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  recentInvoices: Array<{
    id: string
    invoice_number: string
    company_name: string
    total_amount: number
    status: string
    invoice_date: string
  }>
  topCompanies: Array<{
    company_name: string
    total_amount: number
    invoice_count: number
  }>
}

export default function DashboardPage() {
  const { user, hasRole } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch dashboard statistics
      const [invoicesRes, recentRes] = await Promise.all([
        fetch('/api/invoices?limit=1000'), // Get all for stats
        fetch('/api/invoices?limit=5&orderBy=created_at&orderDirection=desc') // Recent invoices
      ])

      if (!invoicesRes.ok || !recentRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [invoicesData, recentData] = await Promise.all([
        invoicesRes.json(),
        recentRes.json()
      ])

      const allInvoices = invoicesData.invoices || []
      const recentInvoices = recentData.invoices || []

      // Calculate statistics
      const totalInvoices = allInvoices.length
      const totalAmount = allInvoices.reduce((sum: number, inv: any) => sum + inv.total_amount, 0)
      const paidAmount = allInvoices
        .filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + inv.total_amount, 0)
      const pendingAmount = totalAmount - paidAmount

      // Group by company for top companies
      const companyStats = allInvoices.reduce((acc: any, inv: any) => {
        if (!acc[inv.company_name]) {
          acc[inv.company_name] = {
            company_name: inv.company_name,
            total_amount: 0,
            invoice_count: 0
          }
        }
        acc[inv.company_name].total_amount += inv.total_amount
        acc[inv.company_name].invoice_count += 1
        return acc
      }, {})

      const topCompanies = Object.values(companyStats)
        .sort((a: any, b: any) => b.total_amount - a.total_amount)
        .slice(0, 5)

      setStats({
        totalInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        recentInvoices,
        topCompanies
      })

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle title="Dashboard" description="Overview of your invoice management system" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageTitle title="Dashboard" description="Overview of your invoice management system" />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardStats}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle 
        title={`Welcome back, ${user?.full_name}`}
        description="Here's what's happening with your invoices today"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{stats?.totalInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.paidAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.pendingAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentInvoices.length ? (
                stats.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-600">{invoice.company_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                      <Badge 
                        variant={invoice.status === 'paid' ? 'success' : 'default'}
                        className="text-xs"
                      >
                        {INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No invoices found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Top Companies</CardTitle>
            <Link href="/companies">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topCompanies.length ? (
                stats.topCompanies.map((company, index) => (
                  <div key={company.company_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{company.company_name}</p>
                      <p className="text-sm text-gray-600">{company.invoice_count} invoices</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(company.total_amount)}</p>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No companies found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hasRole(['admin', 'finance_staff']) && (
              <Link href="/invoices/create">
                <Button className="w-full" variant="default">
                  Create Invoice
                </Button>
              </Link>
            )}
            
            {hasRole(['admin', 'finance_staff']) && (
              <Link href="/companies/create">
                <Button className="w-full" variant="outline">
                  Add Company
                </Button>
              </Link>
            )}
            
            {hasRole(['admin', 'finance_staff']) && (
              <Link href="/tka-workers/create">
                <Button className="w-full" variant="outline">
                  Add TKA Worker
                </Button>
              </Link>
            )}
            
            <Link href="/reports">
              <Button className="w-full" variant="outline">
                View Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}