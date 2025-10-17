// app/help/page.tsx - Help & FAQ
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I sign up for ParkBoard?',
          a: 'Click "Sign Up" in the navigation, then provide your name, email, phone number, and condo unit number. You\'ll need a valid unit number to register as we verify all residents.'
        },
        {
          q: 'Is ParkBoard free to use?',
          a: 'Yes! Listing your parking slot is 100% free with no commissions. Renters pay only the hourly rate set by the owner. There are no hidden fees, subscriptions, or listing charges.'
        },
        {
          q: 'Who can use ParkBoard?',
          a: 'ParkBoard is for verified condo residents only. You must have a valid unit number in your building to register. This keeps the community safe and trusted.'
        }
      ]
    },
    {
      category: 'For Renters',
      questions: [
        {
          q: 'How do I book a parking slot?',
          a: '1) Browse available slots on the Slots page\n2) Click on a slot to see details\n3) Select your start and end time\n4) Review the total price\n5) Click "Confirm Booking"\n\nYou\'ll see the booking in "My Bookings" immediately.'
        },
        {
          q: 'How is pricing calculated?',
          a: 'Pricing is transparent and simple: Hours × Rate per Hour = Total Price. For example, if you book a ₱50/hour slot from 9 AM to 5 PM (8 hours), you\'ll pay ₱400. The price is calculated automatically by our server.'
        },
        {
          q: 'Can I cancel a booking?',
          a: 'Yes! You can cancel any booking with "pending" status. Go to "My Bookings", find the booking, and click "Cancel Booking". Confirmed bookings cannot be cancelled - please contact the owner directly.'
        },
        {
          q: 'What if the slot is already booked?',
          a: 'If someone else has booked the slot for overlapping times, you\'ll see an error when trying to book. Try selecting different times or browse other available slots.'
        },
        {
          q: 'How do I contact the slot owner?',
          a: 'Once you book a slot, you\'ll see the owner\'s name and phone number in your booking details. You can call or text them directly to coordinate parking instructions.'
        }
      ]
    },
    {
      category: 'For Owners',
      questions: [
        {
          q: 'How do I list my parking slot?',
          a: '1) Click "List Your Slot" from the home page\n2) Enter your slot number (e.g., "A-10")\n3) Choose slot type (covered, uncovered, or tandem)\n4) Add an optional description\n5) Set your hourly rate\n6) Click "List Slot"\n\nYour slot will appear in the marketplace immediately!'
        },
        {
          q: 'How much should I charge per hour?',
          a: 'Typical rates in Metro Manila condos are ₱30-80 per hour. Covered slots usually charge more than uncovered. Consider: your building\'s location, slot convenience (near elevator?), and market rates in your area. You can always adjust your price later.'
        },
        {
          q: 'Do I pay any fees or commissions?',
          a: 'No! ParkBoard charges zero fees. You keep 100% of your earnings. There are no listing fees, no commissions, and no hidden costs. It\'s completely free for owners.'
        },
        {
          q: 'Can I edit or delete my listing?',
          a: 'Currently, you can mark your slot as "inactive" if you no longer want to rent it. Editing slot details (coming in Phase 2) is not yet available. Contact alfieprojects.dev@gmail.com if you need to make changes.'
        },
        {
          q: 'How do I see who booked my slot?',
          a: 'Go to "My Bookings" - you\'ll see all bookings for slots you own. You\'ll see the renter\'s name, contact info, and booking times. The renter will also see your contact details.'
        }
      ]
    },
    {
      category: 'Pricing & Payment',
      questions: [
        {
          q: 'How do I pay for a booking?',
          a: 'Currently, payment is handled directly between renter and owner (cash, bank transfer, etc.). ParkBoard provides the booking system and contact information - you arrange payment privately. Integrated payment processing is planned for Phase 2.'
        },
        {
          q: 'What if there\'s a pricing dispute?',
          a: 'The price shown at booking time is the agreed price. Both parties can see the hourly rate, duration, and total in the booking details. If there\'s a dispute, contact us at alfieprojects.dev@gmail.com and we\'ll help mediate.'
        },
        {
          q: 'Can I offer discounts for longer bookings?',
          a: 'Currently, the system charges a flat hourly rate regardless of duration. Custom pricing (like daily or weekly rates) is planned for Phase 2. For now, you can manually arrange discounts with renters directly.'
        }
      ]
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          q: 'Is my personal information safe?',
          a: 'Yes. We use industry-standard security (HTTPS, encrypted passwords, secure databases). Your phone and unit number are only shared with people you book with or who book from you. We never sell your data.'
        },
        {
          q: 'How do you verify residents?',
          a: 'During registration, you must provide a valid condo unit number. While we don\'t currently verify units automatically, false information violates our terms and can result in account removal. Community trust is our foundation.'
        },
        {
          q: 'What if someone misuses my slot?',
          a: 'Contact the renter directly using the phone number in your booking. If there\'s a serious issue (damage, unauthorized use), document it and email alfieprojects.dev@gmail.com. We take violations seriously.'
        }
      ]
    },
    {
      category: 'Troubleshooting',
      questions: [
        {
          q: 'I can\'t log in. What should I do?',
          a: 'Make sure you\'re using the correct email and password. Password reset (coming soon) is not yet available. If you forgot your password, contact alfieprojects.dev@gmail.com with your registered email and unit number.'
        },
        {
          q: 'My booking isn\'t showing up',
          a: 'Check "My Bookings" - it should appear immediately after booking. If not, try refreshing the page. If it\'s still missing, the booking may have failed. Try booking again or contact support.'
        },
        {
          q: 'I see an error when booking',
          a: 'Common errors:\n• "Slot already booked" - Someone else booked those times. Try different times.\n• "End time must be after start time" - Check your time selection.\n• "Start time must be in the future" - You can\'t book past times.\n\nIf the error persists, contact alfieprojects.dev@gmail.com.'
        },
        {
          q: 'The app looks broken or isn\'t loading',
          a: 'Try: 1) Refresh the page (Ctrl+R or Cmd+R), 2) Clear your browser cache, 3) Try a different browser (Chrome, Firefox, Safari), 4) Check your internet connection. If problems persist, email us with your browser type and a screenshot.'
        }
      ]
    }
  ]

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
              <Link href="/about">
                <Button variant="ghost">About</Button>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Find answers to common questions about ParkBoard
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => document.getElementById('getting-started')?.scrollIntoView({ behavior: 'smooth' })}>
            <CardHeader>
              <div className="text-4xl mb-2">🚀</div>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sign up, account basics, and first steps
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => document.getElementById('for-renters')?.scrollIntoView({ behavior: 'smooth' })}>
            <CardHeader>
              <div className="text-4xl mb-2">🚗</div>
              <CardTitle>For Renters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How to browse and book parking slots
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => document.getElementById('for-owners')?.scrollIntoView({ behavior: 'smooth' })}>
            <CardHeader>
              <div className="text-4xl mb-2">💰</div>
              <CardTitle>For Owners</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                List your slot and manage bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Sections */}
        {faqs.map((section, sectionIndex) => (
          <div key={sectionIndex} id={section.category.toLowerCase().replace(/\s+/g, '-')} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {section.category}
            </h2>
            <div className="space-y-3">
              {section.questions.map((faq, faqIndex) => {
                const globalIndex = sectionIndex * 100 + faqIndex
                const isOpen = openFaq === globalIndex

                return (
                  <Card key={faqIndex} className="overflow-hidden">
                    <button
                      onClick={() => toggleFaq(globalIndex)}
                      className="w-full text-left p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white pr-8">
                          {faq.q}
                        </h3>
                        <span className={`text-2xl transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </button>
                    {isOpen && (
                      <CardContent className="pt-0 pb-6 px-6">
                        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                          {faq.a}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}

        {/* Contact Support */}
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="text-2xl">Still Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              Can&apos;t find the answer you&apos;re looking for? We&apos;re here to help!
            </p>
            <div className="space-y-2">
              <p>
                <strong>Email Support:</strong>{' '}
                <a href="mailto:alfieprojects.dev@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  alfieprojects.dev@gmail.com
                </a>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We typically respond within 24 hours
              </p>
            </div>
            <div className="pt-4">
              <Link href="/about">
                <Button variant="outline">Learn More About ParkBoard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Start?
          </h3>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/slots">
              <Button size="lg">Browse Slots</Button>
            </Link>
            <Link href="/slots/new">
              <Button size="lg" variant="outline">List Your Slot</Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="ghost">Back to Home</Button>
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
