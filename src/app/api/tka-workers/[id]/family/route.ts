// app/api/tka-workers/[id]/family/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { validateInput, tkaFamilyMemberSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'read')
    
    const { id: tkaId } = params
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'
    
    // Verify TKA worker exists
    const tkaWorker = await Database.findOne('tka_workers', { 
      id: tkaId, 
      is_active: true 
    })
    
    if (!tkaWorker) {
      return NextResponse.json(
        { error: 'TKA worker not found' },
        { status: 404 }
      )
    }
    
    // Build query conditions
    let whereClause = 'tka_id = $1'
    const queryParams = [tkaId]
    
    if (activeOnly) {
      whereClause += ' AND is_active = true'
    }
    
    // Get family members
    const familyMembers = await Database.query(`
      SELECT * FROM tka_family_members
      WHERE ${whereClause}
      ORDER BY created_at ASC
    `, queryParams)
    
    return NextResponse.json({
      family_members: familyMembers,
      tka_worker: tkaWorker
    })
    
  } catch (error) {
    console.error('Get family members error:', error)
    
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'create')
    
    const { id: tkaId } = params
    const body = await request.json()
    
    // Verify TKA worker exists
    const tkaWorker = await Database.findOne('tka_workers', { 
      id: tkaId, 
      is_active: true 
    })
    
    if (!tkaWorker) {
      return NextResponse.json(
        { error: 'TKA worker not found' },
        { status: 404 }
      )
    }
    
    // Validate family member data
    const familyData = validateInput(tkaFamilyMemberSchema, body)
    
    // Check for duplicate passport
    const existingPassport = await Database.findOne('tka_workers', { 
      passport: familyData.passport,
      is_active: true 
    })
    
    if (existingPassport) {
      return NextResponse.json(
        { error: 'This passport is already registered as a TKA worker' },
        { status: 400 }
      )
    }
    
    const existingFamilyPassport = await Database.query(`
      SELECT id FROM tka_family_members 
      WHERE passport = $1 AND is_active = true
    `, [familyData.passport])
    
    if (existingFamilyPassport.length > 0) {
      return NextResponse.json(
        { error: 'This passport is already registered as a family member' },
        { status: 400 }
      )
    }
    
    // Business rule: Only one spouse allowed
    if (familyData.relationship === 'spouse') {
      const existingSpouse = await Database.findOne('tka_family_members', {
        tka_id: tkaId,
        relationship: 'spouse',
        is_active: true
      })
      
      if (existingSpouse) {
        return NextResponse.json(
          { error: 'TKA worker already has a spouse registered' },
          { status: 400 }
        )
      }
    }
    
    // Create family member
    const familyMember = await Database.insert('tka_family_members', {
      tka_id: tkaId,
      nama: familyData.nama,
      passport: familyData.passport,
      jenis_kelamin: familyData.jenis_kelamin,
      relationship: familyData.relationship
    })
    
    return NextResponse.json({
      family_member: familyMember,
      message: 'Family member added successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create family member error:', error)
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'update')
    
    const { id: tkaId } = params
    const body = await request.json()
    const { family_member_id, ...updateData } = body
    
    if (!family_member_id) {
      return NextResponse.json(
        { error: 'Family member ID is required' },
        { status: 400 }
      )
    }
    
    // Verify family member exists and belongs to this TKA worker
    const existingMember = await Database.findOne('tka_family_members', {
      id: family_member_id,
      tka_id: tkaId,
      is_active: true
    })
    
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }
    
    // Validate update data
    const updateFields = validateInput(tkaFamilyMemberSchema.partial(), updateData)
    
    // Check for duplicate passport (excluding current member)
    if (updateFields.passport && updateFields.passport !== existingMember.passport) {
      const duplicatePassport = await Database.query(`
        SELECT id FROM tka_family_members 
        WHERE passport = $1 AND id != $2 AND is_active = true
      `, [updateFields.passport, family_member_id])
      
      if (duplicatePassport.length > 0) {
        return NextResponse.json(
          { error: 'This passport is already registered' },
          { status: 400 }
        )
      }
      
      // Also check in TKA workers
      const tkaPassport = await Database.findOne('tka_workers', {
        passport: updateFields.passport,
        is_active: true
      })
      
      if (tkaPassport) {
        return NextResponse.json(
          { error: 'This passport is already registered as a TKA worker' },
          { status: 400 }
        )
      }
    }
    
    // Business rule: Only one spouse allowed
    if (updateFields.relationship === 'spouse' && updateFields.relationship !== existingMember.relationship) {
      const existingSpouse = await Database.query(`
        SELECT id FROM tka_family_members 
        WHERE tka_id = $1 AND relationship = 'spouse' AND id != $2 AND is_active = true
      `, [tkaId, family_member_id])
      
      if (existingSpouse.length > 0) {
        return NextResponse.json(
          { error: 'TKA worker already has a spouse registered' },
          { status: 400 }
        )
      }
    }
    
    // Update family member
    const updatedMember = await Database.update(
      'tka_family_members',
      updateFields,
      { id: family_member_id }
    )
    
    return NextResponse.json({
      family_member: updatedMember,
      message: 'Family member updated successfully'
    })
    
  } catch (error) {
    console.error('Update family member error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'tka_workers', 'delete')
    
    const { id: tkaId } = params
    const { searchParams } = new URL(request.url)
    const familyMemberId = searchParams.get('family_member_id')
    
    if (!familyMemberId) {
      return NextResponse.json(
        { error: 'Family member ID is required' },
        { status: 400 }
      )
    }
    
    // Verify family member exists and belongs to this TKA worker
    const existingMember = await Database.findOne('tka_family_members', {
      id: familyMemberId,
      tka_id: tkaId,
      is_active: true
    })
    
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }
    
    // Check if family member is used in any invoices
    const invoiceUsage = await Database.query(`
      SELECT COUNT(*) as count
      FROM invoice_lines il
      JOIN invoices i ON il.invoice_id = i.id
      WHERE il.tka_id = $1 AND i.status != 'cancelled'
    `, [familyMemberId])
    
    if (parseInt(invoiceUsage[0].count) > 0) {
      // Soft delete if used in invoices
      await Database.update(
        'tka_family_members',
        { is_active: false },
        { id: familyMemberId }
      )
      
      return NextResponse.json({
        message: 'Family member deactivated (used in existing invoices)'
      })
    } else {
      // Hard delete if not used
      await Database.delete('tka_family_members', { id: familyMemberId })
      
      return NextResponse.json({
        message: 'Family member deleted successfully'
      })
    }
    
  } catch (error) {
    console.error('Delete family member error:', error)
    
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