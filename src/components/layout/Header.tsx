// components/layout/Header.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/api/useAuth'

export function Header() {
  const logout = useLogout()

  const handleLogout = () => {
    logout.mutate()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Invoice Management</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            loading={logout.isPending}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}