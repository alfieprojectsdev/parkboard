// app/page.tsx - ParkBoard Landing Page
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">🅿️</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">ParkBoard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            Your Condo&apos;s Parking Marketplace
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Rent parking slots in your community. Turn your unused parking space into passive income,
            or find convenient parking by the hour.
          </p>
        </div>

        {/* Community Selector */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select Your Community
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Each community has its own dedicated parking marketplace
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Lumiere (LMR) - Active */}
            <Link href="/LMR">
              <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-2 hover:border-blue-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">Lumiere Residences</CardTitle>
                      <CardDescription className="text-base mt-1">Pasig Blvd, Pasig City</CardDescription>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      ✓ Active
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Community Code: <span className="font-mono font-bold">LMR</span>
                      </p>
                      <p className="text-blue-600 font-semibold">
                        Visit Community →
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Coming Soon - Placeholder */}
            <Card className="opacity-60 border-2 border-dashed">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-gray-500">Your Community</CardTitle>
                    <CardDescription className="text-base mt-1">Coming Soon</CardDescription>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    ⏳ Soon
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Is your condo interested in ParkBoard? Contact us to get started!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white dark:bg-gray-800">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            How ParkBoard Works
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Simple, secure, and built for your condo community
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* For Renters */}
          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">🚗</div>
              <CardTitle>For Renters</CardTitle>
              <CardDescription>Need parking? We&apos;ve got you covered</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✓ Browse available slots in real-time</li>
                <li>✓ Book by the hour with transparent pricing</li>
                <li>✓ Instant confirmation and easy cancellation</li>
                <li>✓ Direct contact with slot owners</li>
              </ul>
            </CardContent>
          </Card>

          {/* For Owners */}
          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">💰</div>
              <CardTitle>For Owners</CardTitle>
              <CardDescription>Turn your parking space into income</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✓ List your slot in minutes</li>
                <li>✓ Set your own hourly rate</li>
                <li>✓ Accept or manage bookings easily</li>
                <li>✓ Earn when you&apos;re not using your slot</li>
              </ul>
            </CardContent>
          </Card>

          {/* Secure Booking */}
          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">🔒</div>
              <CardTitle>Secure & Safe</CardTitle>
              <CardDescription>Built with your security in mind</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✓ Verified condo residents only</li>
                <li>✓ Secure payment calculation</li>
                <li>✓ Transparent pricing (no hidden fees)</li>
                <li>✓ Protected personal information</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            See It In Action
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Browse slots, check availability, and book in seconds
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Placeholder for Browse Slots Screenshot */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg p-8 aspect-video flex items-center justify-center border-2 border-blue-300 dark:border-blue-700">
            <div className="text-center">
              <div className="text-6xl mb-4">🅿️</div>
              <p className="text-blue-900 dark:text-blue-100 font-semibold">Browse Available Slots</p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-2">Real-time availability & pricing</p>
            </div>
          </div>

          {/* Placeholder for Booking Screenshot */}
          <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg p-8 aspect-video flex items-center justify-center border-2 border-green-300 dark:border-green-700">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-green-900 dark:text-green-100 font-semibold">Book Your Slot</p>
              <p className="text-green-700 dark:text-green-300 text-sm mt-2">Choose time, confirm, done!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white dark:bg-gray-800">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            No hidden fees. Owners set their own rates.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* For Renters */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-center">For Renters</CardTitle>
              <div className="text-4xl font-bold text-center text-blue-600 dark:text-blue-400 my-4">
                Pay per Use
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No subscription fees</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Pay only for hours booked</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Typical: ₱30-80/hour</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Free cancellation (pending bookings)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* For Owners */}
          <Card className="border-2 border-blue-500 shadow-lg scale-105">
            <CardHeader>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 text-center mb-2">
                POPULAR
              </div>
              <CardTitle className="text-center">For Owners</CardTitle>
              <div className="text-4xl font-bold text-center text-blue-600 dark:text-blue-400 my-4">
                100% Free
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No listing fees</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No commission taken</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Set your own rates</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Keep 100% of earnings</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Community */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-center">Community</CardTitle>
              <div className="text-4xl font-bold text-center text-blue-600 dark:text-blue-400 my-4">
                Win-Win
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Residents helping residents</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Build community connections</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Maximize condo resources</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Reduce parking hassles</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          * Pricing example based on typical condo parking rates in Metro Manila
        </p>
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            What Our Community Says
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Real feedback from condo residents using ParkBoard
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl">
                  👨
                </div>
                <div>
                  <CardTitle className="text-base">Mark T.</CardTitle>
                  <CardDescription>Unit 12A • Renter</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                &quot;I work from home most days, so I only need parking occasionally.
                ParkBoard lets me book a slot for meetings without paying monthly.
                Saved me ₱3,000 this month!&quot;
              </p>
              <div className="text-yellow-500 mt-2">⭐⭐⭐⭐⭐</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-2xl">
                  👩
                </div>
                <div>
                  <CardTitle className="text-base">Lisa R.</CardTitle>
                  <CardDescription>Unit 8B • Owner</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                &quot;My family switched to one car, but we kept our two slots.
                Now I rent out the extra slot and earn ₱5,000-7,000/month.
                It literally pays for my association dues!&quot;
              </p>
              <div className="text-yellow-500 mt-2">⭐⭐⭐⭐⭐</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-2xl">
                  👨‍👩‍👧
                </div>
                <div>
                  <CardTitle className="text-base">Santos Family</CardTitle>
                  <CardDescription>Unit 15C • Both</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                &quot;We rent out our slot on weekdays when we&apos;re at work,
                and book visitor slots on weekends when family comes over.
                Super convenient and everyone in the building benefits!&quot;
              </p>
              <div className="text-yellow-500 mt-2">⭐⭐⭐⭐⭐</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-800 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-blue-100 mb-8 text-lg">
            Join your neighbors in making parking easier for everyone
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/LMR">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit Lumiere (LMR)
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-lg px-8 text-white border-white hover:bg-blue-700">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">🅿️</div>
                <h4 className="text-white font-bold text-lg">ParkBoard</h4>
              </div>
              <p className="text-sm">
                Your community&apos;s parking marketplace. Built by residents, for residents.
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Communities</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="/LMR" className="hover:text-white">Lumiere (LMR)</Link></li>
                <li><span className="text-gray-500">More coming soon...</span></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:text-white">Help / FAQ</Link></li>
                <li><a href="mailto:support@parkboard.ph" className="hover:text-white">Contact Us</a></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
                <li><Link href="/register" className="hover:text-white">Sign Up</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-500">Terms of Service</span></li>
                <li><span className="text-gray-500">Privacy Policy</span></li>
                <li><span className="text-gray-500">Community Guidelines</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 ParkBoard. Built for Filipino condo communities.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
