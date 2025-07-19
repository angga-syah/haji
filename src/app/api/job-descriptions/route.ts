// app/api/job-descriptions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, jobDescriptionSchema } from '@/lib/validation'
import { PAGINATION } from '@/lib/constants'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Job descriptions can be viewed by all authenticated users
    await requireAuth(request)
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const companyId = searchParams.get('company_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString()), PAGINATION.MAX_LIMIT)
    const offset = parseInt(searchParams.get('offset') || PAGINATION.DEFAULT_OFFSET.toString())
    const activeOnly = searchParams.get('active') === 'true'
    
    // Build query conditions
    let whereClause = ''
    const queryParams: any[] = []
    let paramIndex = 1
    
    if (activeOnly || activeOnly === undefined) {
      whereClause = 'jd.is_active = true'
    }
    
    if (companyId) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `jd.company_id = $${paramIndex}`
      queryParams.push(companyId)
      paramIndex++
    }
    
    if (query) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `(jd.job_name ILIKE $${paramIndex} OR jd.job_description ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`
      queryParams.push(`%${query}%`)
      paramIndex++
    }
    
    // Build final query
    const sql = `
      SELECT 
        jd.*,
        c.company_name,
        c.npwp,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM job_descriptions jd
      JOIN companies c ON jd.company_id = c.id
      LEFT JOIN users u ON jd.created_by = u.id
      LEFT JOIN profiles p ON jd.created_by = p.id
      ${whereClause ? 'WHERE ' + whereClause : ''}
      ORDER BY c.company_name ASC, jd.sort_order ASC, jd.job_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    queryParams.push(limit, offset)
    
    const jobDescriptions = await Database.query(sql, queryParams)
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM job_descriptions jd
      JOIN companies c ON jd.company_id = c.id
      ${whereClause ? 'WHERE ' + whereClause : ''}
    `
    
    const countResult = await Database.query(countSql, queryParams.slice(0, -2)) // Remove limit/offset
    const total = parseInt(countResult[0]?.total || '0')

    return NextResponse.json({
      job_descriptions: jobDescriptions,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get job descriptions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'job_descriptions', 'create')
    const body = await request.json()
    
    // Validate input
    const validatedData = validateInput(jobDescriptionSchema, body)
    
    // Check if company exists and is active
    const company = await Database.findOne('companies', { 
      id: validatedData.company_id, 
      is_active: true 
    })
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found or inactive' },
        { status: 404 }
      )
    }
    
    // Check for duplicate job name within the same company
    const existingJob = await Database.query(`
      SELECT id FROM job_descriptions 
      WHERE company_id = $1 AND job_name ILIKE $2 AND is_active = true
    `, [validatedData.company_id, validatedData.job_name])
    
    if (existingJob.length > 0) {
      return NextResponse.json(
        { error: 'A job description with this name already exists for this company' },
        { status: 409 }
      )
    }

    // Create job description
    const jobDescription = await Database.insert('job_descriptions', {
      company_id: validatedData.company_id,
      job_name: validatedData.job_name,
      job_description: validatedData.job_description,
      price: validatedData.price,
      sort_order: validatedData.sort_order || 0,
      created_by: user.id
    })

    return NextResponse.json({ 
      job_description: jobDescription,
      message: 'Job description created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create job description error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job description' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}