// components/search/CompanySearch.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useCompanies } from '@/hooks/api/useCompanies'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { cn } from '@/lib/utils'
import type { Company } from '@/lib/types'

interface CompanySearchProps {
  onSelect: (company: Company) => void
  selected?: Company | null
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showDetails?: boolean
}

export function CompanySearch({
  onSelect,
  selected,
  placeholder = "Search companies...",
  disabled = false,
  size = 'md',
  className,
  showDetails = true
}: CompanySearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  const { data, isLoading } = useCompanies(debouncedQuery)
  
  // Filtered results
  const filteredCompanies = React.useMemo(() => {
    if (!data?.companies) return []
    
    return data.companies
      .filter(company => company.is_active)
      .slice(0, 10) // Limit results
  }, [data?.companies])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < filteredCompanies.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCompanies.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && filteredCompanies[highlightedIndex]) {
            handleSelect(filteredCompanies[highlightedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setHighlightedIndex(-1)
          inputRef.current?.blur()
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, highlightedIndex, filteredCompanies])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [highlightedIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  const handleSelect = (company: Company) => {
    onSelect(company)
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow clicks on list items
    setTimeout(() => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }, 150)
  }

  const sizeClasses = {
    sm: 'text-sm py-1',
    md: 'text-base py-2',
    lg: 'text-lg py-3'
  }

  return (
    <div className={cn('relative', className)}>
      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={selected ? selected.company_name : query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-8',
            sizeClasses[size]
          )}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
        
        {/* Clear button */}
        {(selected || query) && !disabled && (
          <button
            type="button"
            onClick={() => {
              if (selected) {
                onSelect(null as any) // Clear selection
              }
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div ref={listRef}>
            {isLoading ? (
              <div className="px-4 py-3 text-center text-gray-500">
                <LoadingSpinner size="sm" className="inline mr-2" />
                Searching...
              </div>
            ) : filteredCompanies.length > 0 ? (
              filteredCompanies.map((company, index) => (
                <div
                  key={company.id}
                  onClick={() => handleSelect(company)}
                  className={cn(
                    'px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0',
                    'hover:bg-gray-50 transition-colors',
                    index === highlightedIndex && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {company.company_name}
                      </div>
                      
                      {showDetails && (
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>NPWP: {company.npwp}</div>
                          <div>IDTKU: {company.idtku}</div>
                          <div className="truncate">{company.address}</div>
                          {company.contact_phone && (
                            <div>Phone: {company.contact_phone}</div>
                          )}
                          {company.contact_email && (
                            <div>Email: {company.contact_email}</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Active
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : debouncedQuery ? (
              <div className="px-4 py-3 text-center text-gray-500">
                No companies found matching "{debouncedQuery}"
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-gray-500">
                Start typing to search companies...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected company display */}
      {selected && showDetails && (
        <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
          <div className="font-medium text-gray-900">{selected.company_name}</div>
          <div className="text-gray-600 space-y-1 mt-1">
            <div>NPWP: {selected.npwp}</div>
            <div>IDTKU: {selected.idtku}</div>
            <div>{selected.address}</div>
            {selected.contact_phone && <div>Phone: {selected.contact_phone}</div>}
            {selected.contact_email && <div>Email: {selected.contact_email}</div>}
          </div>
        </div>
      )}
    </div>
  )
}