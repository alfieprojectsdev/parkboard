// components/common/Navigation.tsx
'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function Navigation() {
  const { data: session, status } = useSession()
  const user = session?.user

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href="/LMR/slots" className="text-xl font-bold text-blue-700">
            ParkBoard
          </Link>
          <Link href="/LMR/slots" className="text-sm font-medium text-gray-700 hover:text-blue-700">
            Browse slots
          </Link>
          <Link href="/LMR/slots/new" className="text-sm font-medium text-gray-700 hover:text-blue-700">
            Post a slot
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {status === 'loading' ? null : user ? (
            <>
              <Link href="/profile" className="text-sm text-gray-700 hover:text-blue-700">
                <span className="font-medium">{user.name}</span>
                {user.unitNumber && <span className="ml-1 text-gray-500">· Unit {user.unitNumber}</span>}
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">Log in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
