// app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect ke dashboard - middleware akan handle auth check
  redirect('/dashboard')
}