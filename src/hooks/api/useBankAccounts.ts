// hooks/api/useBankAccounts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from './useAuth'
import type { BankAccount, CreateBankAccountData } from '@/lib/types'

export function useBankAccounts(params: { 
  query?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
} = {}) {
  return useQuery({
    queryKey: ['bank-accounts', params],
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (params.query) searchParams.set('query', params.query)
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.offset) searchParams.set('offset', params.offset.toString())
      if (params.orderBy) searchParams.set('orderBy', params.orderBy)
      if (params.orderDirection) searchParams.set('orderDirection', params.orderDirection)
      
      return ApiClient.get<{ 
        bank_accounts: BankAccount[]
        pagination: any 
      }>(`/bank-accounts?${searchParams.toString()}`)
    },
    staleTime: 300000, // 5 minutes - bank accounts don't change often
    gcTime: 600000,    // 10 minutes
  })
}

export function useBankAccount(id: string) {
  return useQuery({
    queryKey: ['bank-account', id],
    queryFn: () => ApiClient.get<{ bank_account: BankAccount }>(`/bank-accounts/${id}`),
    enabled: !!id,
    staleTime: 300000, // 5 minutes
  })
}

export function useActiveBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts', 'active'],
    queryFn: () => ApiClient.get<{ bank_accounts: BankAccount[] }>('/bank-accounts?active=true'),
    staleTime: 300000, // 5 minutes
    select: (data) => data.bank_accounts.filter(account => account.is_active)
  })
}

export function useDefaultBankAccount() {
  return useQuery({
    queryKey: ['bank-accounts', 'default'],
    queryFn: () => ApiClient.get<{ bank_account: BankAccount | null }>('/bank-accounts?default=true'),
    staleTime: 300000, // 5 minutes
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateBankAccountData) =>
      ApiClient.post<{ bank_account: BankAccount; message: string }>('/bank-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    }
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateBankAccountData }) =>
      ApiClient.put<{ bank_account: BankAccount; message: string }>(`/bank-accounts/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-account', id] })
    }
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      ApiClient.delete<{ message: string }>(`/bank-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    }
  })
}

export function useSetDefaultBankAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      ApiClient.put<{ bank_account: BankAccount; message: string }>(`/bank-accounts/${id}`, { 
        is_default: true 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    }
  })
}