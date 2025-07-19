// app/api/invoices/number/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permission
    await requirePermission(request, 'invoices', 'create')
    
    // Generate new invoice number
    const invoiceNumber = await generateInvoiceNumber()

    return NextResponse.json({ 
      invoice_number: invoiceNumber 
    })

  } catch (error) {
    console.error('Generate invoice number error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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