// app/page.tsx

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

export default function HomePage() {
  const router = useRouter()
  const { data: currentUser, isLoading } = useCurrentUser()

  useEffect(() => {
    if (!isLoading) {
      if (currentUser?.user) {
        // User is authenticated, redirect to dashboard
        router.replace('/invoices')
      } else {
        // User is not authenticated, redirect to login
        router.replace('/login')
      }
    }
  }, [currentUser, isLoading, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}