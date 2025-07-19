// hooks/api/useCompanies.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from './useAuth'
import type { Company, CompanyWithJobs, CreateCompanyData } from '@/lib/types'

export function useCompanies(params: { 
  query?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
} = {}) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (params.query) searchParams.set('query', params.query)
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.offset) searchParams.set('offset', params.offset.toString())
      if (params.orderBy) searchParams.set('orderBy', params.orderBy)
      if (params.orderDirection) searchParams.set('orderDirection', params.orderDirection)
      
      return ApiClient.get<{ 
        companies: CompanyWithJobs[]
        pagination: any 
      }>(`/companies?${searchParams.toString()}`)
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => ApiClient.get<{ company: CompanyWithJobs }>(`/companies/${id}`),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateCompanyData) =>
      ApiClient.post<{ company: Company; message: string }>('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCompanyData }) =>
      ApiClient.put<{ company: Company; message: string }>(`/companies/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company', id] })
    }
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      ApiClient.delete<{ message: string }>(`/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

export function useSearchCompanies(query?: string) {
  return useQuery({
    queryKey: ['companies', 'search', query],
    queryFn: () => {
      const params = query ? `?q=${encodeURIComponent(query)}` : ''
      return ApiClient.get<{ companies: Company[] }>(`/companies/search${params}`)
    },
    enabled: !!query && query.length >= 2,
    staleTime: 60000, // 1 minute
  })
}
