// src/app/api/reports/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify permission to access reports
    const user = await requirePermission(request, 'reports', 'read')
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const company = searchParams.get('company') || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo = searchParams.get('date_to') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build base query
    let whereClause = '1=1'
    const queryParams: any[] = []
    let paramIndex = 1

    // Role-based filtering
    if (user.role === 'finance_staff') {
      // Finance staff can only see their own invoices
      whereClause += ` AND i.created_by = $${paramIndex}`
      queryParams.push(user.id)
      paramIndex++
    }
    // Admin and supervisor can see all invoices

    // Search filter
    if (search) {
      whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Status filter
    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    // Company filter
    if (company) {
      whereClause += ` AND c.company_name ILIKE $${paramIndex}`
      queryParams.push(`%${company}%`)
      paramIndex++
    }

    // Date range filter
    if (dateFrom) {
      whereClause += ` AND i.invoice_date >= $${paramIndex}`
      queryParams.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      whereClause += ` AND i.invoice_date <= $${paramIndex}`
      queryParams.push(dateTo)
      paramIndex++
    }

    // Main query
    const invoicesQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.subtotal,
        i.vat_amount,
        i.total_amount,
        i.status,
        i.created_at,
        c.company_name,
        c.npwp,
        COUNT(il.id) as line_count,
        p.full_name as created_by_name,
        u.email as created_by_email
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN invoice_lines il ON i.id = il.invoice_id
      JOIN users u ON i.created_by = u.id
      JOIN profiles p ON i.created_by = p.id
      WHERE ${whereClause}
      GROUP BY i.id, c.company_name, c.npwp, p.full_name, u.email
      ORDER BY i.invoice_date DESC, i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)

    const invoices = await Database.query(invoicesQuery, queryParams)

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      JOIN users u ON i.created_by = u.id
      JOIN profiles p ON i.created_by = p.id
      WHERE ${whereClause}
    `

    const countResult = await Database.query(countQuery, queryParams.slice(0, -2)) // Remove limit/offset
    const total = parseInt(countResult[0]?.total || '0')

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(i.total_amount) as total_amount,
        SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN i.status IN ('draft', 'finalized') THEN i.total_amount ELSE 0 END) as pending_amount,
        i.status,
        COUNT(*) as status_count,
        SUM(i.total_amount) as status_amount
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      JOIN users u ON i.created_by = u.id
      WHERE ${whereClause}
      GROUP BY ROLLUP(i.status)
      ORDER BY i.status NULLS LAST
    `

    const summaryResult = await Database.query(summaryQuery, queryParams.slice(0, -2))

    // Parse summary data
    const summary = {
      total_invoices: 0,
      total_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
      by_status: {} as Record<string, { count: number; amount: number }>
    }

    summaryResult.forEach(row => {
      if (row.status === null) {
        // Total row
        summary.total_invoices = parseInt(row.status_count || '0')
        summary.total_amount = parseFloat(row.status_amount || '0')
      } else {
        // Status-specific row
        summary.by_status[row.status] = {
          count: parseInt(row.status_count || '0'),
          amount: parseFloat(row.status_amount || '0')
        }
      }
    })

    // Calculate paid and pending amounts from status breakdown
    summary.paid_amount = summary.by_status.paid?.amount || 0
    summary.pending_amount = (summary.by_status.draft?.amount || 0) + (summary.by_status.finalized?.amount || 0)

    return NextResponse.json({
      invoices,
      summary,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Reports API error:', error)
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get summary statistics only
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'reports', 'read')
    
    const body = await request.json()
    const { dateFrom, dateTo, status, company } = body

    // Build base query for summary
    let whereClause = '1=1'
    const queryParams: any[] = []
    let paramIndex = 1

    // Role-based filtering
    if (user.role === 'finance_staff') {
      whereClause += ` AND i.created_by = $${paramIndex}`
      queryParams.push(user.id)
      paramIndex++
    }

    // Filters
    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    if (company) {
      whereClause += ` AND c.company_name ILIKE $${paramIndex}`
      queryParams.push(`%${company}%`)
      paramIndex++
    }

    if (dateFrom) {
      whereClause += ` AND i.invoice_date >= $${paramIndex}`
      queryParams.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      whereClause += ` AND i.invoice_date <= $${paramIndex}`
      queryParams.push(dateTo)
      paramIndex++
    }

    // Monthly breakdown
    const monthlyQuery = `
      SELECT 
        TO_CHAR(i.invoice_date, 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM(i.total_amount) as amount
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE ${whereClause}
      GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `

    const monthlyData = await Database.query(monthlyQuery, queryParams)

    // Top companies
    const companiesQuery = `
      SELECT 
        c.company_name,
        COUNT(i.id) as count,
        SUM(i.total_amount) as amount
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE ${whereClause}
      GROUP BY c.company_name
      ORDER BY amount DESC
      LIMIT 10
    `

    const topCompanies = await Database.query(companiesQuery, queryParams)

    // Top TKA workers
    const tkaQuery = `
      SELECT 
        t.nama as tka_name,
        COUNT(DISTINCT i.id) as invoice_count,
        COUNT(il.id) as line_count,
        SUM(il.line_total) as total_amount
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      JOIN companies c ON i.company_id = c.id
      JOIN tka_workers t ON il.tka_id = t.id
      WHERE ${whereClause}
      GROUP BY t.nama
      ORDER BY total_amount DESC
      LIMIT 10
    `

    const topTKAWorkers = await Database.query(tkaQuery, queryParams)

    return NextResponse.json({
      monthly_breakdown: monthlyData,
      top_companies: topCompanies,
      top_tka_workers: topTKAWorkers
    })

  } catch (error) {
    console.error('Reports summary API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}