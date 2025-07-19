// src/app/(dashboard)/settings/banks/page.tsx
'use client'

import { useState } from 'react'
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount, useSetDefaultBankAccount } from '@/hooks/api/useBankAccounts'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { BankAccountForm } from '@/components/forms/BankAccountForm'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  Plus, 
  CreditCard, 
  Star, 
  Edit, 
  Trash2, 
  Building,
  Hash,
  User,
  CheckCircle
} from 'lucide-react'

export default function BankAccountsPage() {
  const { isAdmin } = useAuth()
  
  // State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBank, setEditingBank] = useState<any>(null)
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null)
  
  // API hooks
  const { data: banksData, isLoading, error } = useBankAccounts()
  const createBankMutation = useCreateBankAccount()
  const updateBankMutation = useUpdateBankAccount()
  const deleteBankMutation = useDeleteBankAccount()
  const setDefaultMutation = useSetDefaultBankAccount()

  const banks = banksData?.bank_accounts || []

  const handleCreate = async (formData: any) => {
    try {
      await createBankMutation.mutateAsync(formData)
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create bank account:', error)
      throw error
    }
  }

  const handleUpdate = async (formData: any) => {
    if (!editingBank) return
    
    try {
      await updateBankMutation.mutateAsync({
        id: editingBank.id,
        data: formData
      })
      setEditingBank(null)
    } catch (error) {
      console.error('Failed to update bank account:', error)
      throw error
    }
  }

  const handleDelete = async () => {
    if (!deleteBankId) return
    
    try {
      await deleteBankMutation.mutateAsync(deleteBankId)
      setDeleteBankId(null)
    } catch (error) {
      console.error('Failed to delete bank account:', error)
    }
  }

  const handleSetDefault = async (bankId: string) => {
    try {
      await setDefaultMutation.mutateAsync(bankId)
    } catch (error) {
      console.error('Failed to set default bank:', error)
    }
  }

  const defaultBank = banks.find(bank => bank.is_default)
  const activeBanks = banks.filter(bank => bank.is_active)

  if (isLoading) return <LoadingSpinner />

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['admin']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageTitle 
              title="Bank Accounts" 
              subtitle="Manage bank accounts for invoice payments"
            />
            
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Accounts</p>
                  <p className="text-xl font-semibold">{banks.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Accounts</p>
                  <p className="text-xl font-semibold">{activeBanks.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Default Account</p>
                  <p className="text-xl font-semibold">{defaultBank ? '1' : '0'}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Bank Accounts List */}
          {error ? (
            <Card className="p-6">
              <div className="text-center text-red-600">
                <p>Error loading bank accounts</p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </Card>
          ) : banks.length === 0 ? (
            <Card className="p-6">
              <div className="text-center text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No bank accounts yet</p>
                <p className="mb-4">Add bank accounts to include payment details in invoices</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Add First Bank Account
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {banks.map((bank) => (
                <Card key={bank.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{bank.bank_name}</h3>
                          {bank.is_default && (
                            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          <Badge variant={bank.is_active ? 'default' : 'secondary'}>
                            {bank.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Account:</span>
                            <span className="font-mono">{bank.account_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Name:</span>
                            <span>{bank.account_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!bank.is_default && bank.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(bank.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingBank(bank)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteBankId(bank.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={bank.is_default}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Help Section */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Bank Account Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Bank accounts will appear as payment options in invoices</li>
              <li>• The default bank account will be pre-selected for new invoices</li>
              <li>• Only one bank account can be set as default at a time</li>
              <li>• Inactive bank accounts won't appear in invoice options</li>
              <li>• Default bank accounts cannot be deleted</li>
            </ul>
          </Card>

          {/* Create Modal */}
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Add Bank Account"
            size="lg"
          >
            <BankAccountForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              isSubmitting={createBankMutation.isPending}
              submitText="Add Bank Account"
            />
          </Modal>

          {/* Edit Modal */}
          <Modal
            isOpen={!!editingBank}
            onClose={() => setEditingBank(null)}
            title="Edit Bank Account"
            size="lg"
          >
            {editingBank && (
              <BankAccountForm
                initialData={{
                  bank_name: editingBank.bank_name,
                  account_number: editingBank.account_number,
                  account_name: editingBank.account_name,
                  is_default: editingBank.is_default
                }}
                onSubmit={handleUpdate}
                onCancel={() => setEditingBank(null)}
                isSubmitting={updateBankMutation.isPending}
                submitText="Save Changes"
                mode="edit"
              />
            )}
          </Modal>

          {/* Delete Confirmation */}
          <ConfirmDialog
            isOpen={!!deleteBankId}
            onClose={() => setDeleteBankId(null)}
            onConfirm={handleDelete}
            title="Delete Bank Account"
            description="Are you sure you want to delete this bank account? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
          />
        </div>
      </RoleGuard>
    </ProtectedRoute>
  )
}