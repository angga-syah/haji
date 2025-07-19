// components/common/PageTitle.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface PageTitleProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageTitle({ title, description, action, className }: PageTitleProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
