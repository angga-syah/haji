// app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService, requireAuth } from '@/lib/auth'
import { validateInput, profileUpdateSchema } from '@/lib/validation'

export const runtime = 'edge'

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const updates = validateInput(profileUpdateSchema, body)
    
    const updatedProfile = await AuthService.updateProfile(user.id, updates)
    
    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      profile: updatedProfile,
      message: 'Profile updated successfully'
    })
    
  } catch (error) {
    console.error('Update profile error:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}