import Link from 'next/link'
import { auth } from '@/lib/auth/auth'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/common/Navigation'

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Lumiere Residences parking board</h1>
        <p className="mb-8 text-gray-700">
          Post your parking slot when you&apos;re away. Neighbours see when it&apos;s free, get your
          Viber or phone, and you sort out the rest between you.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/LMR/slots">
            <Button size="lg">Browse free slots</Button>
          </Link>
          <Link href={session ? '/LMR/slots/new' : '/register'}>
            <Button size="lg" variant="outline">
              {session ? 'Post my slot' : 'Register to post'}
            </Button>
          </Link>
        </div>

        <ol className="mx-auto mt-12 max-w-md space-y-2 text-left text-sm text-gray-700">
          <li>1. Post the level, tower and the hours your slot is free.</li>
          <li>2. Logged-in neighbours tap &ldquo;Show contact&rdquo; to get your Viber or phone.</li>
          <li>3. Mark it taken once someone has it, or remove it.</li>
        </ol>

        <p className="mt-12 text-xs text-gray-500">
          Contact details are shown only to logged-in residents, one slot at a time.
        </p>
      </main>
    </div>
  )
}
