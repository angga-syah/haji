// components/forms/SearchForm.tsx
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface SearchFormProps {
  onSearch: (params: any) => void
  filters?: Array<{
    name: string
    label: string
    type: 'text' | 'select' | 'date'
    options?: Array<{ value: string; label: string }>
    placeholder?: string
  }>
  initialValues?: Record<string, any>
}

export function SearchForm({ onSearch, filters = [], initialValues = {} }: SearchFormProps) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      query: '',
      ...initialValues
    }
  })

  const handleFormSubmit = (data: any) => {
    // Remove empty values
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value
      }
      return acc
    }, {} as any)
    
    onSearch(cleanData)
  }

  const handleReset = () => {
    reset({ query: '', ...Object.keys(initialValues).reduce((acc, key) => ({ ...acc, [key]: '' }), {}) })
    onSearch({})
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Input
            {...register('query')}
            placeholder="Search..."
            className="w-full"
          />
        </div>

        {filters.map((filter) => (
          <div key={filter.name}>
            {filter.type === 'select' ? (
              <Select
                {...register(filter.name as any)}
                options={filter.options || []}
                placeholder={filter.placeholder || `Select ${filter.label}`}
              />
            ) : filter.type === 'date' ? (
              <Input
                {...register(filter.name as any)}
                type="date"
                placeholder={filter.placeholder}
              />
            ) : (
              <Input
                {...register(filter.name as any)}
                type="text"
                placeholder={filter.placeholder || filter.label}
              />
            )}
          </div>
        ))}

        <div className="flex space-x-2">
          <Button type="submit" className="flex-1">
            Search
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>
    </form>
  )
}