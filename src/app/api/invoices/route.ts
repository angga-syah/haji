// app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, invoiceSchema, invoiceSearchSchema } from '@/lib/validation'
import { PAGINATION } from '@/lib/constants'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permission
    const user = await requirePermission(request, 'invoices', 'read')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString()), PAGINATION.MAX_LIMIT)
    const offset = parseInt(searchParams.get('offset') || PAGINATION.DEFAULT_OFFSET.toString())
    const status = searchParams.get('status')
    const company_id = searchParams.get('company_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    
    // Build query conditions based on user role
    let whereClause = ''
    const queryParams: any[] = []
    let paramIndex = 1
    
    // Role-based filtering
    if (user.role === 'finance_staff') {
      // Finance staff can only see their own invoices
      whereClause = `i.created_by = $${paramIndex}`
      queryParams.push(user.id)
      paramIndex++
    }
    // Admin and supervisor can see all invoices
    
    // Additional filters
    if (status) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `i.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }
    
    if (company_id) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `i.company_id = $${paramIndex}`
      queryParams.push(company_id)
      paramIndex++
    }
    
    if (date_from) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `i.invoice_date >= $${paramIndex}`
      queryParams.push(date_from)
      paramIndex++
    }
    
    if (date_to) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `i.invoice_date <= $${paramIndex}`
      queryParams.push(date_to)
      paramIndex++
    }
    
    if (query) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `(i.invoice_number ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`
      queryParams.push(`%${query}%`)
      paramIndex++
    }
    
    // Build final query
    const sql = `
      SELECT 
        i.*,
        c.company_name,
        c.npwp,
        c.address as company_address,
        COUNT(il.id) as line_count,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN invoice_lines il ON i.id = il.invoice_id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN profiles p ON i.created_by = p.id
      ${whereClause ? 'WHERE ' + whereClause : ''}
      GROUP BY i.id, c.company_name, c.npwp, c.address, u.email, p.full_name
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    queryParams.push(limit, offset)
    
    const invoices = await Database.query(sql, queryParams)
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      ${whereClause ? 'WHERE ' + whereClause : ''}
    `
    
    const countResult = await Database.query(countSql, queryParams.slice(0, -2)) // Remove limit/offset
    const total = parseInt(countResult[0]?.total || '0')

    return NextResponse.json({
      invoices,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'invoices', 'create')
    const body = await request.json()
    
    // Validate input
    const validatedData = validateInput(invoiceSchema, body)
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber()

    // Create invoice with transaction
    const invoice = await Database.transaction(async (client) => {
      // Insert invoice
      const invoiceResult = await client.query(`
        INSERT INTO invoices (
          invoice_number, company_id, invoice_date, notes, 
          bank_account_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, [
        invoiceNumber,
        validatedData.company_id,
        validatedData.invoice_date,
        validatedData.notes || null,
        validatedData.bank_account_id || null,
        user.id
      ])
      
      const newInvoice = invoiceResult.rows[0]
      
      // Insert lines if provided
      if (validatedData.lines && validatedData.lines.length > 0) {
        let subtotal = 0
        
        for (const [index, line] of validatedData.lines.entries()) {
          // Get job description price if not custom
          let unitPrice = line.custom_price
          if (!line.custom_price) {
            const jobResult = await client.query(
              'SELECT price FROM job_descriptions WHERE id = $1 AND is_active = true',
              [line.job_description_id]
            )
            if (jobResult.rows.length === 0) {
              throw new Error(`Job description not found: ${line.job_description_id}`)
            }
            unitPrice = jobResult.rows[0].price
          }
          
          const lineTotal = unitPrice * line.quantity
          subtotal += lineTotal
          
          await client.query(`
            INSERT INTO invoice_lines (
              invoice_id, baris, line_order, tka_id, job_description_id,
              custom_job_name, custom_job_description, custom_price,
              quantity, unit_price, line_total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            newInvoice.id,
            line.baris || index + 1,
            index + 1,
            line.tka_id,
            line.job_description_id,
            line.custom_job_name || null,
            line.custom_job_description || null,
            line.custom_price || null,
            line.quantity,
            unitPrice,
            lineTotal
          ])
        }
        
        // Calculate VAT and total
        const vatAmount = calculateVAT(subtotal)
        const totalAmount = subtotal + vatAmount
        
        // Update invoice totals
        await client.query(`
          UPDATE invoices 
          SET subtotal = $1, vat_amount = $2, total_amount = $3, updated_at = NOW()
          WHERE id = $4
        `, [subtotal, vatAmount, totalAmount, newInvoice.id])
        
        newInvoice.subtotal = subtotal
        newInvoice.vat_amount = vatAmount
        newInvoice.total_amount = totalAmount
      }
      
      return newInvoice
    })

    return NextResponse.json({ invoice }, { status: 201 })

  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

// Helper function to generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // Get or create sequence
  let sequence = await Database.findOne('invoice_sequences', { year, month })
  
  if (!sequence) {
    sequence = await Database.insert('invoice_sequences', {
      year,
      month,
      current_number: 1
    })
  } else {
    sequence = await Database.update(
      'invoice_sequences',
      { current_number: sequence.current_number + 1, updated_at: new Date().toISOString() },
      { year, month }
    )
  }
  
  const paddedNumber = sequence.current_number.toString().padStart(3, '0')
  const shortYear = year.toString().slice(-2)
  const paddedMonth = month.toString().padStart(2, '0')
  
  return `INV-${shortYear}-${paddedMonth}-${paddedNumber}`
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