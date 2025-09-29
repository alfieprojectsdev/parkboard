// =====================================================
// File: app/layout.tsx
// Updated with ErrorBoundary wrapper
// =====================================================
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata = {
  title: 'ParkBoard - Parking Management',
  description: 'Condo parking booking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
