// app/api/tka-workers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { validateInput, tkaWorkerSchema } from '@/lib/validation'
import type { TKAWorker, TKAWorkerWithFamily, TKAFamilyMember } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'read')
    
    const tkaId = params.id
    
    // Get TKA worker with statistics
    const tkaResult = await Database.query<TKAWorkerWithFamily>(`
      SELECT 
        t.*,
        COUNT(DISTINCT f.id) as family_count,
        COUNT(DISTINCT il.invoice_id) as invoice_count
      FROM tka_workers t
      LEFT JOIN tka_family_members f ON t.id = f.tka_id AND f.is_active = true
      LEFT JOIN invoice_lines il ON t.id = il.tka_id
      WHERE t.id = $1 AND t.is_active = true
      GROUP BY t.id
    `, [tkaId])
    
    if (tkaResult.length === 0) {
      return NextResponse.json(
        { error: 'TKA worker not found' },
        { status: 404 }
      )
    }
    
    const tkaWorker = tkaResult[0]
    
    // Get family members
    const familyMembers = await Database.findMany<TKAFamilyMember>(
      'tka_family_members',
      { tka_id: tkaId, is_active: true },
      { orderBy: 'created_at' }
    )
    
    return NextResponse.json({
      tka_worker: {
        ...tkaWorker,
        family_members: familyMembers
      }
    })
    
  } catch (error) {
    console.error('Get TKA worker error:', error)
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'update')
    
    const tkaId = params.id
    const body = await request.json()
    const tkaData = validateInput(tkaWorkerSchema, body)
    
    // Check if TKA worker exists
    const existingTKA = await Database.findOne('tka_workers', { 
      id: tkaId, 
      is_active: true 
    })
    
    if (!existingTKA) {
      return NextResponse.json(
        { error: 'TKA worker not found' },
        { status: 404 }
      )
    }
    
    // Check for duplicate passport (excluding current worker)
    const existingPassport = await Database.query(`
      SELECT id FROM tka_workers 
      WHERE passport = $1 AND id != $2 AND is_active = true
    `, [tkaData.passport, tkaId])
    
    if (existingPassport.length > 0) {
      return NextResponse.json(
        { error: 'Another TKA worker with this passport already exists' },
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
    
    const updatedTKA = await Database.update<TKAWorker>(
      'tka_workers',
      {
        ...tkaData,
        updated_at: new Date().toISOString()
      },
      { id: tkaId }
    )
    
    return NextResponse.json({
      tka_worker: updatedTKA,
      message: 'TKA worker updated successfully'
    })
    
  } catch (error) {
    console.error('Update TKA worker error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'delete')
    
    const tkaId = params.id
    
    // Check if TKA worker exists
    const existingTKA = await Database.findOne('tka_workers', { 
      id: tkaId, 
      is_active: true 
    })
    
    if (!existingTKA) {
      return NextResponse.json(
        { error: 'TKA worker not found' },
        { status: 404 }
      )
    }
    
    // Check if TKA worker has any invoice lines
    const invoiceLineCount = await Database.query(`
      SELECT COUNT(*) as count FROM invoice_lines WHERE tka_id = $1
    `, [tkaId])
    
    if (parseInt(invoiceLineCount[0]?.count?.toString() || '0') > 0) {
      return NextResponse.json(
        { error: 'Cannot delete TKA worker with existing invoice entries. Deactivate instead.' },
        { status: 400 }
      )
    }
    
    // Soft delete (set is_active to false)
    await Database.update(
      'tka_workers',
      { 
        is_active: false,
        updated_at: new Date().toISOString()
      },
      { id: tkaId }
    )
    
    // Also deactivate family members
    await Database.query(`
      UPDATE tka_family_members 
      SET is_active = false
      WHERE tka_id = $1
    `, [tkaId])
    
    return NextResponse.json({
      message: 'TKA worker deactivated successfully'
    })
    
  } catch (error) {
    console.error('Delete TKA worker error:', error)
    
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

