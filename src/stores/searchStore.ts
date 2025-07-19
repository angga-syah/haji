// stores/searchStore.ts
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEARCH } from '@/lib/constants'

interface SearchResult {
  id: string
  type: 'company' | 'tka_worker' | 'job_description' | 'invoice'
  title: string
  subtitle?: string
  metadata?: Record<string, any>
}

interface SearchCache {
  [key: string]: {
    results: SearchResult[]
    timestamp: number
    total: number
  }
}

interface SearchFilters {
  companies?: string[]
  status?: string[]
  dateRange?: {
    from: string
    to: string
  }
  amountRange?: {
    min: number
    max: number
  }
}

interface SearchState {
  // Current search
  query: string
  results: SearchResult[]
  isSearching: boolean
  filters: SearchFilters
  
  // Cache
  cache: SearchCache
  
  // History
  searchHistory: string[]
  
  // Settings
  maxResults: number
  
  // Actions
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setSearching: (searching: boolean) => void
  setFilters: (filters: SearchFilters) => void
  
  // Cache management
  getCachedResults: (query: string, filters?: SearchFilters) => SearchResult[] | null
  setCachedResults: (query: string, results: SearchResult[], total: number, filters?: SearchFilters) => void
  clearCache: () => void
  clearExpiredCache: () => void
  
  // History
  addToHistory: (query: string) => void
  clearHistory: () => void
  
  // Utilities
  reset: () => void
  getRecentSearches: () => string[]
}

const initialFilters: SearchFilters = {}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      results: [],
      isSearching: false,
      filters: initialFilters,
      cache: {},
      searchHistory: [],
      maxResults: SEARCH.MAX_RESULTS,

      setQuery: (query) => set({ query }),

      setResults: (results) => set({ results }),

      setSearching: (isSearching) => set({ isSearching }),

      setFilters: (filters) => set({ filters }),

      getCachedResults: (query, filters = {}) => {
        const { cache } = get()
        const cacheKey = generateCacheKey(query, filters)
        const cached = cache[cacheKey]
        
        if (!cached) return null
        
        // Check if cache is expired
        const isExpired = Date.now() - cached.timestamp > SEARCH.CACHE_DURATION
        if (isExpired) {
          // Remove expired cache
          const newCache = { ...cache }
          delete newCache[cacheKey]
          set({ cache: newCache })
          return null
        }
        
        return cached.results
      },

      setCachedResults: (query, results, total, filters = {}) => {
        const { cache } = get()
        const cacheKey = generateCacheKey(query, filters)
        
        const newCache = {
          ...cache,
          [cacheKey]: {
            results,
            total,
            timestamp: Date.now()
          }
        }
        
        set({ cache: newCache })
      },

      clearCache: () => set({ cache: {} }),

      clearExpiredCache: () => {
        const { cache } = get()
        const now = Date.now()
        const newCache: SearchCache = {}
        
        Object.entries(cache).forEach(([key, value]) => {
          if (now - value.timestamp <= SEARCH.CACHE_DURATION) {
            newCache[key] = value
          }
        })
        
        set({ cache: newCache })
      },

      addToHistory: (query) => {
        if (!query.trim() || query.length < SEARCH.MIN_SEARCH_LENGTH) return
        
        const { searchHistory } = get()
        const newHistory = [
          query,
          ...searchHistory.filter(item => item !== query)
        ].slice(0, 10) // Keep only last 10 searches
        
        set({ searchHistory: newHistory })
      },

      clearHistory: () => set({ searchHistory: [] }),

      reset: () => set({
        query: '',
        results: [],
        isSearching: false,
        filters: initialFilters
      }),

      getRecentSearches: () => {
        const { searchHistory } = get()
        return searchHistory.slice(0, 5) // Return last 5 searches
      }
    }),
    {
      name: 'search-store',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        // Don't persist cache - let it rebuild on app start
      }),
    }
  )
)

// Helper function to generate cache keys
function generateCacheKey(query: string, filters: SearchFilters = {}): string {
  const filterString = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|')
  
  return `${query}|${filterString}`
}

// Export cache utilities
export const searchUtils = {
  generateCacheKey,
  
  // Create search result from different entity types
  createCompanyResult: (company: any): SearchResult => ({
    id: company.id,
    type: 'company',
    title: company.company_name,
    subtitle: `NPWP: ${company.npwp}`,
    metadata: {
      npwp: company.npwp,
      idtku: company.idtku,
      address: company.address
    }
  }),
  
  createTKAResult: (worker: any): SearchResult => ({
    id: worker.id,
    type: 'tka_worker',
    title: worker.nama,
    subtitle: `Passport: ${worker.passport}`,
    metadata: {
      passport: worker.passport,
      divisi: worker.divisi,
      jenis_kelamin: worker.jenis_kelamin
    }
  }),
  
  createJobResult: (job: any): SearchResult => ({
    id: job.id,
    type: 'job_description',
    title: job.job_name,
    subtitle: job.company_name,
    metadata: {
      price: job.price,
      company_id: job.company_id,
      company_name: job.company_name
    }
  }),
  
  createInvoiceResult: (invoice: any): SearchResult => ({
    id: invoice.id,
    type: 'invoice',
    title: invoice.invoice_number,
    subtitle: `${invoice.company_name} - ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoice.total_amount)}`,
    metadata: {
      status: invoice.status,
      company_name: invoice.company_name,
      total_amount: invoice.total_amount,
      invoice_date: invoice.invoice_date
    }
  })
}