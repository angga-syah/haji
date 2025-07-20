// src/app/api/invoices/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { validateInput, invoiceSchema } from '@/lib/validation'
import { InvoiceCalculator } from '@/lib/calculations/invoice'
import type { CreateInvoiceData, CreateInvoiceLineData } from '@/lib/types'

export const runtime = 'nodejs'

interface ImportInvoiceData {
  invoice_number?: string
  company_name: string
  company_npwp?: string
  invoice_date: string
  notes?: string
  bank_account?: string
  lines: Array<{
    tka_name: string
    tka_passport: string
    job_name: string
    custom_job_name?: string
    custom_price?: number
    quantity: number
    baris?: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const user = await requirePermission(request, 'invoices', 'create')
    
    const formData = await request.formData()
    const dataString = formData.get('data') as string
    
    if (!dataString) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      )
    }

    let importData: ImportInvoiceData[]
    try {
      importData = JSON.parse(dataString)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON data' },
        { status: 400 }
      )
    }

    if (!Array.isArray(importData) || importData.length === 0) {
      return NextResponse.json(
        { error: 'Data must be a non-empty array' },
        { status: 400 }
      )
    }

    // Limit import size
    if (importData.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 invoices allowed per import' },
        { status: 400 }
      )
    }

    const results = {
      total: importData.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{
        row: number
        field: string
        message: string
        data: ImportInvoiceData
      }>
    }

    // Process imports in transaction
    await Database.transaction(async (client) => {
      for (let i = 0; i < importData.length; i++) {
        const rowNumber = i + 1
        const row = importData[i]

        try {
          // Validate required fields
          if (!row.company_name) {
            throw new Error('Company name is required')
          }
          
          if (!row.invoice_date) {
            throw new Error('Invoice date is required')
          }
          
          if (!row.lines || row.lines.length === 0) {
            throw new Error('At least one line item is required')
          }

          // Find or validate company
          let company
          if (row.company_npwp) {
            company = await client.query(
              'SELECT id FROM companies WHERE npwp = $1 AND is_active = true',
              [row.company_npwp]
            )
          }
          
          if (!company?.rows.length) {
            company = await client.query(
              'SELECT id FROM companies WHERE company_name ILIKE $1 AND is_active = true',
              [row.company_name]
            )
          }

          if (!company?.rows.length) {
            throw new Error(`Company not found: ${row.company_name}`)
          }

          const companyId = company.rows[0].id

          // Find bank account if specified
          let bankAccountId = null
          if (row.bank_account) {
            const bankAccount = await client.query(
              'SELECT id FROM bank_accounts WHERE bank_name ILIKE $1 OR account_name ILIKE $1',
              [row.bank_account]
            )
            if (bankAccount.rows.length > 0) {
              bankAccountId = bankAccount.rows[0].id
            }
          }

          // Generate invoice number if not provided
          let invoiceNumber = row.invoice_number
          if (!invoiceNumber) {
            invoiceNumber = await generateInvoiceNumber(client)
          } else {
            // Check for duplicate invoice number
            const existing = await client.query(
              'SELECT id FROM invoices WHERE invoice_number = $1',
              [invoiceNumber]
            )
            if (existing.rows.length > 0) {
              throw new Error(`Invoice number already exists: ${invoiceNumber}`)
            }
          }

          // Create invoice
          const invoiceResult = await client.query(`
            INSERT INTO invoices (
              invoice_number, company_id, invoice_date, notes, 
              bank_account_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
          `, [
            invoiceNumber,
            companyId,
            row.invoice_date,
            row.notes || null,
            bankAccountId,
            user.id
          ])

          const newInvoice = invoiceResult.rows[0]
          let subtotal = 0

          // Process line items
          for (const [lineIndex, lineData] of row.lines.entries()) {
            // Find TKA worker
            const tkaWorker = await client.query(
              'SELECT id FROM tka_workers WHERE (nama ILIKE $1 OR passport = $2) AND is_active = true',
              [lineData.tka_name, lineData.tka_passport]
            )

            if (!tkaWorker.rows.length) {
              throw new Error(`TKA worker not found: ${lineData.tka_name} (${lineData.tka_passport})`)
            }

            const tkaId = tkaWorker.rows[0].id

            // Find job description
            let jobDescription
            if (lineData.job_name) {
              jobDescription = await client.query(
                'SELECT id, price FROM job_descriptions WHERE company_id = $1 AND job_name ILIKE $2 AND is_active = true',
                [companyId, lineData.job_name]
              )
            }

            if (!jobDescription?.rows.length) {
              throw new Error(`Job description not found: ${lineData.job_name} for company ${row.company_name}`)
            }

            const job = jobDescription.rows[0]
            const unitPrice = lineData.custom_price || job.price
            const quantity = lineData.quantity || 1
            const lineTotal = unitPrice * quantity

            subtotal += lineTotal

            // Insert line item
            await client.query(`
              INSERT INTO invoice_lines (
                invoice_id, baris, line_order, tka_id, job_description_id,
                custom_job_name, custom_price, quantity, unit_price, line_total
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              newInvoice.id,
              lineData.baris || lineIndex + 1,
              lineIndex + 1,
              tkaId,
              job.id,
              lineData.custom_job_name || null,
              lineData.custom_price || null,
              quantity,
              unitPrice,
              lineTotal
            ])
          }

          // Calculate and update totals
          const vatAmount = InvoiceCalculator.calculateVAT(subtotal)
          const totalAmount = subtotal + vatAmount

          await client.query(`
            UPDATE invoices 
            SET subtotal = $1, vat_amount = $2, total_amount = $3, updated_at = NOW()
            WHERE id = $4
          `, [subtotal, vatAmount, totalAmount, newInvoice.id])

          results.imported++

        } catch (error) {
          console.error(`Error importing invoice row ${rowNumber}:`, error)
          results.errors.push({
            row: rowNumber,
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            data: row
          })
          results.failed++
        }
      }
    })

    return NextResponse.json({
      message: `Import completed. ${results.imported} invoices imported, ${results.failed} failed.`,
      ...results
    }, { status: 200 })

  } catch (error) {
    console.error('Invoice import API error:', error)
    
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

export async function GET(request: NextRequest) {
  try {
    // Verify permission to read import template
    await requirePermission(request, 'invoices', 'read')
    
    // Get import template/example
    const template = {
      headers: [
        'invoice_number', 'company_name', 'company_npwp', 'invoice_date', 
        'notes', 'bank_account', 'tka_name', 'tka_passport', 'job_name', 
        'custom_job_name', 'custom_price', 'quantity', 'baris'
      ],
      example: [
        {
          invoice_number: 'INV-24-12-001',
          company_name: 'PT Teknologi Maju Indonesia',
          company_npwp: '123456789012345',
          invoice_date: '2024-12-01',
          notes: 'Monthly consultation services',
          bank_account: 'Bank Central Asia (BCA)',
          lines: [
            {
              tka_name: 'John Smith',
              tka_passport: 'A12345678',
              job_name: 'Technical Consultant',
              custom_job_name: '',
              custom_price: '',
              quantity: 1,
              baris: 1
            },
            {
              tka_name: 'John Smith',
              tka_passport: 'A12345678',
              job_name: 'Project Manager',
              custom_job_name: '',
              custom_price: '',
              quantity: 1,
              baris: 2
            }
          ]
        }
      ],
      validation_rules: {
        invoice_number: 'Optional. Auto-generated if not provided. Must be unique.',
        company_name: 'Required. Must match existing active company.',
        company_npwp: 'Optional. Used for company lookup if provided.',
        invoice_date: 'Required. Format: YYYY-MM-DD.',
        notes: 'Optional. Invoice notes.',
        bank_account: 'Optional. Bank name for payment details.',
        lines: 'Required. Array of line items.',
        tka_name: 'Required. TKA worker name.',
        tka_passport: 'Required. TKA worker passport number.',
        job_name: 'Required. Must match existing job description for the company.',
        custom_job_name: 'Optional. Override job name.',
        custom_price: 'Optional. Override default job price.',
        quantity: 'Required. Default: 1.',
        baris: 'Optional. Line grouping number. Default: auto-increment.'
      }
    }

    return NextResponse.json({
      template,
      limits: {
        max_invoices: 100,
        max_lines_per_invoice: 50,
        supported_date_format: 'YYYY-MM-DD'
      }
    })

  } catch (error) {
    console.error('Invoice import template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate invoice number
async function generateInvoiceNumber(client?: any): Promise<string> {
  const dbClient = client || Database
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // Get or create sequence
  const sequenceResult = await dbClient.query(
    'SELECT current_number FROM invoice_sequences WHERE year = $1 AND month = $2',
    [year, month]
  )
  
  let currentNumber = 1
  
  if (sequenceResult.rows.length > 0) {
    currentNumber = sequenceResult.rows[0].current_number + 1
    await dbClient.query(
      'UPDATE invoice_sequences SET current_number = $1, updated_at = NOW() WHERE year = $2 AND month = $3',
      [currentNumber, year, month]
    )
  } else {
    await dbClient.query(
      'INSERT INTO invoice_sequences (year, month, current_number) VALUES ($1, $2, $3)',
      [year, month, currentNumber]
    )
  }
  
  const paddedNumber = currentNumber.toString().padStart(3, '0')
  const shortYear = year.toString().slice(-2)
  const paddedMonth = month.toString().padStart(2, '0')
  
  return `INV-${shortYear}-${paddedMonth}-${paddedNumber}`
}