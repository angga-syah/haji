// components/search/SmartSearch.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { SearchResults } from './SearchResults'
import { SearchFilters } from './SearchFilters'
import { useSearchStore, searchUtils } from '@/stores/searchStore'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { useSearch } from '@/hooks/business/useSearch'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/stores/searchStore'

interface SmartSearchProps {
  onSelect?: (result: SearchResult) => void
  placeholder?: string
  showFilters?: boolean
  entityTypes?: ('company' | 'tka_worker' | 'job_description' | 'invoice')[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
  autoFocus?: boolean
}

export function SmartSearch({
  onSelect,
  placeholder = "Search companies, workers, jobs, invoices...",
  showFilters = true,
  entityTypes = ['company', 'tka_worker', 'job_description', 'invoice'],
  className,
  size = 'md',
  autoFocus = false
}: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    query,
    results,
    isSearching,
    filters,
    searchHistory,
    setQuery,
    setResults,
    setSearching,
    setFilters,
    addToHistory,
    getCachedResults,
    setCachedResults,
    getRecentSearches
  } = useSearchStore()
  
  const debouncedQuery = useDebounce(query, 300)
  const { performSearch } = useSearch()

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      handleSearch(debouncedQuery)
    } else {
      setResults([])
    }
  }, [debouncedQuery, filters])

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowFiltersPanel(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    // Check cache first
    const cachedResults = getCachedResults(searchQuery, filters)
    if (cachedResults) {
      setResults(cachedResults)
      return
    }

    setSearching(true)
    
    try {
      const searchResults = await performSearch({
        query: searchQuery,
        entityTypes,
        filters,
        limit: 50
      })

      // Transform API results to SearchResult format
      const formattedResults: SearchResult[] = []
      
      if (searchResults.companies) {
        searchResults.companies.forEach(company => {
          formattedResults.push(searchUtils.createCompanyResult(company))
        })
      }
      
      if (searchResults.tka_workers) {
        searchResults.tka_workers.forEach(worker => {
          formattedResults.push(searchUtils.createTKAResult(worker))
        })
      }
      
      if (searchResults.job_descriptions) {
        searchResults.job_descriptions.forEach(job => {
          formattedResults.push(searchUtils.createJobResult(job))
        })
      }
      
      if (searchResults.invoices) {
        searchResults.invoices.forEach(invoice => {
          formattedResults.push(searchUtils.createInvoiceResult(invoice))
        })
      }

      setResults(formattedResults)
      
      // Cache results
      setCachedResults(searchQuery, formattedResults, formattedResults.length, filters)
      
      // Add to search history
      addToHistory(searchQuery)
      
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleSelect = (result: SearchResult) => {
    onSelect?.(result)
    setIsOpen(false)
    addToHistory(query)
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
    if (query.length >= 2) {
      handleSearch(query)
    }
  }

  const handleRecentSearchSelect = (recentQuery: string) => {
    setQuery(recentQuery)
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const recentSearches = getRecentSearches()
  const shouldShowRecents = isOpen && !query && recentSearches.length > 0
  const shouldShowResults = isOpen && (query.length >= 2 || results.length > 0)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-20',
            sizeClasses[size]
          )}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* Loading indicator */}
          {isSearching && (
            <LoadingSpinner size="sm" className="mr-2" />
          )}
          
          {/* Filters toggle */}
          {showFilters && (
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(
                'mr-2 p-1 rounded text-gray-400 hover:text-gray-600',
                showFiltersPanel && 'text-blue-600 bg-blue-50'
              )}
              title="Search filters"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707L9 19.414a1 1 0 01-.707.293H8a1 1 0 01-1-1v-5.586a1 1 0 00-.293-.707L.293 7.707A1 1 0 010 7V4z" />
              </svg>
            </button>
          )}
          
          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
                setIsOpen(false)
                inputRef.current?.focus()
              }}
              className="mr-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFiltersPanel && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            entityTypes={entityTypes}
          />
        </div>
      )}

      {/* Search Results or Recent Searches */}
      {(shouldShowResults || shouldShowRecents) && !showFiltersPanel && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {shouldShowRecents ? (
            /* Recent Searches */
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Recent Searches</div>
              <div className="space-y-2">
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchSelect(recentQuery)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {recentQuery}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Search Results */
            <SearchResults
              results={results}
              query={query}
              isLoading={isSearching}
              onSelect={handleSelect}
              maxHeight="20rem"
            />
          )}
        </div>
      )}

      {/* Search tips */}
      {isOpen && !query && recentSearches.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-2">Search Tips:</div>
            <ul className="space-y-1 text-xs">
              <li>• Search by company name, NPWP, or address</li>
              <li>• Search by worker name or passport number</li>
              <li>• Search by job description or invoice number</li>
              <li>• Use filters to narrow down results</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}