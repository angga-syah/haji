// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { validateInput, loginSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, remember } = validateInput(loginSchema, body)
    
    const result = await AuthService.login(email, password)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    const { user, token } = result
    
    // Set HTTP-only cookie
    const response = NextResponse.json({ 
      user,
      message: 'Login successful' 
    })
    
    // Set cookie with appropriate expiration
    const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 1 day
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/'
    })
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

