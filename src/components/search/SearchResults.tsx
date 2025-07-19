// components/search/SearchResults.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/stores/searchStore'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  isLoading: boolean
  onSelect: (result: SearchResult) => void
  maxHeight?: string
  groupByType?: boolean
  showMetadata?: boolean
}

export function SearchResults({
  results,
  query,
  isLoading,
  onSelect,
  maxHeight = '24rem',
  groupByType = true,
  showMetadata = true
}: SearchResultsProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && results[highlightedIndex]) {
            onSelect(results[highlightedIndex])
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [highlightedIndex, results, onSelect])

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [results])

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const getEntityIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'company':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'tka_worker':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'job_description':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
          </svg>
        )
      case 'invoice':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getEntityLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return 'Company'
      case 'tka_worker': return 'TKA Worker'
      case 'job_description': return 'Job'
      case 'invoice': return 'Invoice'
      default: return type
    }
  }

  const getEntityColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return 'blue'
      case 'tka_worker': return 'green'
      case 'job_description': return 'purple'
      case 'invoice': return 'orange'
      default: return 'gray'
    }
  }

  const groupedResults = groupByType 
    ? results.reduce((groups, result) => {
        const type = result.type
        if (!groups[type]) groups[type] = []
        groups[type].push(result)
        return groups
      }, {} as Record<string, SearchResult[]>)
    : { all: results }

  return (
    <div 
      className="overflow-auto"
      style={{ maxHeight }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          {query ? (
            <>
              <div className="text-lg mb-2">No results found</div>
              <div className="text-sm">
                Try adjusting your search terms or filters
              </div>
            </>
          ) : (
            <div>Start typing to search...</div>
          )}
        </div>
      ) : (
        <div className="py-2">
          {groupByType && Object.keys(groupedResults).length > 1 && (
            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
              Found {results.length} results across {Object.keys(groupedResults).length} categories
            </div>
          )}
          
          {Object.entries(groupedResults).map(([type, typeResults]) => (
            <div key={type}>
              {groupByType && type !== 'all' && Object.keys(groupedResults).length > 1 && (
                <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border-t">
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2">
                      {getEntityIcon(type as SearchResult['type'])}
                    </span>
                    {getEntityLabel(type as SearchResult['type'])}
                    <span className="ml-2 text-gray-500">({typeResults.length})</span>
                  </div>
                </div>
              )}
              
              {typeResults.map((result, typeIndex) => {
                const globalIndex = results.indexOf(result)
                const isHighlighted = globalIndex === highlightedIndex
                
                return (
                  <div
                    key={result.id}
                    onClick={() => onSelect(result)}
                    className={cn(
                      'px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0',
                      'hover:bg-gray-50 transition-colors',
                      isHighlighted && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="text-gray-400 flex-shrink-0">
                            {getEntityIcon(result.type)}
                          </div>
                          
                          <div className="font-medium text-gray-900 truncate">
                            {highlightText(result.title, query)}
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getEntityColor(result.type)}`}
                          >
                            {getEntityLabel(result.type)}
                          </Badge>
                        </div>
                        
                        {result.subtitle && (
                          <div className="text-sm text-gray-600 mt-1">
                            {highlightText(result.subtitle, query)}
                          </div>
                        )}
                        
                        {showMetadata && result.metadata && (
                          <div className="text-xs text-gray-500 mt-1 space-y-1">
                            {result.type === 'company' && (
                              <div>
                                NPWP: {result.metadata.npwp} • IDTKU: {result.metadata.idtku}
                              </div>
                            )}
                            
                            {result.type === 'tka_worker' && (
                              <div>
                                Passport: {result.metadata.passport}
                                {result.metadata.divisi && ` • ${result.metadata.divisi}`}
                              </div>
                            )}
                            
                            {result.type === 'job_description' && (
                              <div>
                                {formatCurrency(result.metadata.price)} • {result.metadata.company_name}
                              </div>
                            )}
                            
                            {result.type === 'invoice' && (
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant={result.metadata.status === 'paid' ? 'success' : 'outline'}
                                  className="text-xs"
                                >
                                  {result.metadata.status}
                                </Badge>
                                <span>•</span>
                                <span>{formatDate(result.metadata.invoice_date)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {result.type === 'invoice' && result.metadata?.total_amount && (
                        <div className="text-sm font-medium text-gray-900 ml-4">
                          {formatCurrency(result.metadata.total_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          
          {/* Show more indicator if there are many results */}
          {results.length >= 50 && (
            <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
              Showing first 50 results. Try refining your search for better results.
            </div>
          )}
        </div>
      )}
    </div>
  )
}