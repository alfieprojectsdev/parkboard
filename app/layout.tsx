import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import AuthSessionProvider from '@/components/auth/SessionProvider'
import FeedbackButton from '@/components/FeedbackButton'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'ParkBoard · Lumiere Residences',
  description: 'Neighbours at Lumiere Residences post free parking slots; residents reveal the owner’s contact and arrange it directly.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1d4ed8',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthSessionProvider>
          {children}
          {/* Room to scroll page content clear of the floating Feedback button. */}
          <div aria-hidden="true" className="h-16" />
          <FeedbackButton />
        </AuthSessionProvider>
      </body>
    </html>
  )
}
