// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, invoiceSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'invoices', 'read')
    const { id } = params
    
    // Build query with role-based access control
    let whereClause = 'i.id = $1'
    const queryParams = [id]
    
    // Finance staff can only see their own invoices
    if (user.role === 'finance_staff') {
      whereClause += ' AND i.created_by = $2'
      queryParams.push(user.id)
    }
    
    // Get invoice with all related data
    const invoiceQuery = `
      SELECT 
        i.*,
        c.company_name, c.npwp, c.address as company_address,
        c.contact_phone as company_phone, c.contact_email as company_email,
        ba.bank_name, ba.account_number, ba.account_name,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN bank_accounts ba ON i.bank_account_id = ba.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN profiles p ON i.created_by = p.id
      WHERE ${whereClause}
    `
    
    const invoiceResult = await Database.query(invoiceQuery, queryParams)
    
    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    const invoice = invoiceResult[0]
    
    // Get invoice lines with TKA and job details
    const linesQuery = `
      SELECT 
        il.*,
        t.nama as tka_nama, t.passport as tka_passport,
        jd.job_name, jd.job_description, jd.price as job_price
      FROM invoice_lines il
      JOIN tka_workers t ON il.tka_id = t.id
      JOIN job_descriptions jd ON il.job_description_id = jd.id
      WHERE il.invoice_id = $1
      ORDER BY il.line_order
    `
    
    const lines = await Database.query(linesQuery, [id])
    
    // Combine invoice with lines
    const invoiceWithDetails = {
      ...invoice,
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
      })),
      company: {
        company_name: invoice.company_name,
        npwp: invoice.npwp,
        address: invoice.company_address,
        contact_phone: invoice.company_phone,
        contact_email: invoice.company_email
      },
      bank_account: invoice.bank_name ? {
        bank_name: invoice.bank_name,
        account_number: invoice.account_number,
        account_name: invoice.account_name
      } : null,
      created_by_info: {
        email: invoice.created_by_email,
        full_name: invoice.created_by_name
      }
    }

    return NextResponse.json({ invoice: invoiceWithDetails })

  } catch (error) {
    console.error('Get invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
    const existingInvoice = await Database.findOne('invoices', { id })
    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    // Role-based access control
    if (user.role === 'finance_staff' && existingInvoice.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own invoices' },
        { status: 403 }
      )
    }
    
    // Handle status updates (special permissions for payment)
    if (body.status) {
      if (body.status === 'paid' && !['admin', 'finance_supervisor'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Only admin and finance supervisor can mark invoices as paid' },
          { status: 403 }
        )
      }
      
      // Update only status
      const updatedInvoice = await Database.update(
        'invoices',
        { 
          status: body.status, 
          updated_at: new Date().toISOString() 
        },
        { id }
      )
      
      return NextResponse.json({ 
        invoice: updatedInvoice,
        message: `Invoice status updated to ${body.status}` 
      })
    }
    
    // Full invoice update
    const validatedData = validateInput(invoiceSchema, body)
    
    const updatedInvoice = await Database.transaction(async (client) => {
      // Update invoice
      const invoiceResult = await client.query(`
        UPDATE invoices 
        SET company_id = $1, invoice_date = $2, notes = $3, 
            bank_account_id = $4, updated_at = NOW()
        WHERE id = $5 
        RETURNING *
      `, [
        validatedData.company_id,
        validatedData.invoice_date,
        validatedData.notes || null,
        validatedData.bank_account_id || null,
        id
      ])
      
      const invoice = invoiceResult.rows[0]
      
      // Update lines if provided
      if (validatedData.lines) {
        // Delete existing lines
        await client.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [id])
        
        // Insert new lines
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
            id,
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
        `, [subtotal, vatAmount, totalAmount, id])
        
        invoice.subtotal = subtotal
        invoice.vat_amount = vatAmount
        invoice.total_amount = totalAmount
      }
      
      return invoice
    })

    return NextResponse.json({ 
      invoice: updatedInvoice,
      message: 'Invoice updated successfully' 
    })

  } catch (error) {
    console.error('Update invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update invoice' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'invoices', 'delete')
    const { id } = params
    
    // Check if invoice exists and user can access it
    const existingInvoice = await Database.findOne('invoices', { id })
    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    // Role-based access control
    if (user.role === 'finance_staff' && existingInvoice.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own invoices' },
        { status: 403 }
      )
    }
    
    // Don't allow deletion of paid invoices
    if (existingInvoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoices' },
        { status: 400 }
      )
    }
    
    // Delete invoice (cascade will delete lines)
    await Database.delete('invoices', { id })

    return NextResponse.json({ 
      message: 'Invoice deleted successfully' 
    })

  } catch (error) {
    console.error('Delete invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete invoice' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
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