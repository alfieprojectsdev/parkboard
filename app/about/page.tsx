// app/about/page.tsx - About ParkBoard
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">🅿️</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">ParkBoard</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/help">
                <Button variant="ghost">Help</Button>
              </Link>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            About ParkBoard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Making parking easier for condo communities across the Philippines
          </p>
        </div>

        {/* Mission */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              ParkBoard was created to solve a common problem in Filipino condo communities:
              <strong> unused parking slots sitting idle while neighbors search for parking.</strong>
            </p>
            <p>
              We believe that condo communities thrive when neighbors help each other.
              By creating a simple, secure marketplace for parking slots, we enable residents
              to maximize their resources while building stronger community connections.
            </p>
          </CardContent>
        </Card>

        {/* The Problem */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">The Problem We Solve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚗</span>
                <div>
                  <strong>For Slot Seekers:</strong> Work-from-home residents, visitors, and
                  occasional car users waste money on monthly parking they barely use.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🅿️</span>
                <div>
                  <strong>For Slot Owners:</strong> Families with extra slots from downsizing,
                  commuters who drive rarely, or unit owners with unused spaces miss out on passive income.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏢</span>
                <div>
                  <strong>For Communities:</strong> Inefficient parking allocation creates
                  tension, wasted resources, and missed opportunities for neighbors to connect.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Our Solution */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Our Solution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              ParkBoard is a <strong>community-first marketplace</strong> that enables condo residents to:
            </p>
            <ul className="space-y-2 ml-6 list-disc">
              <li><strong>Rent slots by the hour</strong> - Pay only for what you use, when you need it</li>
              <li><strong>Earn from unused spaces</strong> - Turn idle parking into ₱5,000-10,000/month</li>
              <li><strong>Connect with neighbors</strong> - Build community while solving practical needs</li>
              <li><strong>Stay secure</strong> - Residents-only, with transparent pricing and no hidden fees</li>
            </ul>
          </CardContent>
        </Card>

        {/* Why It's Free */}
        <Card className="mb-8 border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="text-2xl">Why ParkBoard is Free</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We believe neighbors helping neighbors shouldn&apos;t come with fees or commissions.
              ParkBoard is <strong>100% free for owners</strong> - no listing fees, no commissions,
              no hidden charges. Renters pay only the hourly rate set by the owner.
            </p>
            <p>
              Our goal is simple: <strong>make parking easier for everyone in your condo community.</strong>
              When that happens, everyone wins.
            </p>
          </CardContent>
        </Card>

        {/* Who We Are */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Who We Are</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We&apos;re a team of Filipino developers and designers who experienced the parking
              struggle firsthand in our own condo buildings. After seeing neighbors resort to
              informal WhatsApp groups and bulletin board posts, we knew there had to be a better way.
            </p>
            <p>
              ParkBoard started as a passion project to help our own building, and grew when we
              realized this was a problem shared by thousands of condo communities across Metro Manila
              and beyond.
            </p>
          </CardContent>
        </Card>

        {/* Built for Filipino Condos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Built for Filipino Condos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              Unlike generic parking apps, ParkBoard is designed specifically for the Filipino
              condo experience:
            </p>
            <ul className="space-y-2 ml-6 list-disc">
              <li><strong>Philippine Peso pricing</strong> - All rates in ₱, typical ₱30-80/hour range</li>
              <li><strong>Community-focused</strong> - Residents-only for security and trust</li>
              <li><strong>Flexible scheduling</strong> - Perfect for WFH, visitors, and occasional use</li>
              <li><strong>Unit-based verification</strong> - Tied to your condo unit for accountability</li>
            </ul>
          </CardContent>
        </Card>

        {/* Our Values */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Our Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🤝 Community First</h4>
                <p className="text-sm">Neighbors helping neighbors, always</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔒 Security & Trust</h4>
                <p className="text-sm">Verified residents, transparent pricing</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">✨ Simplicity</h4>
                <p className="text-sm">No complex features, just what you need</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💙 Free Forever</h4>
                <p className="text-sm">No fees, no commissions, no hidden costs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* The Future */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">What&apos;s Next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We&apos;re just getting started. Our roadmap includes:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Basic marketplace (live now!)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">🔵</span>
                <span><strong>Phase 2:</strong> Advanced search & filters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">🔵</span>
                <span><strong>Phase 2:</strong> Email notifications & reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">🔵</span>
                <span><strong>Phase 2:</strong> Mobile app (iOS & Android)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⏳</span>
                <span><strong>Future:</strong> Community donations & bulletin board</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Get in Touch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We&apos;d love to hear from you! Whether you have questions, feedback, or want to
              bring ParkBoard to your condo community:
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> <a href="mailto:alfieprojects.dev@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">alfieprojects.dev@gmail.com</a></p>
              <p><strong>Help Center:</strong> <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:underline">Visit our FAQ</Link></p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Join?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Start browsing slots or list your own space today
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">Sign Up Free</Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">&copy; 2025 ParkBoard. Built for Filipino condo communities.</p>
        </div>
      </footer>
    </div>
  )
}
