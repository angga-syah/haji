// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService, requireAuth } from '@/lib/auth'
import { validateInput, changePasswordSchema } from '@/lib/validation'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { oldPassword, newPassword } = validateInput(changePasswordSchema, body)
    
    const success = await AuthService.changePassword(user.id, oldPassword, newPassword)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      message: 'Password changed successfully'
    })
    
  } catch (error) {
    console.error('Change password error:', error)
    
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

