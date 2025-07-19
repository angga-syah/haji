// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Invoice Management System',
  description: 'Professional invoice management system for TKA workers and companies',
  keywords: ['invoice', 'management', 'TKA', 'workers', 'companies', 'finance'],
  authors: [{ name: 'Spirit of Services' }],
  robots: 'noindex, nofollow', // Private system
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}