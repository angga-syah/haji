// app/api/companies/[id]/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'job_descriptions', 'read')
    
    const { id: companyId } = params
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'
    
    // Build query conditions
    let whereClause = 'company_id = $1'
    const queryParams = [companyId]
    
    if (activeOnly) {
      whereClause += ' AND is_active = true'
    }
    
    // Get job descriptions for the company
    const jobDescriptions = await Database.query(`
      SELECT 
        jd.*,
        c.company_name,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM job_descriptions jd
      JOIN companies c ON jd.company_id = c.id
      LEFT JOIN users u ON jd.created_by = u.id
      LEFT JOIN profiles p ON jd.created_by = p.id
      WHERE ${whereClause}
      ORDER BY jd.sort_order ASC, jd.job_name ASC
    `, queryParams)
    
    return NextResponse.json({
      job_descriptions: jobDescriptions
    })
    
  } catch (error) {
    console.error('Get company jobs error:', error)
    
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'job_descriptions', 'create')
    const { id: companyId } = params
    const body = await request.json()
    
    // Verify company exists
    const company = await Database.findOne('companies', { 
      id: companyId, 
      is_active: true 
    })
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    // Create job description
    const jobDescription = await Database.insert('job_descriptions', {
      company_id: companyId,
      job_name: body.job_name,
      job_description: body.job_description,
      price: body.price,
      sort_order: body.sort_order || 0,
      created_by: user.id
    })
    
    return NextResponse.json({
      job_description: jobDescription,
      message: 'Job description created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create company job error:', error)
    
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