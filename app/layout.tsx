// =====================================================
// File: app/layout.tsx
// Updated with ErrorBoundary and ToastProvider
// =====================================================
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/common/ToastNotification'

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
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
