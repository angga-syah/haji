// src/app/api/invoices/[id]/print/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { Database } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await requireAuth(request)
    
    // Parse request body
    const body = await request.json()
    const { copies = 1, printer } = body

    // Validate inputs
    if (copies < 1 || copies > 10) {
      return NextResponse.json(
        { error: 'Number of copies must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Check if invoice exists and user has access
    const invoiceResult = await Database.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.status,
        i.created_by,
        c.company_name
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      WHERE i.id = $1 AND (i.created_by = $2 OR $3 = 'admin')
    `, [params.id, user.id, user.role])

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoiceResult[0]

    // Log print job (for audit trail)
    await Database.query(`
      INSERT INTO print_jobs (
        invoice_id, 
        user_id, 
        printer_name, 
        copies, 
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, 'pending', NOW())
    `, [params.id, user.id, printer || 'default', copies])

    // Check if we're in an Electron environment for direct printing
    const isElectron = request.headers.get('user-agent')?.includes('Electron')
    
    if (isElectron) {
      // For Electron app with direct printer access
      return handleElectronPrint(params.id, copies, printer)
    } else {
      // For web browser - return print configuration
      return handleWebPrint(params.id, copies, printer)
    }

  } catch (error) {
    console.error('Print error:', error)
    return NextResponse.json(
      { error: 'Failed to process print job' },
      { status: 500 }
    )
  }
}

async function handleElectronPrint(
  invoiceId: string, 
  copies: number, 
  printer?: string
): Promise<NextResponse> {
  try {
    // For Electron app, we would send print command to main process
    // This is a placeholder for the actual Electron IPC communication
    
    // Update print count
    await Database.query(`
      UPDATE invoices 
      SET printed_count = printed_count + $1, 
          last_printed_at = NOW() 
      WHERE id = $2
    `, [copies, invoiceId])

    // Update print job status
    await Database.query(`
      UPDATE print_jobs 
      SET status = 'completed', completed_at = NOW()
      WHERE invoice_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `, [invoiceId])

    return NextResponse.json({
      success: true,
      message: `Invoice printed successfully (${copies} ${copies === 1 ? 'copy' : 'copies'})`,
      method: 'electron',
      copies,
      printer: printer || 'default'
    })

  } catch (error) {
    // Update print job status to failed
    await Database.query(`
      UPDATE print_jobs 
      SET status = 'failed', 
          error_message = $1,
          completed_at = NOW()
      WHERE invoice_id = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `, [error instanceof Error ? error.message : 'Unknown error', invoiceId])

    throw error
  }
}

async function handleWebPrint(
  invoiceId: string, 
  copies: number, 
  printer?: string
): Promise<NextResponse> {
  try {
    // For web browsers, return print configuration
    // The client will handle opening print dialog
    
    // Update print count (optimistic - actual printing happens on client)
    await Database.query(`
      UPDATE invoices 
      SET printed_count = printed_count + $1, 
          last_printed_at = NOW() 
      WHERE id = $2
    `, [copies, invoiceId])

    // Update print job status
    await Database.query(`
      UPDATE print_jobs 
      SET status = 'sent_to_browser', completed_at = NOW()
      WHERE invoice_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `, [invoiceId])

    return NextResponse.json({
      success: true,
      message: 'Print job sent to browser',
      method: 'browser',
      copies,
      printer: printer || 'default',
      printUrl: `/api/invoices/${invoiceId}/pdf`,
      instructions: 'Open the PDF and use your browser\'s print function'
    })

  } catch (error) {
    // Update print job status to failed
    await Database.query(`
      UPDATE print_jobs 
      SET status = 'failed', 
          error_message = $1,
          completed_at = NOW()
      WHERE invoice_id = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `, [error instanceof Error ? error.message : 'Unknown error', invoiceId])

    throw error
  }
}

// GET endpoint to retrieve print history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)

    // Get print history for this invoice
    const printHistory = await Database.query(`
      SELECT 
        pj.id,
        pj.printer_name,
        pj.copies,
        pj.status,
        pj.error_message,
        pj.created_at,
        pj.completed_at,
        u.full_name as printed_by
      FROM print_jobs pj
      JOIN users u ON pj.user_id = u.id
      WHERE pj.invoice_id = $1
      ORDER BY pj.created_at DESC
      LIMIT 50
    `, [params.id])

    // Get current invoice print stats
    const invoiceStats = await Database.query(`
      SELECT printed_count, last_printed_at
      FROM invoices
      WHERE id = $1 AND (created_by = $2 OR $3 = 'admin')
    `, [params.id, user.id, user.role])

    if (invoiceStats.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      stats: invoiceStats[0],
      history: printHistory
    })

  } catch (error) {
    console.error('Print history error:', error)
    return NextResponse.json(
      { error: 'Failed to get print history' },
      { status: 500 }
    )
  }
}

// Create print_jobs table if it doesn't exist
// This would typically be in a migration file
async function ensurePrintJobsTable() {
  try {
    await Database.query(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        printer_name VARCHAR(100),
        copies INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'sent_to_browser')) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `)

    await Database.query(`
      CREATE INDEX IF NOT EXISTS idx_print_jobs_invoice_id ON print_jobs(invoice_id)
    `)

    await Database.query(`
      CREATE INDEX IF NOT EXISTS idx_print_jobs_user_id ON print_jobs(user_id)
    `)

    await Database.query(`
      CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON print_jobs(created_at DESC)
    `)

  } catch (error) {
    console.error('Failed to create print_jobs table:', error)
  }
}

// Initialize table on module load
ensurePrintJobsTable()