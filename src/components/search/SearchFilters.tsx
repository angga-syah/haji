// components/search/SearchFilters.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useCompanies } from '@/hooks/api/useCompanies'
import { INVOICE_STATUS } from '@/lib/constants'

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
  entityTypes?: string[]
}

interface SearchFiltersProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  entityTypes?: ('company' | 'tka_worker' | 'job_description' | 'invoice')[]
}

export function SearchFilters({
  filters,
  onChange,
  entityTypes = ['company', 'tka_worker', 'job_description', 'invoice']
}: SearchFiltersProps) {
  const { data: companiesData } = useCompanies()
  
  const companies = companiesData?.companies?.filter(c => c.is_active) || []
  
  const statusOptions = Object.entries(INVOICE_STATUS).map(([key, value]) => ({
    value,
    label: key.charAt(0) + key.slice(1).toLowerCase()
  }))

  const companyOptions = companies.map(company => ({
    value: company.id,
    label: company.company_name
  }))

  const entityTypeOptions = [
    { value: 'company', label: 'Companies' },
    { value: 'tka_worker', label: 'TKA Workers' },
    { value: 'job_description', label: 'Job Descriptions' },
    { value: 'invoice', label: 'Invoices' }
  ].filter(option => entityTypes.includes(option.value as any))

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onChange({
      ...filters,
      [key]: value
    })
  }

  const addCompanyFilter = (companyId: string) => {
    const currentCompanies = filters.companies || []
    if (!currentCompanies.includes(companyId)) {
      updateFilter('companies', [...currentCompanies, companyId])
    }
  }

  const removeCompanyFilter = (companyId: string) => {
    const currentCompanies = filters.companies || []
    updateFilter('companies', currentCompanies.filter(id => id !== companyId))
  }

  const addStatusFilter = (status: string) => {
    const currentStatuses = filters.status || []
    if (!currentStatuses.includes(status)) {
      updateFilter('status', [...currentStatuses, status])
    }
  }

  const removeStatusFilter = (status: string) => {
    const currentStatuses = filters.status || []
    updateFilter('status', currentStatuses.filter(s => s !== status))
  }

  const addEntityTypeFilter = (entityType: string) => {
    const currentTypes = filters.entityTypes || []
    if (!currentTypes.includes(entityType)) {
      updateFilter('entityTypes', [...currentTypes, entityType])
    }
  }

  const removeEntityTypeFilter = (entityType: string) => {
    const currentTypes = filters.entityTypes || []
    updateFilter('entityTypes', currentTypes.filter(t => t !== entityType))
  }

  const clearAllFilters = () => {
    onChange({})
  }

  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) return Object.values(value).some(v => v !== undefined && v !== '')
    return false
  })

  return (
    <div className="p-4 space-y-4 bg-white border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Search Filters</h3>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Entity Types Filter */}
      {entityTypes.length > 1 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Search In:</label>
          <div className="space-y-2">
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addEntityTypeFilter(e.target.value)
                }
              }}
              options={entityTypeOptions.filter(option => 
                !(filters.entityTypes || []).includes(option.value)
              )}
              placeholder="Add entity type..."
              className="text-sm"
            />
            
            {filters.entityTypes && filters.entityTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.entityTypes.map(entityType => {
                  const option = entityTypeOptions.find(opt => opt.value === entityType)
                  return (
                    <Badge
                      key={entityType}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => removeEntityTypeFilter(entityType)}
                    >
                      {option?.label} ✕
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Companies Filter */}
      {entityTypes.includes('invoice') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Companies:</label>
          <div className="space-y-2">
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addCompanyFilter(e.target.value)
                }
              }}
              options={companyOptions.filter(option => 
                !(filters.companies || []).includes(option.value)
              )}
              placeholder="Add company..."
              className="text-sm"
            />
            
            {filters.companies && filters.companies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.companies.map(companyId => {
                  const company = companies.find(c => c.id === companyId)
                  return (
                    <Badge
                      key={companyId}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => removeCompanyFilter(companyId)}
                    >
                      {company?.company_name || companyId} ✕
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Filter */}
      {entityTypes.includes('invoice') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Invoice Status:</label>
          <div className="space-y-2">
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addStatusFilter(e.target.value)
                }
              }}
              options={statusOptions.filter(option => 
                !(filters.status || []).includes(option.value)
              )}
              placeholder="Add status..."
              className="text-sm"
            />
            
            {filters.status && filters.status.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.status.map(status => {
                  const option = statusOptions.find(opt => opt.value === status)
                  return (
                    <Badge
                      key={status}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => removeStatusFilter(status)}
                    >
                      {option?.label || status} ✕
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      {entityTypes.includes('invoice') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Date Range:</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">From:</label>
              <Input
                type="date"
                value={filters.dateRange?.from || ''}
                onChange={(e) => updateFilter('dateRange', {
                  ...filters.dateRange,
                  from: e.target.value
                })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">To:</label>
              <Input
                type="date"
                value={filters.dateRange?.to || ''}
                onChange={(e) => updateFilter('dateRange', {
                  ...filters.dateRange,
                  to: e.target.value
                })}
                className="text-sm"
              />
            </div>
          </div>
          
          {(filters.dateRange?.from || filters.dateRange?.to) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('dateRange', undefined)}
              className="text-xs"
            >
              Clear dates
            </Button>
          )}
        </div>
      )}

      {/* Amount Range Filter */}
      {entityTypes.includes('invoice') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Amount Range (IDR):</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Min:</label>
              <Input
                type="number"
                value={filters.amountRange?.min || ''}
                onChange={(e) => updateFilter('amountRange', {
                  ...filters.amountRange,
                  min: e.target.value ? parseFloat(e.target.value) : undefined
                })}
                placeholder="0"
                min="0"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Max:</label>
              <Input
                type="number"
                value={filters.amountRange?.max || ''}
                onChange={(e) => updateFilter('amountRange', {
                  ...filters.amountRange,
                  max: e.target.value ? parseFloat(e.target.value) : undefined
                })}
                placeholder="No limit"
                min="0"
                className="text-sm"
              />
            </div>
          </div>
          
          {(filters.amountRange?.min || filters.amountRange?.max) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFilter('amountRange', undefined)}
              className="text-xs"
            >
              Clear amounts
            </Button>
          )}
        </div>
      )}

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="pt-2 border-t text-xs text-gray-600">
          <div>Active filters:</div>
          <div className="mt-1 space-y-1">
            {filters.entityTypes && filters.entityTypes.length > 0 && (
              <div>• Entity types: {filters.entityTypes.length}</div>
            )}
            {filters.companies && filters.companies.length > 0 && (
              <div>• Companies: {filters.companies.length}</div>
            )}
            {filters.status && filters.status.length > 0 && (
              <div>• Statuses: {filters.status.length}</div>
            )}
            {filters.dateRange && (filters.dateRange.from || filters.dateRange.to) && (
              <div>• Date range set</div>
            )}
            {filters.amountRange && (filters.amountRange.min || filters.amountRange.max) && (
              <div>• Amount range set</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}