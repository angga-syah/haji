// app/api/tka-workers/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'tka_workers', 'read')
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const includeFamily = searchParams.get('include_family') === 'true'
    
    if (!query.trim()) {
      return NextResponse.json({ workers: [] })
    }
    
    let workers = []
    
    // Search TKA workers
    const tkaWorkers = await Database.query(`
      SELECT id, nama, passport, divisi, jenis_kelamin, 'tka' as type
      FROM tka_workers 
      WHERE is_active = true 
        AND (nama ILIKE $1 OR passport ILIKE $1 OR divisi ILIKE $1)
      ORDER BY 
        CASE 
          WHEN nama ILIKE $2 THEN 1
          WHEN nama ILIKE $1 THEN 2
          ELSE 3
        END,
        nama
      LIMIT $3
    `, [`%${query}%`, `${query}%`, limit])
    
    workers = [...tkaWorkers]
    
    // Also search family members if requested
    if (includeFamily && workers.length < limit) {
      const remainingLimit = limit - workers.length
      const familyMembers = await Database.query(`
        SELECT 
          f.id, f.nama, f.passport, f.jenis_kelamin, f.relationship,
          t.nama as tka_nama, f.tka_id, 'family' as type
        FROM tka_family_members f
        JOIN tka_workers t ON f.tka_id = t.id
        WHERE f.is_active = true AND t.is_active = true
          AND (f.nama ILIKE $1 OR f.passport ILIKE $1)
        ORDER BY 
          CASE 
            WHEN f.nama ILIKE $2 THEN 1
            WHEN f.nama ILIKE $1 THEN 2
            ELSE 3
          END,
          f.nama
        LIMIT $3
      `, [`%${query}%`, `${query}%`, remainingLimit])
      
      workers = [...workers, ...familyMembers]
    }
    
    return NextResponse.json({ workers })
    
  } catch (error) {
    console.error('Search TKA workers error:', error)
    
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