// app/api/bank-accounts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, bankAccountSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request)
    const { id } = params
    
    // Get bank account with creator info
    const bankAccount = await Database.query(`
      SELECT 
        ba.*,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM bank_accounts ba
      LEFT JOIN users u ON ba.created_by = u.id
      LEFT JOIN profiles p ON ba.created_by = p.id
      WHERE ba.id = $1
    `, [id])
    
    if (bankAccount.length === 0) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      bank_account: bankAccount[0] 
    })

  } catch (error) {
    console.error('Get bank account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission(request, 'bank_accounts', 'update')
    const { id } = params
    const body = await request.json()
    
    const existing = await Database.findOne('bank_accounts', { id })
    if (!existing) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
    }
    
    const validatedData = validateInput(bankAccountSchema, body)
    
    // Check for duplicate account number
    const duplicateCheck = await Database.query(`
      SELECT id FROM bank_accounts 
      WHERE account_number = $1 AND id != $2 AND is_active = true
    `, [validatedData.account_number, id])
    
    if (duplicateCheck.length > 0) {
      return NextResponse.json(
        { error: 'Bank account with this account number already exists' },
        { status: 409 }
      )
    }

    const updatedBankAccount = await Database.transaction(async (client) => {
      // Fix: Access properties safely
      if (validatedData.is_default && !existing.is_default) {
        await client.query(`
          UPDATE bank_accounts 
          SET is_default = false, updated_at = NOW()
          WHERE is_default = true AND id != $1
        `, [id])
      }
      
      const result = await client.query(`
        UPDATE bank_accounts 
        SET bank_name = $1, account_number = $2, account_name = $3,
            is_default = $4, sort_order = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `, [
        validatedData.bank_name,
        validatedData.account_number,
        validatedData.account_name,
        validatedData.is_default || false,
        validatedData.sort_order || existing.sort_order || 0,
        id
      ])
      
      return result.rows[0]
    })

    return NextResponse.json({ 
      bank_account: updatedBankAccount,
      message: 'Bank account updated successfully'
    })

  } catch (error) {
    console.error('Update bank account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update bank account' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'bank_accounts', 'delete')
    const { id } = params
    
    // Check if bank account exists
    const existing = await Database.findOne('bank_accounts', { id })
    if (!existing) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }
    
    // Check if bank account is used in any invoices
    const usageCheck = await Database.query(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE bank_account_id = $1
    `, [id])
    
    if (parseInt(usageCheck[0].count) > 0) {
      // Soft delete if used in invoices
      await Database.update(
        'bank_accounts',
        { 
          is_active: false, 
          is_default: false,
          updated_at: new Date().toISOString() 
        },
        { id }
      )
      
      return NextResponse.json({ 
        message: 'Bank account deactivated (used in existing invoices)' 
      })
    } else {
      // Check if it's the default account
      if (existing.is_default) {
        return NextResponse.json(
          { error: 'Cannot delete default bank account. Set another account as default first.' },
          { status: 400 }
        )
      }
      
      // Hard delete if not used
      await Database.delete('bank_accounts', { id })
      
      return NextResponse.json({ 
        message: 'Bank account deleted successfully' 
      })
    }

  } catch (error) {
    console.error('Delete bank account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete bank account' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

