// app/api/invoices/[id]/lines/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, invoiceLineSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'invoices', 'read')
    const { id } = params
    
    // Check if user can access this invoice
    const invoice = await Database.findOne('invoices', { id })
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    // Role-based access control
    if (user.role === 'finance_staff' && invoice.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Get invoice lines with details
    const lines = await Database.query(`
      SELECT 
        il.*,
        t.nama as tka_nama, t.passport as tka_passport,
        jd.job_name, jd.job_description, jd.price as job_price
      FROM invoice_lines il
      JOIN tka_workers t ON il.tka_id = t.id
      JOIN job_descriptions jd ON il.job_description_id = jd.id
      WHERE il.invoice_id = $1
      ORDER BY il.line_order
    `, [id])

    return NextResponse.json({
      lines: lines.map(line => ({
        ...line,
        tka_worker: {
          nama: line.tka_nama,
          passport: line.tka_passport
        },
        job_description: {
          job_name: line.job_name,
          job_description: line.job_description,
          price: line.job_price
        }
      }))
    })

  } catch (error) {
    console.error('Get invoice lines error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'invoices', 'update')
    const { id } = params
    const body = await request.json()
    
    // Check if invoice exists and user can access it
    const invoice = await Database.findOne('invoices', { id })
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    // Role-based access control
    if (user.role === 'finance_staff' && invoice.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Validate line data
    const lineData = validateInput(invoiceLineSchema, body)
    
    // Get job description price if not custom
    let unitPrice = lineData.custom_price
    if (!lineData.custom_price) {
      const job = await Database.findOne('job_descriptions', { 
        id: lineData.job_description_id,
        is_active: true 
      })
      if (!job) {
        return NextResponse.json(
          { error: 'Job description not found' },
          { status: 404 }
        )
      }
      unitPrice = job.price
    }
    
    // Get next line order
    const maxOrderResult = await Database.query(`
      SELECT COALESCE(MAX(line_order), 0) as max_order 
      FROM invoice_lines 
      WHERE invoice_id = $1
    `, [id])
    
    const nextLineOrder = maxOrderResult[0].max_order + 1
    const lineTotal = unitPrice * lineData.quantity
    
    // Add line with transaction
    const newLine = await Database.transaction(async (client) => {
      // Insert new line
      const lineResult = await client.query(`
        INSERT INTO invoice_lines (
          invoice_id, baris, line_order, tka_id, job_description_id,
          custom_job_name, custom_job_description, custom_price,
          quantity, unit_price, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        id,
        lineData.baris || nextLineOrder,
        nextLineOrder,
        lineData.tka_id,
        lineData.job_description_id,
        lineData.custom_job_name || null,
        lineData.custom_job_description || null,
        lineData.custom_price || null,
        lineData.quantity,
        unitPrice,
        lineTotal
      ])
      
      // Recalculate invoice totals
      await recalculateInvoiceTotals(client, id)
      
      return lineResult.rows[0]
    })

    return NextResponse.json({
      line: newLine,
      message: 'Line added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Add invoice line error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add line' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'invoices', 'update')
    const { id } = params
    const body = await request.json()
    
    // Check if invoice exists and user can access it
    const invoice = await Database.findOne('invoices', { id })
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    // Role-based access control
    if (user.role === 'finance_staff' && invoice.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Validate lines data
    const linesData = body.lines?.map((line: any) => validateInput(invoiceLineSchema, line)) || []
    
    // Replace all lines with transaction
    const result = await Database.transaction(async (client) => {
      // Delete existing lines
      await client.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [id])
      
      // Insert new lines
      const newLines = []
      let subtotal = 0
      
      for (const [index, lineData] of linesData.entries()) {
        // Get job description price if not custom
        let unitPrice = lineData.custom_price
        if (!lineData.custom_price) {
          const jobResult = await client.query(
            'SELECT price FROM job_descriptions WHERE id = $1 AND is_active = true',
            [lineData.job_description_id]
          )
          if (jobResult.rows.length === 0) {
            throw new Error(`Job description not found: ${lineData.job_description_id}`)
          }
          unitPrice = jobResult.rows[0].price
        }
        
        const lineTotal = unitPrice * lineData.quantity
        subtotal += lineTotal
        
        const lineResult = await client.query(`
          INSERT INTO invoice_lines (
            invoice_id, baris, line_order, tka_id, job_description_id,
            custom_job_name, custom_job_description, custom_price,
            quantity, unit_price, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          id,
          lineData.baris || index + 1,
          index + 1,
          lineData.tka_id,
          lineData.job_description_id,
          lineData.custom_job_name || null,
          lineData.custom_job_description || null,
          lineData.custom_price || null,
          lineData.quantity,
          unitPrice,
          lineTotal
        ])
        
        newLines.push(lineResult.rows[0])
      }
      
      // Recalculate invoice totals
      await recalculateInvoiceTotals(client, id)
      
      return newLines
    })

    return NextResponse.json({
      lines: result,
      message: 'Lines updated successfully'
    })

  } catch (error) {
    console.error('Update invoice lines error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lines' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

// Helper function to recalculate invoice totals
async function recalculateInvoiceTotals(client: any, invoiceId: string): Promise<void> {
  // Get all line totals
  const lines = await client.query(`
    SELECT unit_price, quantity FROM invoice_lines 
    WHERE invoice_id = $1
  `, [invoiceId])
  
  const subtotal = lines.rows.reduce((sum: number, line: any) => {
    return sum + (line.unit_price * line.quantity)
  }, 0)
  
  // Calculate VAT with special business rules
  const vatAmount = calculateVAT(subtotal)
  const totalAmount = subtotal + vatAmount
  
  // Update invoice
  await client.query(`
    UPDATE invoices 
    SET subtotal = $1, vat_amount = $2, total_amount = $3, updated_at = NOW()
    WHERE id = $4
  `, [subtotal, vatAmount, totalAmount, invoiceId])
}

// Helper function for VAT calculation with special business rules
function calculateVAT(subtotal: number, vatPercentage: number = 11): number {
  const vatAmount = (subtotal * vatPercentage) / 100
  const fractional = vatAmount - Math.floor(vatAmount)
  
  // Special business rule: .49 rounds down, .50+ rounds up
  if (Math.abs(fractional - 0.49) < 0.001) {
    return Math.floor(vatAmount)
  } else if (fractional >= 0.50) {
    return Math.ceil(vatAmount)
  } else {
    return Math.round(vatAmount)
  }
}