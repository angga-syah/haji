// src/lib/auth/supabase.ts
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { Database } from '@/lib/database'
import type { AuthUser, Profile } from '@/lib/types'

// Supabase client instance (optional)
let supabaseClient: SupabaseClient | null = null

// Initialize Supabase client if environment variables are available
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
    }
  }

  return supabaseClient
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export class SupabaseAuthService {
  private static client = getSupabaseClient()

  /**
   * Check if Supabase is available
   */
  static isAvailable(): boolean {
    return !!this.client && isSupabaseConfigured()
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<{
    user: AuthUser
    session: any
  } | null> {
    if (!this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Supabase sign in error:', error)
        return null
      }

      if (!data.user) {
        return null
      }

      // Get user profile from our database
      const profile = await this.getUserProfile(data.user.id)
      if (!profile) {
        throw new Error('User profile not found')
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        role: profile.role,
        full_name: profile.full_name
      }

      return {
        user: authUser,
        session: data.session
      }
    } catch (error) {
      console.error('Supabase authentication error:', error)
      return null
    }
  }

  /**
   * Sign up new user
   */
  static async signUp(
    email: string,
    password: string,
    userData: {
      full_name: string
      username: string
      role?: 'admin' | 'finance_supervisor' | 'finance_staff'
    }
  ): Promise<{ user: AuthUser } | null> {
    if (!this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            username: userData.username
          }
        }
      })

      if (error) {
        console.error('Supabase sign up error:', error)
        return null
      }

      if (!data.user) {
        return null
      }

      // Create profile in our database
      await Database.insert('profiles', {
        id: data.user.id,
        username: userData.username,
        role: userData.role || 'finance_staff',
        full_name: userData.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        role: userData.role || 'finance_staff',
        full_name: userData.full_name
      }

      return { user: authUser }
    } catch (error) {
      console.error('Supabase registration error:', error)
      return null
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase not configured')
    }

    const { error } = await this.client.auth.signOut()
    if (error) {
      console.error('Supabase sign out error:', error)
    }
  }

  /**
   * Get current user session
   */
  static async getSession(): Promise<{
    user: AuthUser
    session: any
  } | null> {
    if (!this.client) return null

    try {
      const { data, error } = await this.client.auth.getSession()
      
      if (error || !data.session?.user) {
        return null
      }

      const profile = await this.getUserProfile(data.session.user.id)
      if (!profile) {
        return null
      }

      const authUser: AuthUser = {
        id: data.session.user.id,
        email: data.session.user.email!,
        role: profile.role,
        full_name: profile.full_name
      }

      return {
        user: authUser,
        session: data.session
      }
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  /**
   * Get user by access token
   */
  static async getUserByToken(token: string): Promise<AuthUser | null> {
    if (!this.client) return null

    try {
      const { data, error } = await this.client.auth.getUser(token)
      
      if (error || !data.user) {
        return null
      }

      const profile = await this.getUserProfile(data.user.id)
      if (!profile) {
        return null
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        role: profile.role,
        full_name: profile.full_name
      }
    } catch (error) {
      console.error('Error getting user by token:', error)
      return null
    }
  }

  /**
   * Change password
   */
  static async changePassword(newPassword: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword
      })

      if (error) {
        console.error('Password change error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error changing password:', error)
      return false
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Supabase not configured')
    }

    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        console.error('Password reset error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error resetting password:', error)
      return false
    }
  }

  /**
   * Get user profile from our database
   */
  private static async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      return await Database.findOne<Profile>('profiles', { id: userId })
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile | null> {
    try {
      // Update in our database
      const allowedFields = ['full_name', 'username', 'avatar_url', 'settings']
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key as keyof Profile]
          return obj
        }, {} as any)

      if (Object.keys(filteredUpdates).length === 0) {
        return null
      }

      filteredUpdates.updated_at = new Date().toISOString()

      return await Database.update<Profile>('profiles', filteredUpdates, { id: userId })
    } catch (error) {
      console.error('Error updating profile:', error)
      return null
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (!this.client) {
      return () => {} // No-op unsubscribe function
    }

    const {
      data: { subscription }
    } = this.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getUserProfile(session.user.id)
        if (profile) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            role: profile.role,
            full_name: profile.full_name
          }
          callback(authUser)
        } else {
          callback(null)
        }
      } else {
        callback(null)
      }
    })

    // Return unsubscribe function
    return () => subscription.unsubscribe()
  }
}

// Utility functions for hybrid auth
export class HybridAuthService {
  /**
   * Determine which auth method to use based on configuration
   */
  static getAuthMethod(): 'supabase' | 'jwt' {
    return isSupabaseConfigured() ? 'supabase' : 'jwt'
  }

  /**
   * Universal sign in (tries Supabase first, falls back to JWT)
   */
  static async signIn(email: string, password: string): Promise<{
    user: AuthUser
    token?: string
    session?: any
  } | null> {
    const authMethod = this.getAuthMethod()

    if (authMethod === 'supabase') {
      const result = await SupabaseAuthService.signIn(email, password)
      if (result) {
        return {
          user: result.user,
          session: result.session
        }
      }
    }

    // Fallback to JWT auth (imported from main auth service)
    const { AuthService } = await import('./index')
    const result = await AuthService.login(email, password)
    
    if (result) {
      return {
        user: result.user,
        token: result.token
      }
    }

    return null
  }

  /**
   * Universal sign out
   */
  static async signOut(): Promise<void> {
    const authMethod = this.getAuthMethod()

    if (authMethod === 'supabase' && SupabaseAuthService.isAvailable()) {
      await SupabaseAuthService.signOut()
    }

    // Also clear JWT tokens from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token')
      sessionStorage.removeItem('auth-token')
    }
  }
}

export default SupabaseAuthService