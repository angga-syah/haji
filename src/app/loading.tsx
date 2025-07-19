
// app/(dashboard)/loading.tsx
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  )
}
