// src/app/(dashboard)/tka-workers/[id]/edit/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useAuth } from '@/hooks/ui/useAuth'
import { useModal } from '@/hooks/ui/useModal'
import { validateInput, tkaWorkerSchema, tkaFamilyMemberSchema } from '@/lib/validation'
import { GENDER_OPTIONS, FAMILY_RELATIONSHIPS, FAMILY_RELATIONSHIP_LABELS } from '@/lib/constants'
import type { TKAWorker, TKAFamilyMember, CreateTKAWorkerData } from '@/lib/types'
import Link from 'next/link'

interface TKAWorkerWithFamily extends TKAWorker {
  family_members: TKAFamilyMember[]
}

export default function EditTKAWorkerPage() {
  const router = useRouter()
  const params = useParams()
  const { canEditTKAWorkers } = useAuth()
  const workerId = params.id as string

  // States
  const [worker, setWorker] = useState<TKAWorkerWithFamily | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState<CreateTKAWorkerData>({
    nama: '',
    passport: '',
    divisi: '',
    jenis_kelamin: 'Laki-laki'
  })
  
  const [familyForm, setFamilyForm] = useState({
    nama: '',
    passport: '',
    jenis_kelamin: 'Laki-laki' as const,
    relationship: 'spouse' as const
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [familyErrors, setFamilyErrors] = useState<Record<string, string>>({})
  
  // Modals
  const addFamilyModal = useModal()
  const deleteFamilyModal = useModal()
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<TKAFamilyMember | null>(null)

  // Check permissions
  if (!canEditTKAWorkers()) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">You don't have permission to edit TKA workers.</p>
        <Link href="/tka-workers">
          <Button variant="outline" className="mt-4">Back to TKA Workers</Button>
        </Link>
      </div>
    )
  }

  // Load worker data
  useEffect(() => {
    if (workerId) {
      fetchWorker()
    }
  }, [workerId])

  const fetchWorker = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tka-workers/${workerId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('TKA worker not found')
        }
        throw new Error('Failed to fetch worker')
      }
      
      const data = await response.json()
      const workerData = data.worker as TKAWorkerWithFamily
      
      setWorker(workerData)
      setFormData({
        nama: workerData.nama,
        passport: workerData.passport,
        divisi: workerData.divisi || '',
        jenis_kelamin: workerData.jenis_kelamin
      })
      
    } catch (error: any) {
      console.error('Error fetching worker:', error)
      alert(error.message || 'Failed to load worker data')
      router.push('/tka-workers')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    try {
      // Validate form data
      validateInput(tkaWorkerSchema, formData)
      setSaving(true)
      
      const response = await fetch(`/api/tka-workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update worker')
      }
      
      alert('TKA worker updated successfully!')
      router.push(`/tka-workers/${workerId}`)
      
    } catch (error: any) {
      if (error.message.includes('Validation error')) {
        setErrors({ general: error.message })
      } else if (error.message.includes('passport already exists')) {
        setErrors({ passport: 'A worker with this passport already exists' })
      } else {
        setErrors({ general: error.message })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setFamilyErrors({})
    
    try {
      // Validate family member data
      validateInput(tkaFamilyMemberSchema, familyForm)
      
      const response = await fetch(`/api/tka-workers/${workerId}/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyForm)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add family member')
      }
      
      // Reset form and close modal
      setFamilyForm({
        nama: '',
        passport: '',
        jenis_kelamin: 'Laki-laki',
        relationship: 'spouse'
      })
      addFamilyModal.close()
      fetchWorker() // Refresh data
      
    } catch (error: any) {
      if (error.message.includes('passport already exists')) {
        setFamilyErrors({ passport: 'A person with this passport already exists' })
      } else {
        setFamilyErrors({ general: error.message })
      }
    }
  }

  const handleDeleteFamilyMember = async () => {
    if (!selectedFamilyMember) return
    
    try {
      const response = await fetch(`/api/tka-workers/${workerId}/family/${selectedFamilyMember.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete family member')
      }
      
      deleteFamilyModal.close()
      setSelectedFamilyMember(null)
      fetchWorker() // Refresh data
      
    } catch (error: any) {
      console.error('Error deleting family member:', error)
      alert(error.message || 'Failed to delete family member')
    }
  }

  const genderOptions = [
    { value: GENDER_OPTIONS.MALE, label: 'Laki-laki' },
    { value: GENDER_OPTIONS.FEMALE, label: 'Perempuan' }
  ]

  const relationshipOptions = [
    { value: FAMILY_RELATIONSHIPS.SPOUSE, label: FAMILY_RELATIONSHIP_LABELS.spouse },
    { value: FAMILY_RELATIONSHIPS.PARENT, label: FAMILY_RELATIONSHIP_LABELS.parent },
    { value: FAMILY_RELATIONSHIPS.CHILD, label: FAMILY_RELATIONSHIP_LABELS.child }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">TKA worker not found.</p>
        <Link href="/tka-workers">
          <Button variant="outline" className="mt-4">Back to TKA Workers</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title={`Edit TKA Worker: ${worker.nama}`}
        description="Update TKA worker information and manage family members"
        action={
          <div className="flex space-x-2">
            <Link href={`/tka-workers/${workerId}`}>
              <Button variant="outline">View Details</Button>
            </Link>
            <Link href="/tka-workers">
              <Button variant="outline">Back to List</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Information */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateWorker} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Enter full name"
                  error={errors.nama}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passport Number *
                </label>
                <Input
                  value={formData.passport}
                  onChange={(e) => setFormData({ ...formData, passport: e.target.value.toUpperCase() })}
                  placeholder="Enter passport number"
                  error={errors.passport}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Division
                </label>
                <Input
                  value={formData.divisi}
                  onChange={(e) => setFormData({ ...formData, divisi: e.target.value })}
                  placeholder="Enter division (optional)"
                  error={errors.divisi}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <Select
                  value={formData.jenis_kelamin}
                  onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as any })}
                  options={genderOptions}
                  disabled={saving}
                />
                {errors.jenis_kelamin && (
                  <p className="mt-1 text-sm text-red-600">{errors.jenis_kelamin}</p>
                )}
              </div>

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  className="flex-1"
                >
                  Update Worker
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Family Members ({worker.family_members?.length || 0})</CardTitle>
              <Button
                size="sm"
                onClick={addFamilyModal.open}
              >
                Add Family Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!worker.family_members || worker.family_members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm">No family members added yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFamilyModal.open}
                  className="mt-2"
                >
                  Add First Family Member
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {worker.family_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {member.nama}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.passport} • {member.jenis_kelamin} • {FAMILY_RELATIONSHIP_LABELS[member.relationship]}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedFamilyMember(member)
                        deleteFamilyModal.open()
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Family Member Modal */}
      {addFamilyModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Family Member</h3>
            
            <form onSubmit={handleAddFamilyMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  value={familyForm.nama}
                  onChange={(e) => setFamilyForm({ ...familyForm, nama: e.target.value })}
                  placeholder="Enter full name"
                  error={familyErrors.nama}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passport Number *
                </label>
                <Input
                  value={familyForm.passport}
                  onChange={(e) => setFamilyForm({ ...familyForm, passport: e.target.value.toUpperCase() })}
                  placeholder="Enter passport number"
                  error={familyErrors.passport}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <Select
                  value={familyForm.jenis_kelamin}
                  onChange={(e) => setFamilyForm({ ...familyForm, jenis_kelamin: e.target.value as any })}
                  options={genderOptions}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship *
                </label>
                <Select
                  value={familyForm.relationship}
                  onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value as any })}
                  options={relationshipOptions}
                />
              </div>

              {familyErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{familyErrors.general}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addFamilyModal.close}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                >
                  Add Family Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Family Member Confirmation */}
      <ConfirmDialog
        isOpen={deleteFamilyModal.isOpen}
        onClose={deleteFamilyModal.close}
        onConfirm={handleDeleteFamilyMember}
        title="Remove Family Member"
        message={`Are you sure you want to remove ${selectedFamilyMember?.nama} from the family members? This action cannot be undone.`}
        type="danger"
      />
    </div>
  )
}