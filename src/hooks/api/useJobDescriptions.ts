// hooks/api/useJobDescriptions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from './useAuth'
import type { JobDescription, CreateJobDescriptionData } from '@/lib/types'

export function useJobDescriptions(companyId?: string) {
  return useQuery({
    queryKey: ['job-descriptions', companyId],
    queryFn: () => {
      const params = companyId ? `?company_id=${companyId}` : ''
      return ApiClient.get<{ job_descriptions: JobDescription[] }>(`/job-descriptions${params}`)
    },
    enabled: !!companyId,
    staleTime: 300000, // 5 minutes
  })
}

export function useJobDescription(id: string) {
  return useQuery({
    queryKey: ['job-description', id],
    queryFn: () => ApiClient.get<{ job_description: JobDescription }>(`/job-descriptions/${id}`),
    enabled: !!id,
  })
}

export function useCreateJobDescription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateJobDescriptionData) =>
      ApiClient.post<{ job_description: JobDescription; message: string }>('/job-descriptions', data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      queryClient.invalidateQueries({ queryKey: ['job-descriptions', data.company_id] })
    }
  })
}

export function useUpdateJobDescription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateJobDescriptionData }) =>
      ApiClient.put<{ job_description: JobDescription; message: string }>(`/job-descriptions/${id}`, data),
    onSuccess: (result, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
      queryClient.invalidateQueries({ queryKey: ['job-descriptions', data.company_id] })
    }
  })
}

export function useDeleteJobDescription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      ApiClient.delete<{ message: string }>(`/job-descriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-descriptions'] })
    }
  })
}