// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProviders } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Invoice Management System',
  description: 'Professional invoice management system for TKA workers',
  keywords: 'invoice, management, TKA, workers, finance',
  authors: [{ name: 'Invoice Management Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}