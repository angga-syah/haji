// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService, requirePermission } from '@/lib/auth'
import { validateInput, registerSchema } from '@/lib/validation'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    // Only admins can register new users
    await requirePermission(request, 'users', 'create')
    
    const body = await request.json()
    const { email, password, full_name, username, role } = validateInput(registerSchema, body)
    
    const result = await AuthService.register(email, password, full_name, username, role)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create user. Email or username may already exist.' },
        { status: 400 }
      )
    }
    
    const { user } = result
    
    return NextResponse.json({
      user,
      message: 'User created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Register error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Email or username already exists' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

