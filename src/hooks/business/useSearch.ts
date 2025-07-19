// hooks/business/useSearch.ts
import { useState, useEffect, useMemo } from 'react'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { useLocalStorage } from '@/hooks/ui/useLocalStorage'
import { SEARCH } from '@/lib/constants'

interface SearchResult<T> {
  id: string
  data: T
  relevance: number
  highlights?: string[]
}

interface UseSearchOptions {
  debounceMs?: number
  minSearchLength?: number
  maxResults?: number
  enableHistory?: boolean
  enableCache?: boolean
}

interface UseSearchReturn<T> {
  query: string
  setQuery: (query: string) => void
  debouncedQuery: string
  results: SearchResult<T>[]
  isSearching: boolean
  searchHistory: string[]
  clearHistory: () => void
  addToHistory: (query: string) => void
}

/**
 * Hook for smart search with debouncing, history, and caching
 */
export function useSearch<T>(
  searchFunction: (query: string) => Promise<T[]>,
  options: UseSearchOptions = {}
): UseSearchReturn<T> {
  const {
    debounceMs = SEARCH.DEBOUNCE_DELAY,
    minSearchLength = SEARCH.MIN_SEARCH_LENGTH,
    maxResults = SEARCH.MAX_RESULTS,
    enableHistory = true,
    enableCache = true
  } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult<T>[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Search history storage
  const [searchHistory, setSearchHistory, clearHistory] = useLocalStorage<string[]>(
    'search-history',
    []
  )
  
  // Search cache
  const [searchCache, setSearchCache] = useState<Map<string, SearchResult<T>[]>>(new Map())
  
  const debouncedQuery = useDebounce(query, debounceMs)

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < minSearchLength) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      try {
        // Check cache first
        if (enableCache && searchCache.has(debouncedQuery)) {
          const cachedResults = searchCache.get(debouncedQuery)!
          setResults(cachedResults.slice(0, maxResults))
          setIsSearching(false)
          return
        }

        // Perform actual search
        const searchResults = await searchFunction(debouncedQuery)
        
        // Convert to SearchResult format with relevance scoring
        const formattedResults: SearchResult<T>[] = searchResults.map((item, index) => ({
          id: (item as any).id || index.toString(),
          data: item,
          relevance: calculateRelevance(debouncedQuery, item),
          highlights: generateHighlights(debouncedQuery, item)
        }))

        // Sort by relevance
        formattedResults.sort((a, b) => b.relevance - a.relevance)

        // Cache results
        if (enableCache) {
          const newCache = new Map(searchCache)
          newCache.set(debouncedQuery, formattedResults)
          
          // Limit cache size
          if (newCache.size > 50) {
            const firstKey = newCache.keys().next().value
            newCache.delete(firstKey)
          }
          
          setSearchCache(newCache)
        }

        setResults(formattedResults.slice(0, maxResults))
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [debouncedQuery, minSearchLength, maxResults, enableCache, searchCache, searchFunction])

  // Add to search history
  const addToHistory = (searchQuery: string) => {
    if (!enableHistory || !searchQuery.trim()) return

    const trimmedQuery = searchQuery.trim()
    const newHistory = [
      trimmedQuery,
      ...searchHistory.filter(item => item !== trimmedQuery)
    ].slice(0, 10) // Keep only last 10 searches

    setSearchHistory(newHistory)
  }

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    isSearching,
    searchHistory,
    clearHistory,
    addToHistory
  }
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevance<T>(query: string, item: T): number {
  const searchTerms = query.toLowerCase().split(' ').filter(Boolean)
  const itemText = JSON.stringify(item).toLowerCase()
  
  let score = 0
  
  searchTerms.forEach(term => {
    // Exact match gets highest score
    if (itemText.includes(term)) {
      score += 10
    }
    
    // Partial matches get lower scores
    for (let i = 1; i < term.length; i++) {
      const partial = term.substring(0, i)
      if (itemText.includes(partial)) {
        score += i
      }
    }
  })
  
  return score
}

/**
 * Generate highlights for search results
 */
function generateHighlights<T>(query: string, item: T): string[] {
  const highlights: string[] = []
  const searchTerms = query.toLowerCase().split(' ').filter(Boolean)
  const itemText = JSON.stringify(item).toLowerCase()
  
  searchTerms.forEach(term => {
    const index = itemText.indexOf(term)
    if (index !== -1) {
      const start = Math.max(0, index - 20)
      const end = Math.min(itemText.length, index + term.length + 20)
      highlights.push(itemText.substring(start, end))
    }
  })
  
  return highlights
}

/**
 * Hook for multi-entity search (companies, TKA workers, invoices)
 */
export function useMultiSearch() {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['all']))
  const [results, setResults] = useState<{
    companies: any[]
    tka_workers: any[]
    invoices: any[]
  }>({
    companies: [],
    tka_workers: [],
    invoices: []
  })

  const debouncedQuery = useDebounce(query, SEARCH.DEBOUNCE_DELAY)

  const toggleFilter = (filter: string) => {
    const newFilters = new Set(activeFilters)
    
    if (filter === 'all') {
      setActiveFilters(new Set(['all']))
    } else {
      newFilters.delete('all')
      if (newFilters.has(filter)) {
        newFilters.delete(filter)
      } else {
        newFilters.add(filter)
      }
      
      if (newFilters.size === 0) {
        newFilters.add('all')
      }
      
      setActiveFilters(newFilters)
    }
  }

  const clearFilters = () => {
    setActiveFilters(new Set(['all']))
  }

  const totalResults = useMemo(() => {
    return results.companies.length + results.tka_workers.length + results.invoices.length
  }, [results])

  return {
    query,
    setQuery,
    debouncedQuery,
    activeFilters,
    toggleFilter,
    clearFilters,
    results,
    setResults,
    totalResults
  }
}

/**
 * Hook for saved searches
 */
export function useSavedSearches() {
  const [savedSearches, setSavedSearches, clearSavedSearches] = useLocalStorage<Array<{
    id: string
    name: string
    query: string
    filters: Record<string, any>
    createdAt: string
  }>>('saved-searches', [])

  const saveSearch = (name: string, query: string, filters: Record<string, any> = {}) => {
    const newSearch = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      createdAt: new Date().toISOString()
    }

    setSavedSearches(prev => [newSearch, ...prev.slice(0, 9)]) // Keep only 10 saved searches
  }

  const deleteSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id))
  }

  const loadSearch = (id: string) => {
    return savedSearches.find(search => search.id === id)
  }

  return {
    savedSearches,
    saveSearch,
    deleteSearch,
    loadSearch,
    clearSavedSearches
  }
}