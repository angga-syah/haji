// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ user })
    
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

