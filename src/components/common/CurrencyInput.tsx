// components/common/CurrencyInput.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value?: number
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  min?: number
  max?: number
  currency?: string
  locale?: string
  allowNegative?: boolean
  decimalPlaces?: number
  showSymbol?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  className,
  error,
  min = 0,
  max = 999999999999,
  currency = 'IDR',
  locale = 'id-ID',
  allowNegative = false,
  decimalPlaces = 0, // Indonesian Rupiah typically doesn't use decimals
  showSymbol = true,
  size = 'md'
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Format number for display
  const formatCurrency = (num: number): string => {
    if (isNaN(num)) return ''
    
    try {
      return new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: currency,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      }).format(num)
    } catch (error) {
      // Fallback formatting
      return num.toLocaleString(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      })
    }
  }

  // Parse currency string to number
  const parseCurrency = (str: string): number => {
    if (!str) return 0
    
    // Remove currency symbols, spaces, and non-numeric characters except decimal separator
    const cleanedStr = str
      .replace(/[Rp\s]/g, '') // Remove Rp and spaces
      .replace(/[.,]/g, (match, index, string) => {
        // Handle decimal separator - keep only the last one as decimal
        const lastCommaIndex = string.lastIndexOf(',')
        const lastDotIndex = string.lastIndexOf('.')
        const lastDecimalIndex = Math.max(lastCommaIndex, lastDotIndex)
        
        if (index === lastDecimalIndex && string.length - index <= 3) {
          return '.' // Convert to decimal point
        }
        return '' // Remove thousands separators
      })
      .replace(/[^\d.-]/g, '') // Remove any remaining non-numeric characters
    
    const num = parseFloat(cleanedStr) || 0
    
    // Apply constraints
    if (!allowNegative && num < 0) return 0
    if (num < min) return min
    if (num > max) return max
    
    return num
  }

  // Update display value when value prop changes
  useEffect(() => {
    if (value !== undefined && !isFocused) {
      setDisplayValue(value === 0 ? '' : formatCurrency(value))
    }
  }, [value, isFocused, locale, currency, decimalPlaces, showSymbol])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setDisplayValue(inputValue)
    
    const numericValue = parseCurrency(inputValue)
    onChange(numericValue)
  }

  const handleFocus = () => {
    setIsFocused(true)
    // Show raw number when focused for easier editing
    if (value !== undefined && value !== 0) {
      setDisplayValue(value.toString())
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Format display value when focus is lost
    if (value !== undefined) {
      setDisplayValue(value === 0 ? '' : formatCurrency(value))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey) ||
        (e.keyCode === 67 && e.ctrlKey) ||
        (e.keyCode === 86 && e.ctrlKey) ||
        (e.keyCode === 88 && e.ctrlKey) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return
    }
    
    // Ensure that it's a number or decimal point and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
        (e.keyCode < 96 || e.keyCode > 105) &&
        // Allow decimal point
        e.keyCode !== 190 && e.keyCode !== 110 &&
        // Allow minus sign if negative numbers are allowed
        !(allowNegative && e.keyCode === 189)) {
      e.preventDefault()
    }
  }

  const sizeClasses = {
    sm: 'text-sm h-8',
    md: 'text-base h-10',
    lg: 'text-lg h-12'
  }

  return (
    <div className="w-full">
      <div className="relative">
        {/* Currency symbol prefix */}
        {showSymbol && !isFocused && currency === 'IDR' && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
            Rp
          </div>
        )}
        
        <Input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            sizeClasses[size],
            showSymbol && !isFocused && currency === 'IDR' && 'pl-8',
            'text-right', // Right align for currency
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      {!error && (value !== undefined && value > 0) && (
        <p className="mt-1 text-xs text-gray-500">
          {formatCurrency(value)}
        </p>
      )}
    </div>
  )
}

// Utility function for formatting currency in display contexts
export function formatCurrencyDisplay(
  amount: number,
  currency: string = 'IDR',
  locale: string = 'id-ID'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Utility function for parsing currency input
export function parseCurrencyInput(input: string): number {
  if (!input) return 0
  
  const cleaned = input
    .replace(/[Rp\s]/g, '')
    .replace(/[.,]/g, (match, index, string) => {
      const lastCommaIndex = string.lastIndexOf(',')
      const lastDotIndex = string.lastIndexOf('.')
      const lastDecimalIndex = Math.max(lastCommaIndex, lastDotIndex)
      
      if (index === lastDecimalIndex && string.length - index <= 3) {
        return '.'
      }
      return ''
    })
    .replace(/[^\d.-]/g, '')
  
  return parseFloat(cleaned) || 0
}