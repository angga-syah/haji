// lib/auth/index.ts
import { NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { Database } from '@/lib/database'
import type { AuthUser, User, Profile } from '@/lib/types'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')

export class AuthService {
  // Get current authenticated user
  static async getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
    try {
      const token = request.cookies.get('auth-token')?.value || 
                   request.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!token) return null
      
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const user = payload as any
      
      // Verify user still exists and get current profile
      const profile = await Database.findOne<Profile>('profiles', { id: user.id })
      if (!profile) return null
      
      return {
        id: user.id,
        email: user.email,
        role: profile.role,
        full_name: profile.full_name
      }
      
    } catch (error) {
      console.error('Auth error:', error)
      return null
    }
  }
  
  // Create JWT token
  static async createToken(user: AuthUser): Promise<string> {
    return await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      full_name: user.full_name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET)
  }
  
  // Login user
  static async login(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
    try {
      // Get user with profile
      const userResult = await Database.query(`
        SELECT 
          u.id, u.email, u.password_hash,
          p.role, p.full_name, p.username
        FROM users u
        JOIN profiles p ON u.id = p.id
        WHERE u.email = $1
      `, [email])
      
      if (userResult.length === 0) return null
      
      const userData = userResult[0]
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, userData.password_hash)
      if (!isValidPassword) return null
      
      const user: AuthUser = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        full_name: userData.full_name
      }
      
      const token = await this.createToken(user)
      return { user, token }
      
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  }
  
  // Register new user (admin only)
  static async register(
    email: string, 
    password: string, 
    full_name: string,
    username: string,
    role: 'admin' | 'finance_supervisor' | 'finance_staff' = 'finance_staff'
  ): Promise<{ user: AuthUser; token: string } | null> {
    try {
      const hashedPassword = await bcrypt.hash(password, 12)
      
      return await Database.transaction(async (client) => {
        // Create user
        const userResult = await client.query(`
          INSERT INTO users (email, password_hash) 
          VALUES ($1, $2) 
          RETURNING id, email
        `, [email, hashedPassword])
        
        const newUser = userResult.rows[0]
        
        // Create profile
        await client.query(`
          INSERT INTO profiles (id, username, role, full_name) 
          VALUES ($1, $2, $3, $4)
        `, [newUser.id, username, role, full_name])
        
        const user: AuthUser = {
          id: newUser.id,
          email: newUser.email,
          role,
          full_name
        }
        
        const token = await this.createToken(user)
        return { user, token }
      })
      
    } catch (error) {
      console.error('Register error:', error)
      return null
    }
  }
  
  // Change password
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await Database.findOne<User>('users', { id: userId })
      if (!user) return false
      
      const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash!)
      if (!isValidPassword) return false
      
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      
      await Database.update('users', 
        { password_hash: hashedPassword, updated_at: new Date().toISOString() },
        { id: userId }
      )
      
      return true
    } catch (error) {
      console.error('Change password error:', error)
      return false
    }
  }
  
  // Update profile
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const allowedFields = ['full_name', 'username', 'avatar_url', 'settings']
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key as keyof Profile]
          return obj
        }, {} as any)
      
      if (Object.keys(filteredUpdates).length === 0) return null
      
      filteredUpdates.updated_at = new Date().toISOString()
      
      return await Database.update<Profile>('profiles', filteredUpdates, { id: userId })
    } catch (error) {
      console.error('Update profile error:', error)
      return null
    }
  }
}

// Permission system
export class PermissionService {
  private static permissions = {
    admin: {
      // Admin can do everything
      users: ['create', 'read', 'update', 'delete', 'manage'],
      companies: ['create', 'read', 'update', 'delete'],
      tka_workers: ['create', 'read', 'update', 'delete'],
      job_descriptions: ['create', 'read', 'update', 'delete'],
      invoices: ['create', 'read', 'update', 'delete', 'finalize', 'pay'],
      bank_accounts: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update'],
      reports: ['read', 'export']
    },
    finance_supervisor: {
      // Can manage invoices and change payment status
      companies: ['read'],
      tka_workers: ['read'],
      job_descriptions: ['read'],
      invoices: ['create', 'read', 'update', 'delete', 'finalize', 'pay'],
      bank_accounts: ['read'],
      reports: ['read', 'export']
    },
    finance_staff: {
      // Can manage everything except users and payment status
      companies: ['create', 'read', 'update', 'delete'],
      tka_workers: ['create', 'read', 'update', 'delete'],
      job_descriptions: ['create', 'read', 'update', 'delete'],
      invoices: ['create', 'read', 'update', 'delete', 'finalize'],
      bank_accounts: ['read'],
      reports: ['read', 'export']
    }
  }
  
  static hasPermission(
    role: 'admin' | 'finance_supervisor' | 'finance_staff',
    resource: string,
    action: string
  ): boolean {
    const rolePermissions = this.permissions[role]
    if (!rolePermissions) return false
    
    const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions]
    if (!resourcePermissions) return false
    
    return resourcePermissions.includes(action)
  }
  
  static requirePermission(
    role: 'admin' | 'finance_supervisor' | 'finance_staff',
    resource: string,
    action: string
  ): void {
    if (!this.hasPermission(role, resource, action)) {
      throw new Error(`Insufficient permissions: ${role} cannot ${action} ${resource}`)
    }
  }
}

// Auth middleware helpers
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await AuthService.getCurrentUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(
  request: NextRequest, 
  requiredRoles: Array<'admin' | 'finance_supervisor' | 'finance_staff'>
): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (!requiredRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  return user
}

export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string
): Promise<AuthUser> {
  const user = await requireAuth(request)
  PermissionService.requirePermission(user.role, resource, action)
  return user
}