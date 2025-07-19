// components/common/DatePicker.tsx
'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  min?: string // ISO date string
  max?: string // ISO date string
  size?: 'sm' | 'md' | 'lg'
  showToday?: boolean
  format?: 'iso' | 'display' // iso: YYYY-MM-DD, display: DD/MM/YYYY
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className,
  error,
  min,
  max,
  size = 'md',
  showToday = true,
  format = 'iso'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Convert ISO date to display format
  const formatDate = (isoDate: string, targetFormat: 'iso' | 'display' = 'display'): string => {
    if (!isoDate) return ''
    
    try {
      const date = new Date(isoDate)
      if (isNaN(date.getTime())) return ''
      
      if (targetFormat === 'iso') {
        return date.toISOString().split('T')[0]
      } else {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      }
    } catch {
      return ''
    }
  }

  // Parse display format to ISO
  const parseDate = (displayDate: string): string => {
    if (!displayDate) return ''
    
    try {
      // Handle DD/MM/YYYY format
      if (displayDate.includes('/')) {
        const [day, month, year] = displayDate.split('/')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return date.toISOString().split('T')[0]
      }
      
      // Handle ISO format or other formats
      const date = new Date(displayDate)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    if (format === 'iso') {
      onChange(inputValue)
    } else {
      const isoDate = parseDate(inputValue)
      onChange(isoDate)
    }
  }

  const handleTodayClick = () => {
    const today = new Date().toISOString().split('T')[0]
    onChange(today)
    setIsOpen(false)
  }

  const handleClearClick = () => {
    onChange('')
    setIsOpen(false)
  }

  const sizeClasses = {
    sm: 'text-sm h-8',
    md: 'text-base h-10',
    lg: 'text-lg h-12'
  }

  const displayValue = value ? formatDate(value, format) : ''

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type={format === 'iso' ? 'date' : 'text'}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          className={cn(
            sizeClasses[size],
            'pr-20', // Space for buttons
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
        />
        
        {/* Action buttons */}
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
          {showToday && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleTodayClick}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              Today
            </Button>
          )}
          
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearClick}
              disabled={disabled}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      {!error && value && (
        <p className="mt-1 text-xs text-gray-500">
          {format === 'iso' ? formatDate(value, 'display') : formatDate(value, 'iso')}
        </p>
      )}
    </div>
  )
}

// Date range picker component
interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  disabled?: boolean
  className?: string
  error?: string
  startPlaceholder?: string
  endPlaceholder?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  className,
  error,
  startPlaceholder = "Start date",
  endPlaceholder = "End date"
}: DateRangePickerProps) {
  
  const handleStartDateChange = (date: string) => {
    onStartDateChange(date)
    
    // If end date is before start date, clear end date
    if (endDate && date && new Date(date) > new Date(endDate)) {
      onEndDateChange('')
    }
  }

  const handleEndDateChange = (date: string) => {
    onEndDateChange(date)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={startDate}
          onChange={handleStartDateChange}
          placeholder={startPlaceholder}
          disabled={disabled}
          max={endDate || undefined}
        />
        
        <DatePicker
          value={endDate}
          onChange={handleEndDateChange}
          placeholder={endPlaceholder}
          disabled={disabled}
          min={startDate || undefined}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Utility functions for date handling
export const dateUtils = {
  // Get today's date in ISO format
  today: (): string => {
    return new Date().toISOString().split('T')[0]
  },
  
  // Add days to a date
  addDays: (date: string, days: number): string => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  },
  
  // Get start of month
  startOfMonth: (date?: string): string => {
    const d = date ? new Date(date) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  },
  
  // Get end of month
  endOfMonth: (date?: string): string => {
    const d = date ? new Date(date) : new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  },
  
  // Format date for display
  formatDisplay: (date: string): string => {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return date
    }
  },
  
  // Check if date is valid
  isValid: (date: string): boolean => {
    if (!date) return false
    const d = new Date(date)
    return !isNaN(d.getTime())
  },
  
  // Compare dates
  isAfter: (date1: string, date2: string): boolean => {
    return new Date(date1) > new Date(date2)
  },
  
  isBefore: (date1: string, date2: string): boolean => {
    return new Date(date1) < new Date(date2)
  },
  
  isSame: (date1: string, date2: string): boolean => {
    return date1 === date2
  }
}