// src/app/(dashboard)/tka-workers/[id]/family/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTKAWorker } from '@/hooks/api/useTKAWorkers'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Users,
  CreditCard,
  Heart,
  Baby,
  UserCheck
} from 'lucide-react'

interface TKAFamilyPageProps {
  params: { id: string }
}

interface FamilyMemberForm {
  nama: string
  passport: string
  jenis_kelamin: 'Laki-laki' | 'Perempuan'
  relationship: 'spouse' | 'parent' | 'child'
}

const initialFormData: FamilyMemberForm = {
  nama: '',
  passport: '',
  jenis_kelamin: 'Laki-laki',
  relationship: 'spouse'
}

export default function TKAFamilyPage({ params }: TKAFamilyPageProps) {
  const router = useRouter()
  const { canManageTKAWorkers } = useAuth()
  
  // State
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FamilyMemberForm>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // API hooks
  const { data: workerData, isLoading, error } = useTKAWorker(params.id)

  const worker = workerData?.tka_worker
  const familyMembers = worker?.family_members || []

  if (isLoading) return <LoadingSpinner />

  if (error || !worker) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">TKA Worker Not Found</h2>
          <p className="text-gray-600 mb-4">The TKA worker you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/tka-workers')}>
            Back to TKA Workers
          </Button>
        </div>
      </div>
    )
  }

  if (!canManageTKAWorkers) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to manage family members.</p>
          <Button onClick={() => router.push(`/tka-workers/${params.id}`)}>
            View Worker
          </Button>
        </div>
      </div>
    )
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.nama.trim()) {
      errors.nama = 'Name is required'
    }
    
    if (!formData.passport.trim()) {
      errors.passport = 'Passport number is required'
    } else if (formData.passport.length < 3) {
      errors.passport = 'Passport number must be at least 3 characters'
    }
    
    // Check for duplicate passport (excluding the one being edited)
    const existingPassports = familyMembers
      .filter(member => editingMember ? member.id !== editingMember.id : true)
      .map(member => member.passport)
      
    if (existingPassports.includes(formData.passport)) {
      errors.passport = 'Passport number already exists'
    }
    
    // Check against main worker passport
    if (formData.passport === worker.passport) {
      errors.passport = 'Passport number cannot be same as main worker'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Here you would call the actual API
      // if (editingMember) {
      //   await updateFamilyMember(editingMember.id, formData)
      // } else {
      //   await createFamilyMember(params.id, formData)
      // }
      
      // Reset form and close modal
      setFormData(initialFormData)
      setFormErrors({})
      setShowAddModal(false)
      setEditingMember(null)
      
      // Refresh data would happen automatically with React Query
      
    } catch (error) {
      console.error('Failed to save family member:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (member: any) => {
    setFormData({
      nama: member.nama,
      passport: member.passport,
      jenis_kelamin: member.jenis_kelamin,
      relationship: member.relationship
    })
    setFormErrors({})
    setEditingMember(member)
  }

  const handleDelete = async () => {
    if (!deleteMemberId) return
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Here you would call the actual API
      // await deleteFamilyMember(deleteMemberId)
      
      setDeleteMemberId(null)
      
    } catch (error) {
      console.error('Failed to delete family member:', error)
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setFormErrors({})
    setEditingMember(null)
  }

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'spouse': return Heart
      case 'parent': return UserCheck
      case 'child': return Baby
      default: return User
    }
  }

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'spouse': return 'Spouse'
      case 'parent': return 'Parent'
      case 'child': return 'Child'
      default: return 'Family'
    }
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['admin', 'finance_staff']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <PageTitle 
                title={`Family Members - ${worker.nama}`}
                subtitle={`Manage family members for ${worker.passport}`}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/tka-workers/${params.id}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Worker
              </Button>
              
              <Button
                onClick={() => setShowAddModal(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Family Member
              </Button>
            </div>
          </div>

          {/* Worker Summary */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{worker.nama}</h3>
                <p className="text-gray-600">
                  {worker.passport} • {worker.jenis_kelamin} • {worker.divisi || 'No division'}
                </p>
              </div>
              <div className="ml-auto">
                <Badge variant={worker.is_active ? 'default' : 'secondary'}>
                  {worker.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Family Members List */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Family Members ({familyMembers.length})</h3>
              <Button
                onClick={() => setShowAddModal(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Member
              </Button>
            </div>
            
            {familyMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h4 className="text-lg font-medium mb-2">No family members yet</h4>
                <p className="mb-4">Add family members to include them in invoices</p>
                <Button onClick={() => setShowAddModal(true)}>
                  Add First Family Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map((member) => {
                  const RelationIcon = getRelationshipIcon(member.relationship)
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <RelationIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        
                        <div>
                          <div className="font-medium">{member.nama}</div>
                          <div className="text-sm text-gray-500 space-x-2">
                            <span className="inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {member.passport}
                            </span>
                            <span>•</span>
                            <span>{getRelationshipLabel(member.relationship)}</span>
                            <span>•</span>
                            <span>{member.jenis_kelamin}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteMemberId(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Guidelines */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Family Member Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Family members can be included in invoices with the same job pricing</li>
              <li>• Each family member must have a unique passport number</li>
              <li>• Relationship types: Spouse, Parent, or Child</li>
              <li>• Inactive family members won't appear in invoice options</li>
              <li>• Family members inherit job assignments from the main worker</li>
            </ul>
          </Card>

          {/* Add/Edit Modal */}
          <Modal
            isOpen={showAddModal || !!editingMember}
            onClose={() => {
              setShowAddModal(false)
              resetForm()
            }}
            title={editingMember ? 'Edit Family Member' : 'Add Family Member'}
            size="lg"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <Input
                  value={formData.nama}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Enter full name"
                  error={formErrors.nama}
                />
                {formErrors.nama && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.nama}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passport Number *
                </label>
                <Input
                  value={formData.passport}
                  onChange={(e) => setFormData(prev => ({ ...prev, passport: e.target.value }))}
                  placeholder="Enter passport number"
                  error={formErrors.passport}
                />
                {formErrors.passport && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.passport}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <Select
                    value={formData.jenis_kelamin}
                    onValueChange={(value: 'Laki-laki' | 'Perempuan') => 
                      setFormData(prev => ({ ...prev, jenis_kelamin: value }))
                    }
                  >
                    <option value="Laki-laki">Male (Laki-laki)</option>
                    <option value="Perempuan">Female (Perempuan)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value: 'spouse' | 'parent' | 'child') => 
                      setFormData(prev => ({ ...prev, relationship: value }))
                    }
                  >
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Family Member'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Confirmation */}
          <ConfirmDialog
            isOpen={!!deleteMemberId}
            onClose={() => setDeleteMemberId(null)}
            onConfirm={handleDelete}
            title="Delete Family Member"
            description="Are you sure you want to delete this family member? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
          />
        </div>
      </RoleGuard>
    </ProtectedRoute>
  )
}