// app/api/companies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { validateInput, companySchema } from '@/lib/validation'
import type { Company } from '@/lib/types'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'companies', 'read')
    
    const companyId = params.id
    
    // Get company with related data
    const companyResult = await Database.query<CompanyWithJobs>(`
      SELECT 
        c.*,
        COUNT(DISTINCT jd.id) as job_count,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_amount
      FROM companies c
      LEFT JOIN job_descriptions jd ON c.id = jd.company_id AND jd.is_active = true
      LEFT JOIN invoices i ON c.id = i.company_id
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id
    `, [companyId])
    
    if (companyResult.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    const company = companyResult[0]
    
    // Get job descriptions
    const jobDescriptions = await Database.findMany('job_descriptions', 
      { company_id: companyId, is_active: true },
      { orderBy: 'sort_order, job_name' }
    )
    
    return NextResponse.json({
      company: {
        ...company,
        job_descriptions: jobDescriptions
      }
    })
    
  } catch (error) {
    console.error('Get company error:', error)
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'companies', 'update')
    
    const companyId = params.id
    const body = await request.json()
    const companyData = validateInput(companySchema, body)
    
    // Check if company exists
    const existingCompany = await Database.findOne('companies', { 
      id: companyId, 
      is_active: true 
    })
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    // Check for duplicate NPWP and IDTKU (excluding current company)
    const existingNPWP = await Database.query(`
      SELECT id FROM companies 
      WHERE npwp = $1 AND id != $2 AND is_active = true
    `, [companyData.npwp, companyId])
    
    if (existingNPWP.length > 0) {
      return NextResponse.json(
        { error: 'Another company with this NPWP already exists' },
        { status: 400 }
      )
    }
    
    const existingIDTKU = await Database.query(`
      SELECT id FROM companies 
      WHERE idtku = $1 AND id != $2 AND is_active = true
    `, [companyData.idtku, companyId])
    
    if (existingIDTKU.length > 0) {
      return NextResponse.json(
        { error: 'Another company with this IDTKU already exists' },
        { status: 400 }
      )
    }
    
    const updatedCompany = await Database.update<Company>(
      'companies',
      {
        ...companyData,
        updated_at: new Date().toISOString()
      },
      { id: companyId }
    )
    
    return NextResponse.json({
      company: updatedCompany,
      message: 'Company updated successfully'
    })
    
  } catch (error) {
    console.error('Update company error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'companies', 'delete')
    
    const companyId = params.id
    
    // Check if company exists
    const existingCompany = await Database.findOne('companies', { 
      id: companyId, 
      is_active: true 
    })
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    // Check if company has any invoices
    const invoiceCount = await Database.query(`
      SELECT COUNT(*) as count FROM invoices WHERE company_id = $1
    `, [companyId])
    
    if (parseInt(invoiceCount[0]?.count?.toString() || '0') > 0) {
      return NextResponse.json(
        { error: 'Cannot delete company with existing invoices. Deactivate instead.' },
        { status: 400 }
      )
    }
    
    // Soft delete (set is_active to false)
    await Database.update(
      'companies',
      { 
        is_active: false,
        updated_at: new Date().toISOString()
      },
      { id: companyId }
    )
    
    // Also deactivate related job descriptions
    await Database.query(`
      UPDATE job_descriptions 
      SET is_active = false, updated_at = NOW() 
      WHERE company_id = $1
    `, [companyId])
    
    return NextResponse.json({
      message: 'Company deactivated successfully'
    })
    
  } catch (error) {
    console.error('Delete company error:', error)
    
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