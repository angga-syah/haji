
// components/auth/RoleGuard.tsx
'use client'

import React from 'react'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { Card, CardContent } from '@/components/ui/card'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: Array<'admin' | 'finance_supervisor' | 'finance_staff'>
  fallback?: React.ReactNode
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback 
}: RoleGuardProps) {
  const { data: currentUser } = useCurrentUser()

  const hasAccess = currentUser?.user && allowedRoles.includes(currentUser.user.role)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-gray-500">
              You don't have permission to access this page.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
