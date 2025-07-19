// app/api/tka-workers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { validateInput, tkaWorkerSchema, searchParamsSchema } from '@/lib/validation'
import type { TKAWorker, TKAWorkerWithFamily } from '@/lib/types'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'tka_workers', 'read')
    
    const { searchParams } = new URL(request.url)
    const {
      query,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = validateInput(searchParamsSchema, {
      query: searchParams.get('query'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      orderBy: searchParams.get('orderBy') || 'created_at',
      orderDirection: searchParams.get('orderDirection') || 'desc'
    })
    
    // Build query with family member count and invoice count
    let sql = `
      SELECT 
        t.*,
        COUNT(DISTINCT f.id) as family_count,
        COUNT(DISTINCT il.invoice_id) as invoice_count
      FROM tka_workers t
      LEFT JOIN tka_family_members f ON t.id = f.tka_id AND f.is_active = true
      LEFT JOIN invoice_lines il ON t.id = il.tka_id
      WHERE t.is_active = true
    `
    
    const queryParams: any[] = []
    
    // Add search filter
    if (query) {
      sql += ` AND (t.nama ILIKE $${queryParams.length + 1} OR t.passport ILIKE $${queryParams.length + 1} OR t.divisi ILIKE $${queryParams.length + 1})`
      queryParams.push(`%${query}%`)
    }
    
    sql += ` GROUP BY t.id ORDER BY t.${orderBy} ${orderDirection.toUpperCase()}`
    sql += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
    queryParams.push(limit, offset)
    
    const tkaWorkers = await Database.query<TKAWorkerWithFamily>(sql, queryParams)
    
    // Get total count for pagination
    let countSql = `SELECT COUNT(*) as total FROM tka_workers WHERE is_active = true`
    const countParams: any[] = []
    
    if (query) {
      countSql += ` AND (nama ILIKE $1 OR passport ILIKE $1 OR divisi ILIKE $1)`
      countParams.push(`%${query}%`)
    }
    
    const countResult = await Database.query<{ total: number }>(countSql, countParams)
    const total = parseInt(countResult[0]?.total?.toString() || '0')
    
    return NextResponse.json({
      tka_workers: tkaWorkers,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total
      }
    })
    
  } catch (error) {
    console.error('Get TKA workers error:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'tka_workers', 'create')
    
    const body = await request.json()
    const tkaData = validateInput(tkaWorkerSchema, body)
    
    // Check for duplicate passport
    const existingPassport = await Database.findOne('tka_workers', { 
      passport: tkaData.passport,
      is_active: true 
    })
    
    if (existingPassport) {
      return NextResponse.json(
        { error: 'TKA worker with this passport already exists' },
        { status: 400 }
      )
    }
    
    // Also check in family members
    const existingFamilyPassport = await Database.findOne('tka_family_members', {
      passport: tkaData.passport,
      is_active: true
    })
    
    if (existingFamilyPassport) {
      return NextResponse.json(
        { error: 'This passport is already registered as a family member' },
        { status: 400 }
      )
    }
    
    const tkaWorker = await Database.insert<TKAWorker>('tka_workers', {
      ...tkaData,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    return NextResponse.json({
      tka_worker: tkaWorker,
      message: 'TKA worker created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create TKA worker error:', error)
    
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

