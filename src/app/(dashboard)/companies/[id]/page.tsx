// app/(dashboard)/companies/[id]/page.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useCompany } from '@/hooks/api/useCompanies'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CompanyDetailPageProps {
  params: { id: string }
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { data: companyData, isLoading, error } = useCompany(params.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !companyData?.company) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">Company not found or you don't have permission to view it.</p>
            <Link href="/companies" className="mt-4 inline-block">
              <Button variant="outline">Back to Companies</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const company = companyData.company

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title={company.company_name}
        description="Company details and information"
        action={
          <RoleGuard allowedRoles={['admin', 'finance_staff']}>
            <div className="flex space-x-2">
              <Link href={`/companies/${company.id}/edit`}>
                <Button variant="outline">Edit Company</Button>
              </Link>
              <Link href="/companies">
                <Button variant="secondary">Back to List</Button>
              </Link>
            </div>
          </RoleGuard>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Name</label>
                  <p className="text-lg font-medium">{company.company_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">NPWP</label>
                  <p className="font-mono">{company.npwp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">IDTKU</label>
                  <p className="font-mono">{company.idtku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>
                    <Badge variant={company.is_active ? 'success' : 'destructive'}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="whitespace-pre-line">{company.address}</p>
              </div>

              {(company.contact_phone || company.contact_email) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.contact_phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p>{company.contact_phone}</p>
                    </div>
                  )}
                  {company.contact_email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p>{company.contact_email}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p>{formatDate(company.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p>{formatDate(company.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {company.job_count || 0}
                </div>
                <div className="text-sm text-gray-500">Job Descriptions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {company.invoice_count || 0}
                </div>
                <div className="text-sm text-gray-500">Total Invoices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(company.total_amount || 0)}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/job-descriptions?company_id=${company.id}`} className="block">
                <Button variant="outline" className="w-full">
                  View Job Descriptions
                </Button>
              </Link>
              <Link href={`/invoices?company_id=${company.id}`} className="block">
                <Button variant="outline" className="w-full">
                  View Invoices
                </Button>
              </Link>
              <RoleGuard allowedRoles={['admin', 'finance_staff']}>
                <Link href={`/invoices/create?company_id=${company.id}`} className="block">
                  <Button className="w-full">
                    Create Invoice
                  </Button>
                </Link>
              </RoleGuard>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job Descriptions */}
      {company.job_descriptions && company.job_descriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Job Descriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.job_descriptions.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{job.job_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{job.job_description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-lg">{formatCurrency(job.price)}</div>
                      <Badge variant="secondary" className="mt-1">
                        Order: {job.sort_order}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}