// app/api/companies/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'companies', 'read')
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    
    if (!query.trim()) {
      return NextResponse.json({ companies: [] })
    }
    
    // Search by company name, NPWP, or IDTKU
    const companies = await Database.query(`
      SELECT id, company_name, npwp, idtku, address
      FROM companies 
      WHERE is_active = true 
        AND (
          company_name ILIKE $1 
          OR npwp ILIKE $1 
          OR idtku ILIKE $1
        )
      ORDER BY 
        CASE 
          WHEN company_name ILIKE $2 THEN 1
          WHEN company_name ILIKE $1 THEN 2
          ELSE 3
        END,
        company_name
      LIMIT $3
    `, [`%${query}%`, `${query}%`, limit])
    
    return NextResponse.json({ companies })
    
  } catch (error) {
    console.error('Search companies error:', error)
    
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