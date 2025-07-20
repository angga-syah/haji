// src/lib/auth/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production-environment'
)

export interface JWTUser extends JWTPayload {
  id: string
  email: string
  role: 'admin' | 'finance_supervisor' | 'finance_staff'
  full_name: string
  iat?: number
  exp?: number
}

export class JWTService {
  /**
   * Create JWT token
   */
  static async createToken(user: Omit<JWTUser, 'iat' | 'exp'>): Promise<string> {
    try {
      return await new SignJWT({
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // 24 hours
        .sign(JWT_SECRET)
    } catch (error) {
      console.error('Error creating JWT token:', error)
      throw new Error('Failed to create authentication token')
    }
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JWTUser | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      return payload as JWTUser
    } catch (error) {
      // Token is invalid or expired
      return null
    }
  }

  /**
   * Extract token from request
   */
  static extractTokenFromRequest(request: NextRequest): string | null {
    // Check Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Check cookie
    const cookieToken = request.cookies.get('auth-token')?.value
    if (cookieToken) {
      return cookieToken
    }

    return null
  }

  /**
   * Get user from request
   */
  static async getUserFromRequest(request: NextRequest): Promise<JWTUser | null> {
    const token = this.extractTokenFromRequest(request)
    if (!token) return null

    return this.verifyToken(token)
  }

  /**
   * Create secure cookie with token
   */
  static createTokenCookie(token: string, remember: boolean = false): string {
    const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 24 hours
    const secure = process.env.NODE_ENV === 'production'
    
    return `auth-token=${token}; HttpOnly; Secure=${secure}; SameSite=Strict; Max-Age=${maxAge}; Path=/`
  }

  /**
   * Create logout cookie (clears token)
   */
  static createLogoutCookie(): string {
    const secure = process.env.NODE_ENV === 'production'
    return `auth-token=; HttpOnly; Secure=${secure}; SameSite=Strict; Max-Age=0; Path=/`
  }

  /**
   * Set token cookie in response
   */
  static setTokenCookie(response: NextResponse, token: string, remember: boolean = false): void {
    const cookieString = this.createTokenCookie(token, remember)
    response.headers.set('Set-Cookie', cookieString)
  }

  /**
   * Clear token cookie in response
   */
  static clearTokenCookie(response: NextResponse): void {
    const cookieString = this.createLogoutCookie()
    response.headers.set('Set-Cookie', cookieString)
  }

  /**
   * Refresh token (create new token with updated expiration)
   */
  static async refreshToken(oldToken: string): Promise<string | null> {
    const user = await this.verifyToken(oldToken)
    if (!user) return null

    // Remove JWT fields for new token
    const { iat, exp, ...userData } = user
    return this.createToken(userData)
  }

  /**
   * Check if token is about to expire (within 1 hour)
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]))
      const exp = decoded.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds
      
      return (exp - now) < oneHour
    } catch {
      return true // If we can't decode, assume it's expiring
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]))
      return new Date(decoded.exp * 1000)
    } catch {
      return null
    }
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    const parts = token.split('.')
    return parts.length === 3 && parts.every(part => part.length > 0)
  }
}

/**
 * Middleware helper for protected routes
 */
export async function requireAuth(request: NextRequest): Promise<JWTUser> {
  const user = await JWTService.getUserFromRequest(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Middleware helper for role-based access
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: Array<'admin' | 'finance_supervisor' | 'finance_staff'>
): Promise<JWTUser> {
  const user = await requireAuth(request)
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

/**
 * API route helper for authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: JWTUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = await requireAuth(request)
      return handler(request, user, ...args)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
}

/**
 * API route helper for role-based authentication
 */
export function withRole<T extends any[]>(
  allowedRoles: Array<'admin' | 'finance_supervisor' | 'finance_staff'>,
  handler: (request: NextRequest, user: JWTUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = await requireRole(request, allowedRoles)
      return handler(request, user, ...args)
    } catch (error) {
      const status = error instanceof Error && error.message === 'Authentication required' ? 401 : 403
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Access denied' },
        { status }
      )
    }
  }
}

/**
 * Client-side token management
 */
export const ClientTokenManager = {
  /**
   * Store token in appropriate storage
   */
  store(token: string, remember: boolean = false): void {
    if (typeof window === 'undefined') return
    
    if (remember) {
      localStorage.setItem('auth-token', token)
    } else {
      sessionStorage.setItem('auth-token', token)
    }
  },

  /**
   * Get token from storage
   */
  get(): string | null {
    if (typeof window === 'undefined') return null
    
    return localStorage.getItem('auth-token') || 
           sessionStorage.getItem('auth-token')
  },

  /**
   * Remove token from storage
   */
  remove(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('auth-token')
    sessionStorage.removeItem('auth-token')
  },

  /**
   * Check if token exists
   */
  exists(): boolean {
    return !!this.get()
  }
}

export default JWTService