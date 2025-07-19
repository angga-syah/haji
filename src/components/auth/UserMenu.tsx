
// components/auth/UserMenu.tsx
'use client'

import React, { useState } from 'react'
import { useCurrentUser, useLogout } from '@/hooks/api/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function UserMenu() {
  const { data: currentUser } = useCurrentUser()
  const logout = useLogout()
  const [showMenu, setShowMenu] = useState(false)

  if (!currentUser?.user) {
    return null
  }

  const user = currentUser.user

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {user.full_name.charAt(0)}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-700">{user.full_name}</div>
          <div className="text-xs text-gray-500 capitalize">
            {user.role.replace('_', ' ')}
          </div>
        </div>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <Card className="absolute right-0 mt-2 w-48 z-20">
            <CardContent className="p-2">
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-gray-500">{user.email}</div>
                </div>
                <hr />
                <button
                  onClick={() => {
                    setShowMenu(false)
                    // Add profile edit functionality
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    logout.mutate()
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Sign out
                </button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
