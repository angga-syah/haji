// app/(auth)/layout.tsx
import React from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireAuth={false}>
      {children}
    </ProtectedRoute>
  )
}