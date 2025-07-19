
// components/auth/ProtectedRoute.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { data: currentUser, isLoading, error } = useCurrentUser()

  React.useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !currentUser?.user) {
        router.push(redirectTo)
      } else if (!requireAuth && currentUser?.user) {
        router.push('/')
      }
    }
  }, [currentUser, isLoading, requireAuth, redirectTo, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (requireAuth && !currentUser?.user) {
    return null // Will redirect
  }

  if (!requireAuth && currentUser?.user) {
    return null // Will redirect
  }

  return <>{children}</>
}
