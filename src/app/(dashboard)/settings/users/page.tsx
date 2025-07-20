// src/app/(dashboard)/settings/users/page.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useAuth } from '@/hooks/ui/useAuth'
import { useModal } from '@/hooks/ui/useModal'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { formatDate } from '@/lib/utils'
import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/constants'
import Link from 'next/link'

interface User {
  id: string
  email: string
  full_name: string
  username: string
  role: 'admin' | 'finance_supervisor' | 'finance_staff'
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login?: string
}

export default function UsersManagementPage() {
  const { user: currentUser, isAdmin } = useAuth()
  
  // States
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // Modals
  const createModal = useModal()
  const editModal = useModal()
  const deleteModal = useModal()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    username: '',
    role: 'finance_staff' as const
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Check admin permission
  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <div className="max-w-md mx-auto">
          <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need administrator privileges to access user management.</p>
          <Link href="/settings">
            <Button variant="outline">Back to Settings</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Fetch users
  React.useEffect(() => {
    fetchUsers()
  }, [debouncedSearch, selectedRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (selectedRole) params.set('role', selectedRole)
      
      const response = await fetch(`/api/settings/users?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateErrors({})
    
    // Validation
    const errors: Record<string, string> = {}
    
    if (!createForm.email) errors.email = 'Email is required'
    if (!createForm.password) errors.password = 'Password is required'
    if (createForm.password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (createForm.password !== createForm.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    if (!createForm.full_name) errors.full_name = 'Full name is required'
    if (!createForm.username) errors.username = 'Username is required'
    
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors)
      return
    }
    
    try {
      setIsCreating(true)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          confirmPassword: createForm.confirmPassword,
          full_name: createForm.full_name,
          username: createForm.username,
          role: createForm.role
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }
      
      // Reset form and close modal
      setCreateForm({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        username: '',
        role: 'finance_staff'
      })
      createModal.close()
      fetchUsers()
      
    } catch (error: any) {
      setCreateErrors({ general: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/settings/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      
      if (!response.ok) throw new Error('Failed to update role')
      
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/settings/users/${selectedUser.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete user')
      
      deleteModal.close()
      setSelectedUser(null)
      fetchUsers()
      
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'finance_supervisor': return 'bg-blue-100 text-blue-800'
      case 'finance_staff': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: USER_ROLES.ADMIN, label: ROLE_LABELS.admin },
    { value: USER_ROLES.FINANCE_SUPERVISOR, label: ROLE_LABELS.finance_supervisor },
    { value: USER_ROLES.FINANCE_STAFF, label: ROLE_LABELS.finance_staff }
  ]

  const roleSelectOptions = [
    { value: USER_ROLES.FINANCE_STAFF, label: ROLE_LABELS.finance_staff },
    { value: USER_ROLES.FINANCE_SUPERVISOR, label: ROLE_LABELS.finance_supervisor },
    { value: USER_ROLES.ADMIN, label: ROLE_LABELS.admin }
  ]

  return (
    <div className="space-y-6">
      <PageTitle
        title="User Management"
        description="Manage system users and their roles"
        action={
          <Button onClick={createModal.open}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search users by name, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={roleOptions}
              placeholder="Filter by role"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            @{user.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          options={roleSelectOptions}
                          disabled={user.id === currentUser?.id} // Can't change own role
                          className="min-w-[150px]"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {ROLE_DESCRIPTIONS[user.role as keyof typeof ROLE_DESCRIPTIONS]}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.email_verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              editModal.open()
                            }}
                          >
                            Edit
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                deleteModal.open()
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {createModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  error={createErrors.full_name}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  error={createErrors.username}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  error={createErrors.email}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <Select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                  options={roleSelectOptions}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  error={createErrors.password}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  error={createErrors.confirmPassword}
                />
              </div>
              
              {createErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{createErrors.general}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={createModal.close}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isCreating}
                  className="flex-1"
                >
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.full_name}? This action cannot be undone.`}
        type="danger"
      />
    </div>
  )
}