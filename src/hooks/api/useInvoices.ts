// hooks/api/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from './useAuth'
import type { 
  Invoice, 
  InvoiceWithDetails, 
  CreateInvoiceData,
  InvoiceSearchParams,
  ApiListResponse 
} from '@/lib/types'

// Get invoices with pagination and filters
export function useInvoices(params: InvoiceSearchParams = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => {
      const searchParams = new URLSearchParams()
      
      if (params.query) searchParams.set('query', params.query)
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.offset) searchParams.set('offset', params.offset.toString())
      if (params.status) searchParams.set('status', params.status)
      if (params.company_id) searchParams.set('company_id', params.company_id)
      if (params.date_from) searchParams.set('date_from', params.date_from)
      if (params.date_to) searchParams.set('date_to', params.date_to)
      if (params.amount_min) searchParams.set('amount_min', params.amount_min.toString())
      if (params.amount_max) searchParams.set('amount_max', params.amount_max.toString())
      
      return ApiClient.get<ApiListResponse<InvoiceWithDetails>>(
        `/invoices?${searchParams.toString()}`
      )
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
  })
}

// Get single invoice by ID
export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => ApiClient.get<{ invoice: InvoiceWithDetails }>(`/invoices/${id}`),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  })
}

// Create new invoice
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateInvoiceData) => 
      ApiClient.post<{ invoice: Invoice }>('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}

// Update invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceData> }) =>
      ApiClient.put<{ invoice: Invoice }>(`/invoices/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    }
  })
}

// Update invoice status
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'finalized' | 'paid' | 'cancelled' }) =>
      ApiClient.put<{ invoice: Invoice }>(`/invoices/${id}`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    }
  })
}

// Delete invoice
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => ApiClient.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}

// Generate new invoice number
export function useGenerateInvoiceNumber() {
  return useQuery({
    queryKey: ['invoice-number'],
    queryFn: () => ApiClient.get<{ invoice_number: string }>('/invoices/number'),
    enabled: false, // Only fetch when explicitly requested
    staleTime: 0,   // Always fetch fresh
  })
}

// Get invoice PDF
export function useInvoicePDF() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}/pdf`, {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      const blob = await response.blob()
      return blob
    }
  })
}

// Print invoice
export function usePrintInvoice() {
  return useMutation({
    mutationFn: (params: { id: string; copies?: number; printer?: string }) =>
      ApiClient.post<{ message: string }>(`/invoices/${params.id}/print`, {
        copies: params.copies || 1,
        printer: params.printer
      })
  })
}

// Duplicate invoice
export function useDuplicateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      ApiClient.post<{ invoice: Invoice }>(`/invoices/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}

// Import invoices
export function useImportInvoices() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      return fetch('/api/invoices/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('Import failed')
        return res.json()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}

// Export invoices
export function useExportInvoices() {
  return useMutation({
    mutationFn: async (params: {
      format: 'pdf' | 'excel' | 'csv'
      filters?: InvoiceSearchParams
    }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('format', params.format)
      
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, value.toString())
          }
        })
      }
      
      const response = await fetch(`/api/reports/export?${searchParams.toString()}`, {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      return { blob, filename: response.headers.get('content-disposition') }
    }
  })
}

// Invoice statistics
export function useInvoiceStats(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['invoice-stats', dateRange],
    queryFn: () => {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set('from', dateRange.from)
      if (dateRange?.to) params.set('to', dateRange.to)
      
      return ApiClient.get<{
        total_invoices: number
        total_amount: number
        paid_amount: number
        pending_amount: number
        by_status: Record<string, number>
        by_month: Array<{ month: string; count: number; amount: number }>
      }>(`/invoices/stats?${params.toString()}`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}