// src/app/api/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { generateReportPDF } from '@/lib/pdf/generator'
import { objectsToCSV } from '@/lib/import/csv'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify permission to export reports
    const user = await requirePermission(request, 'reports', 'export')
    
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const type = searchParams.get('type') || 'invoices'
    
    // Get filters
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const company = searchParams.get('company') || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo = searchParams.get('date_to') || ''
    const active = searchParams.get('active') || ''

    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported: csv, excel, pdf' },
        { status: 400 }
      )
    }

    if (!['invoices', 'companies', 'tka-workers'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Supported: invoices, companies, tka-workers' },
        { status: 400 }
      )
    }

    let data: any[] = []
    let filename = ''
    let columns: Array<{ header: string; accessor: string }> = []

    // Generate data based on type
    switch (type) {
      case 'invoices':
        ({ data, filename, columns } = await generateInvoiceExport(user, {
          search, status, company, dateFrom, dateTo
        }))
        break
        
      case 'companies':
        ({ data, filename, columns } = await generateCompanyExport(user, {
          search, active
        }))
        break
        
      case 'tka-workers':
        ({ data, filename, columns } = await generateTKAWorkerExport(user, {
          search, active
        }))
        break
    }

    // Generate file based on format
    const timestamp = new Date().toISOString().split('T')[0]
    const fullFilename = `${filename}-${timestamp}`

    if (format === 'csv') {
      const csvContent = objectsToCSV(data, {
        headers: columns.map(col => col.accessor),
        includeHeaders: true
      })
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fullFilename}.csv"`
        }
      })
    }
    
    else if (format === 'excel') {
      // For Excel, we'll return CSV with Excel MIME type as a simple implementation
      const csvContent = objectsToCSV(data, {
        headers: columns.map(col => col.accessor),
        includeHeaders: true
      })
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${fullFilename}.xlsx"`
        }
      })
    }
    
    else if (format === 'pdf') {
      const pdfBuffer = await generateReportPDF(
        `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        data,
        columns
      )
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fullFilename}.pdf"`
        }
      })
    }

  } catch (error) {
    console.error('Export API error:', error)
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}

// Generate invoice export data
async function generateInvoiceExport(
  user: any,
  filters: { search: string; status: string; company: string; dateFrom: string; dateTo: string }
) {
  // Build query conditions
  let whereClause = '1=1'
  const queryParams: any[] = []
  let paramIndex = 1

  // Role-based filtering
  if (user.role === 'finance_staff') {
    whereClause += ` AND i.created_by = $${paramIndex}`
    queryParams.push(user.id)
    paramIndex++
  }

  // Apply filters
  if (filters.search) {
    whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`
    queryParams.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.status) {
    whereClause += ` AND i.status = $${paramIndex}`
    queryParams.push(filters.status)
    paramIndex++
  }

  if (filters.company) {
    whereClause += ` AND c.company_name ILIKE $${paramIndex}`
    queryParams.push(`%${filters.company}%`)
    paramIndex++
  }

  if (filters.dateFrom) {
    whereClause += ` AND i.invoice_date >= $${paramIndex}`
    queryParams.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    whereClause += ` AND i.invoice_date <= $${paramIndex}`
    queryParams.push(filters.dateTo)
    paramIndex++
  }

  const query = `
    SELECT 
      i.invoice_number,
      c.company_name,
      c.npwp,
      i.invoice_date,
      i.status,
      i.subtotal,
      i.vat_percentage,
      i.vat_amount,
      i.total_amount,
      COUNT(il.id) as line_count,
      p.full_name as created_by,
      i.created_at,
      i.notes
    FROM invoices i
    JOIN companies c ON i.company_id = c.id
    LEFT JOIN invoice_lines il ON i.id = il.invoice_id
    JOIN profiles p ON i.created_by = p.id
    WHERE ${whereClause}
    GROUP BY i.id, c.company_name, c.npwp, p.full_name
    ORDER BY i.invoice_date DESC, i.created_at DESC
    LIMIT 5000
  `

  const data = await Database.query(query, queryParams)

  // Format data for export
  const formattedData = data.map(row => ({
    invoice_number: row.invoice_number,
    company_name: row.company_name,
    company_npwp: row.npwp,
    invoice_date: new Date(row.invoice_date).toLocaleDateString('id-ID'),
    status: row.status,
    subtotal: row.subtotal,
    vat_percentage: row.vat_percentage,
    vat_amount: row.vat_amount,
    total_amount: row.total_amount,
    line_count: row.line_count,
    created_by: row.created_by,
    created_date: new Date(row.created_at).toLocaleDateString('id-ID'),
    notes: row.notes || ''
  }))

  const columns = [
    { header: 'Invoice Number', accessor: 'invoice_number' },
    { header: 'Company Name', accessor: 'company_name' },
    { header: 'Company NPWP', accessor: 'company_npwp' },
    { header: 'Invoice Date', accessor: 'invoice_date' },
    { header: 'Status', accessor: 'status' },
    { header: 'Subtotal', accessor: 'subtotal' },
    { header: 'VAT %', accessor: 'vat_percentage' },
    { header: 'VAT Amount', accessor: 'vat_amount' },
    { header: 'Total Amount', accessor: 'total_amount' },
    { header: 'Line Count', accessor: 'line_count' },
    { header: 'Created By', accessor: 'created_by' },
    { header: 'Created Date', accessor: 'created_date' },
    { header: 'Notes', accessor: 'notes' }
  ]

  return {
    data: formattedData,
    filename: 'invoice-report',
    columns
  }
}

// Generate company export data
async function generateCompanyExport(
  user: any,
  filters: { search: string; active: string }
) {
  // Build query conditions
  let whereClause = 'c.id IS NOT NULL'
  const queryParams: any[] = []
  let paramIndex = 1

  if (filters.search) {
    whereClause += ` AND c.company_name ILIKE $${paramIndex}`
    queryParams.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.active) {
    whereClause += ` AND c.is_active = $${paramIndex}`
    queryParams.push(filters.active === 'true')
    paramIndex++
  }

  const query = `
    SELECT 
      c.company_name,
      c.npwp,
      c.idtku,
      c.address,
      c.contact_phone,
      c.contact_email,
      c.is_active,
      c.created_at,
      COUNT(DISTINCT jd.id) as job_count,
      COUNT(DISTINCT i.id) as invoice_count,
      COALESCE(SUM(i.total_amount), 0) as total_revenue,
      MAX(i.invoice_date) as last_invoice_date,
      p.full_name as created_by
    FROM companies c
    LEFT JOIN job_descriptions jd ON c.id = jd.company_id AND jd.is_active = true
    LEFT JOIN invoices i ON c.id = i.company_id
    JOIN profiles p ON c.created_by = p.id
    WHERE ${whereClause}
    GROUP BY c.id, p.full_name
    ORDER BY c.company_name
    LIMIT 5000
  `

  const data = await Database.query(query, queryParams)

  // Format data for export
  const formattedData = data.map(row => ({
    company_name: row.company_name,
    npwp: row.npwp,
    idtku: row.idtku,
    address: row.address,
    contact_phone: row.contact_phone || '',
    contact_email: row.contact_email || '',
    status: row.is_active ? 'Active' : 'Inactive',
    job_count: row.job_count,
    invoice_count: row.invoice_count,
    total_revenue: row.total_revenue,
    last_invoice_date: row.last_invoice_date ? new Date(row.last_invoice_date).toLocaleDateString('id-ID') : '',
    created_by: row.created_by,
    created_date: new Date(row.created_at).toLocaleDateString('id-ID')
  }))

  const columns = [
    { header: 'Company Name', accessor: 'company_name' },
    { header: 'NPWP', accessor: 'npwp' },
    { header: 'IDTKU', accessor: 'idtku' },
    { header: 'Address', accessor: 'address' },
    { header: 'Phone', accessor: 'contact_phone' },
    { header: 'Email', accessor: 'contact_email' },
    { header: 'Status', accessor: 'status' },
    { header: 'Job Descriptions', accessor: 'job_count' },
    { header: 'Invoice Count', accessor: 'invoice_count' },
    { header: 'Total Revenue', accessor: 'total_revenue' },
    { header: 'Last Invoice', accessor: 'last_invoice_date' },
    { header: 'Created By', accessor: 'created_by' },
    { header: 'Created Date', accessor: 'created_date' }
  ]

  return {
    data: formattedData,
    filename: 'company-report',
    columns
  }
}

// Generate TKA worker export data
async function generateTKAWorkerExport(
  user: any,
  filters: { search: string; active: string }
) {
  // Build query conditions
  let whereClause = 't.id IS NOT NULL'
  const queryParams: any[] = []
  let paramIndex = 1

  if (filters.search) {
    whereClause += ` AND (t.nama ILIKE $${paramIndex} OR t.passport ILIKE $${paramIndex})`
    queryParams.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.active) {
    whereClause += ` AND t.is_active = $${paramIndex}`
    queryParams.push(filters.active === 'true')
    paramIndex++
  }

  const query = `
    SELECT 
      t.nama,
      t.passport,
      t.divisi,
      t.jenis_kelamin,
      t.is_active,
      t.created_at,
      COUNT(DISTINCT il.invoice_id) as invoice_count,
      COUNT(DISTINCT fm.id) as family_count,
      COALESCE(SUM(il.line_total), 0) as total_earnings,
      p.full_name as created_by
    FROM tka_workers t
    LEFT JOIN invoice_lines il ON t.id = il.tka_id
    LEFT JOIN tka_family_members fm ON t.id = fm.tka_id AND fm.is_active = true
    JOIN profiles p ON t.created_by = p.id
    WHERE ${whereClause}
    GROUP BY t.id, p.full_name
    ORDER BY t.nama
    LIMIT 5000
  `

  const data = await Database.query(query, queryParams)

  // Format data for export
  const formattedData = data.map(row => ({
    nama: row.nama,
    passport: row.passport,
    divisi: row.divisi || '',
    jenis_kelamin: row.jenis_kelamin,
    status: row.is_active ? 'Active' : 'Inactive',
    invoice_count: row.invoice_count,
    family_count: row.family_count,
    total_earnings: row.total_earnings,
    created_by: row.created_by,
    created_date: new Date(row.created_at).toLocaleDateString('id-ID')
  }))

  const columns = [
    { header: 'Name', accessor: 'nama' },
    { header: 'Passport', accessor: 'passport' },
    { header: 'Division', accessor: 'divisi' },
    { header: 'Gender', accessor: 'jenis_kelamin' },
    { header: 'Status', accessor: 'status' },
    { header: 'Invoice Count', accessor: 'invoice_count' },
    { header: 'Family Members', accessor: 'family_count' },
    { header: 'Total Earnings', accessor: 'total_earnings' },
    { header: 'Created By', accessor: 'created_by' },
    { header: 'Created Date', accessor: 'created_date' }
  ]

  return {
    data: formattedData,
    filename: 'tka-worker-report',
    columns
  }
}