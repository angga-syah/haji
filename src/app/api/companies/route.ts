// app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { validateInput, companySchema, searchParamsSchema } from '@/lib/validation'
import type { Company, CompanyWithJobs } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'companies', 'read')
    
    const { searchParams } = new URL(request.url)
    const {
      query,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = validateInput(searchParamsSchema, {
      query: searchParams.get('query'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      orderBy: searchParams.get('orderBy') || 'created_at',
      orderDirection: searchParams.get('orderDirection') || 'desc'
    })
    
    // Build query
    let sql = `
      SELECT 
        c.*,
        COUNT(DISTINCT jd.id) as job_count,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_amount
      FROM companies c
      LEFT JOIN job_descriptions jd ON c.id = jd.company_id AND jd.is_active = true
      LEFT JOIN invoices i ON c.id = i.company_id
      WHERE c.is_active = true
    `
    
    const queryParams: any[] = []
    
    // Add search filter
    if (query) {
      sql += ` AND (c.company_name ILIKE $${queryParams.length + 1} OR c.npwp ILIKE $${queryParams.length + 1})`
      queryParams.push(`%${query}%`)
    }
    
    sql += ` GROUP BY c.id ORDER BY c.${orderBy} ${orderDirection.toUpperCase()}`
    sql += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
    queryParams.push(limit, offset)
    
    const companies = await Database.query<CompanyWithJobs>(sql, queryParams)
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(*) as total FROM companies WHERE is_active = true`
    const countParams: any[] = []
    
    if (query) {
      countSql += ` AND (company_name ILIKE $1 OR npwp ILIKE $1)`
      countParams.push(`%${query}%`)
    }
    
    const countResult = await Database.query<{ total: number }>(countSql, countParams)
    const total = parseInt(countResult[0]?.total?.toString() || '0')
    
    return NextResponse.json({
      companies,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total
      }
    })
    
  } catch (error) {
    console.error('Get companies error:', error)
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
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

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'companies', 'create')
    
    const body = await request.json()
    const companyData = validateInput(companySchema, body)
    
    // Check for duplicate NPWP and IDTKU
    const existingNPWP = await Database.findOne('companies', { npwp: companyData.npwp })
    if (existingNPWP) {
      return NextResponse.json(
        { error: 'Company with this NPWP already exists' },
        { status: 400 }
      )
    }
    
    const existingIDTKU = await Database.findOne('companies', { idtku: companyData.idtku })
    if (existingIDTKU) {
      return NextResponse.json(
        { error: 'Company with this IDTKU already exists' },
        { status: 400 }
      )
    }
    
    const company = await Database.insert<Company>('companies', {
      ...companyData,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    return NextResponse.json({
      company,
      message: 'Company created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create company error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      
      if (error.message.includes('Validation error')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}