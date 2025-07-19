// app/api/bank-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requirePermission } from '@/lib/auth'
import { validateInput, bankAccountSchema } from '@/lib/validation'
import { PAGINATION } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Bank accounts can be viewed by all authenticated users
    await requireAuth(request)
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString()), PAGINATION.MAX_LIMIT)
    const offset = parseInt(searchParams.get('offset') || PAGINATION.DEFAULT_OFFSET.toString())
    const activeOnly = searchParams.get('active') === 'true'
    const defaultOnly = searchParams.get('default') === 'true'
    
    // Build query conditions
    let whereClause = ''
    const queryParams: any[] = []
    let paramIndex = 1
    
    if (activeOnly) {
      whereClause = 'is_active = true'
    }
    
    if (defaultOnly) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += 'is_default = true'
    }
    
    if (query) {
      whereClause += whereClause ? ' AND ' : ''
      whereClause += `(bank_name ILIKE $${paramIndex} OR account_name ILIKE $${paramIndex} OR account_number ILIKE $${paramIndex})`
      queryParams.push(`%${query}%`)
      paramIndex++
    }
    
    // Build final query
    const sql = `
      SELECT 
        ba.*,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM bank_accounts ba
      LEFT JOIN users u ON ba.created_by = u.id
      LEFT JOIN profiles p ON ba.created_by = p.id
      ${whereClause ? 'WHERE ' + whereClause : ''}
      ORDER BY ba.is_default DESC, ba.sort_order ASC, ba.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    queryParams.push(limit, offset)
    
    const bankAccounts = await Database.query(sql, queryParams)
    
    // For default query, return single account or null
    if (defaultOnly) {
      return NextResponse.json({
        bank_account: bankAccounts[0] || null
      })
    }
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM bank_accounts ba
      ${whereClause ? 'WHERE ' + whereClause : ''}
    `
    
    const countResult = await Database.query(countSql, queryParams.slice(0, -2)) // Remove limit/offset
    const total = parseInt(countResult[0]?.total || '0')

    return NextResponse.json({
      bank_accounts: bankAccounts,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get bank accounts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'bank_accounts', 'create')
    const body = await request.json()
    
    // Validate input
    const validatedData = validateInput(bankAccountSchema, body)
    
    // Create bank account with transaction
    const bankAccount = await Database.transaction(async (client) => {
      // If setting as default, unset other defaults first
      if (validatedData.is_default) {
        await client.query(`
          UPDATE bank_accounts 
          SET is_default = false, updated_at = NOW()
          WHERE is_default = true
        `)
      }
      
      // Insert new bank account
      const result = await client.query(`
        INSERT INTO bank_accounts (
          bank_name, account_number, account_name, 
          is_default, sort_order, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, [
        validatedData.bank_name,
        validatedData.account_number,
        validatedData.account_name,
        validatedData.is_default || false,
        validatedData.sort_order || 0,
        user.id
      ])
      
      return result.rows[0]
    })

    return NextResponse.json({ 
      bank_account: bankAccount,
      message: 'Bank account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create bank account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bank account' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 500 }
    )
  }
}