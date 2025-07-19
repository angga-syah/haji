// hooks/api/useTKAWorkers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from './useAuth'
import type { TKAWorker, TKAWorkerWithFamily, CreateTKAWorkerData } from '@/lib/types'

export function useTKAWorkers(params: { 
  query?: string
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
} = {}) {
  return useQuery({
    queryKey: ['tka-workers', params],
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (params.query) searchParams.set('query', params.query)
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.offset) searchParams.set('offset', params.offset.toString())
      if (params.orderBy) searchParams.set('orderBy', params.orderBy)
      if (params.orderDirection) searchParams.set('orderDirection', params.orderDirection)
      
      return ApiClient.get<{ 
        tka_workers: TKAWorkerWithFamily[]
        pagination: any 
      }>(`/tka-workers?${searchParams.toString()}`)
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
  })
}

export function useTKAWorker(id: string) {
  return useQuery({
    queryKey: ['tka-worker', id],
    queryFn: () => ApiClient.get<{ tka_worker: TKAWorkerWithFamily }>(`/tka-workers/${id}`),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  })
}

export function useCreateTKAWorker() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateTKAWorkerData) =>
      ApiClient.post<{ tka_worker: TKAWorker; message: string }>('/tka-workers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tka-workers'] })
    }
  })
}

export function useUpdateTKAWorker() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTKAWorkerData }) =>
      ApiClient.put<{ tka_worker: TKAWorker; message: string }>(`/tka-workers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tka-workers'] })
      queryClient.invalidateQueries({ queryKey: ['tka-worker', id] })
    }
  })
}

export function useDeleteTKAWorker() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      ApiClient.delete<{ message: string }>(`/tka-workers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tka-workers'] })
    }
  })
}

export function useSearchTKAWorkers(query?: string, includeFamily: boolean = true) {
  return useQuery({
    queryKey: ['tka-workers', 'search', query, includeFamily],
    queryFn: () => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (includeFamily) params.set('include_family', 'true')
      
      return ApiClient.get<{ workers: any[] }>(`/tka-workers/search?${params.toString()}`)
    },
    enabled: !!query && query.length >= 2,
    staleTime: 60000, // 1 minute
  })
}