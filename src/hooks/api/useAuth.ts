// hooks/api/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AuthUser, LoginFormData, RegisterFormData } from '@/lib/types'

// Unified API client
class ApiClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  static get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }

  static post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  static put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  static delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

// Export the ApiClient for use in other hooks
export { ApiClient }

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => ApiClient.get<{ user: AuthUser }>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: LoginFormData) =>
      ApiClient.post<{ user: AuthUser; message: string }>('/auth/login', data),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: RegisterFormData) =>
      ApiClient.post<{ user: AuthUser; message: string }>('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => ApiClient.post<{ message: string }>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/login'
    }
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string; confirmPassword: string }) =>
      ApiClient.post<{ message: string }>('/auth/change-password', data)
  })
}