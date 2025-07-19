// app/api/job-descriptions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, jobDescriptionSchema } from '@/lib/validation'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request)
    const { id } = params
    
    // Get job description with company info
    const jobDescription = await Database.query(`
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
      WHERE jd.id = $1
    `, [id])
    
    if (jobDescription.length === 0) {
      return NextResponse.json(
        { error: 'Job description not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      job_description: jobDescription[0] 
    })

  } catch (error) {
    console.error('Get job description error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'job_descriptions', 'update')
    const { id } = params
    const body = await request.json()
    
    // Check if job description exists
    const existing = await Database.findOne('job_descriptions', { id })
    if (!existing) {
      return NextResponse.json(
        { error: 'Job description not found' },
        { status: 404 }
      )
    }
    
    // Validate input
    const validatedData = validateInput(jobDescriptionSchema, body)
    
    // Check for duplicate name within same company (excluding current)
    const duplicateCheck = await Database.query(`
      SELECT id FROM job_descriptions 
      WHERE company_id = $1 AND job_name ILIKE $2 AND id != $3 AND is_active = true
    `, [validatedData.company_id, validatedData.job_name, id])
    
    if (duplicateCheck.length > 0) {
      return NextResponse.json(
        { error: 'A job description with this name already exists for this company' },
        { status: 409 }
      )
    }

    // Update job description
    const updatedJobDescription = await Database.update(
      'job_descriptions',
      {
        company_id: validatedData.company_id,
        job_name: validatedData.job_name,
        job_description: validatedData.job_description,
        price: validatedData.price,
        sort_order: validatedData.sort_order || existing.sort_order,
        updated_at: new Date().toISOString()
      },
      { id }
    )

    return NextResponse.json({ 
      job_description: updatedJobDescription,
      message: 'Job description updated successfully'
    })

  } catch (error) {
    console.error('Update job description error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update job description' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'job_descriptions', 'delete')
    const { id } = params
    
    // Check if job description exists
    const existing = await Database.findOne('job_descriptions', { id })
    if (!existing) {
      return NextResponse.json(
        { error: 'Job description not found' },
        { status: 404 }
      )
    }
    
    // Check if job description is used in any invoices
    const usageCheck = await Database.query(`
      SELECT COUNT(*) as count
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      WHERE il.job_description_id = $1 AND i.status != 'cancelled'
    `, [id])
    
    if (parseInt(usageCheck[0].count) > 0) {
      // Soft delete instead of hard delete
      await Database.update(
        'job_descriptions',
        { 
          is_active: false, 
          updated_at: new Date().toISOString() 
        },
        { id }
      )
      
      return NextResponse.json({ 
        message: 'Job description deactivated (used in existing invoices)' 
      })
    } else {
      // Hard delete if not used
      await Database.delete('job_descriptions', { id })
      
      return NextResponse.json({ 
        message: 'Job description deleted successfully' 
      })
    }

  } catch (error) {
    console.error('Delete job description error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete job description' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}