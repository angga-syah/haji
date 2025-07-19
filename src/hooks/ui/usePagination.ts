// hooks/ui/usePagination.ts
import { useState, useMemo, useCallback } from 'react'
import { PAGINATION } from '@/lib/constants'

interface UsePaginationProps {
  initialPage?: number
  initialLimit?: number
  total?: number
  maxLimit?: number
}

interface UsePaginationReturn {
  // Current state
  currentPage: number
  limit: number
  offset: number
  total: number
  
  // Calculated values
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  startItem: number
  endItem: number
  
  // Actions
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setTotal: (total: number) => void
  nextPage: () => void
  previousPage: () => void
  firstPage: () => void
  lastPage: () => void
  
  // Page range for pagination component
  pageRange: number[]
}

/**
 * Hook for managing pagination state and calculations
 */
export function usePagination({
  initialPage = 1,
  initialLimit = PAGINATION.DEFAULT_LIMIT,
  total = 0,
  maxLimit = PAGINATION.MAX_LIMIT
}: UsePaginationProps = {}): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [limit, setLimitState] = useState(Math.min(initialLimit, maxLimit))
  const [totalState, setTotalState] = useState(total)

  // Calculated values
  const totalPages = useMemo(() => {
    return Math.ceil(totalState / limit)
  }, [totalState, limit])

  const offset = useMemo(() => {
    return (currentPage - 1) * limit
  }, [currentPage, limit])

  const hasNext = useMemo(() => {
    return currentPage < totalPages
  }, [currentPage, totalPages])

  const hasPrevious = useMemo(() => {
    return currentPage > 1
  }, [currentPage])

  const startItem = useMemo(() => {
    return totalState === 0 ? 0 : offset + 1
  }, [offset, totalState])

  const endItem = useMemo(() => {
    return Math.min(offset + limit, totalState)
  }, [offset, limit, totalState])

  // Generate page range for pagination component
  const pageRange = useMemo(() => {
    const range: number[] = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        range.push(i)
      }
    } else {
      // Show smart range around current page
      const halfVisible = Math.floor(maxVisiblePages / 2)
      let start = Math.max(1, currentPage - halfVisible)
      let end = Math.min(totalPages, currentPage + halfVisible)
      
      // Adjust if we're near the beginning or end
      if (end - start + 1 < maxVisiblePages) {
        if (start === 1) {
          end = Math.min(totalPages, start + maxVisiblePages - 1)
        } else {
          start = Math.max(1, end - maxVisiblePages + 1)
        }
      }
      
      for (let i = start; i <= end; i++) {
        range.push(i)
      }
    }
    
    return range
  }, [currentPage, totalPages])

  // Actions
  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }, [totalPages])

  const setLimit = useCallback((newLimit: number) => {
    const validLimit = Math.min(newLimit, maxLimit)
    setLimitState(validLimit)
    
    // Adjust current page if necessary
    const newTotalPages = Math.ceil(totalState / validLimit)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }
  }, [maxLimit, totalState, currentPage])

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal)
    
    // Adjust current page if necessary
    const newTotalPages = Math.ceil(newTotal / limit)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }
  }, [limit, currentPage])

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNext])

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPrevious])

  const firstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const lastPage = useCallback(() => {
    if (totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages])

  return {
    // Current state
    currentPage,
    limit,
    offset,
    total: totalState,
    
    // Calculated values
    totalPages,
    hasNext,
    hasPrevious,
    startItem,
    endItem,
    
    // Actions
    setPage,
    setLimit,
    setTotal,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    
    // Page range
    pageRange
  }
}

/**
 * Hook for URL-based pagination (for Next.js routing)
 */
export function useURLPagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString())
  
  const updateURL = useCallback((newPage: number, newLimit?: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    
    if (newLimit) {
      params.set('limit', newLimit.toString())
    }
    
    // Return new URL for navigation
    return `?${params.toString()}`
  }, [searchParams])

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    updateURL
  }
}