// components/search/TKASearch.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useTKAWorkers } from '@/hooks/api/useTKAWorkers'
import { useDebounce } from '@/hooks/ui/useDebounce'
import { cn } from '@/lib/utils'
import type { TKAWorker } from '@/lib/types'

interface TKASearchProps {
  onSelect: (tka: TKAWorker) => void
  selected?: TKAWorker | null
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  includeFamilyMembers?: boolean
}

export function TKASearch({
  onSelect,
  selected,
  placeholder = "Search TKA workers...",
  disabled = false,
  size = 'md',
  className,
  includeFamilyMembers = true
}: TKASearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  const { data, isLoading } = useTKAWorkers(debouncedQuery)
  
  // All workers including family members
  const allWorkers = React.useMemo(() => {
    if (!data?.workers) return []
    
    let workers = [...data.workers]
    
    if (includeFamilyMembers) {
      // Add family members as virtual workers
      data.workers.forEach(worker => {
        if (worker.family_members) {
          worker.family_members.forEach(family => {
            workers.push({
              id: family.id,
              nama: family.nama,
              passport: family.passport,
              divisi: worker.divisi,
              jenis_kelamin: family.jenis_kelamin,
              is_active: family.is_active,
              created_by: worker.created_by,
              created_at: family.created_at,
              updated_at: worker.updated_at,
              // Mark as family member
              _is_family_member: true,
              _parent_worker: worker.nama,
              _relationship: family.relationship
            } as any)
          })
        }
      })
    }
    
    return workers.filter(worker => worker.is_active)
  }, [data?.workers, includeFamilyMembers])

  // Filtered results based on query
  const filteredWorkers = React.useMemo(() => {
    if (!debouncedQuery.trim()) return allWorkers.slice(0, 10)
    
    const queryLower = debouncedQuery.toLowerCase()
    return allWorkers
      .filter(worker => 
        worker.nama.toLowerCase().includes(queryLower) ||
        worker.passport.toLowerCase().includes(queryLower) ||
        (worker.divisi && worker.divisi.toLowerCase().includes(queryLower))
      )
      .slice(0, 10)
  }, [allWorkers, debouncedQuery])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev < filteredWorkers.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredWorkers.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && filteredWorkers[highlightedIndex]) {
            handleSelect(filteredWorkers[highlightedIndex])
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
  }, [isOpen, highlightedIndex, filteredWorkers])

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

  const handleSelect = (worker: TKAWorker) => {
    onSelect(worker)
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
          value={selected ? selected.nama : query}
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
            ) : filteredWorkers.length > 0 ? (
              filteredWorkers.map((worker, index) => (
                <div
                  key={worker.id}
                  onClick={() => handleSelect(worker)}
                  className={cn(
                    'px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0',
                    'hover:bg-gray-50 transition-colors',
                    index === highlightedIndex && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {worker.nama}
                        {(worker as any)._is_family_member && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Family
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Passport: {worker.passport}
                        {worker.divisi && ` • ${worker.divisi}`}
                        {worker.jenis_kelamin && ` • ${worker.jenis_kelamin}`}
                      </div>
                      {(worker as any)._is_family_member && (
                        <div className="text-xs text-blue-600">
                          {(worker as any)._relationship} of {(worker as any)._parent_worker}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : debouncedQuery ? (
              <div className="px-4 py-3 text-center text-gray-500">
                No workers found matching "{debouncedQuery}"
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-gray-500">
                Start typing to search workers...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected worker display */}
      {selected && (
        <div className="mt-2 p-2 bg-gray-50 rounded border text-sm">
          <div className="font-medium">{selected.nama}</div>
          <div className="text-gray-600">
            Passport: {selected.passport}
            {selected.divisi && ` • ${selected.divisi}`}
          </div>
        </div>
      )}
    </div>
  )
}