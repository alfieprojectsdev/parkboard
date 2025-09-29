// app/page.tsx - Updated home page with proper navigation
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <svg 
              className="w-16 h-16 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to ParkBoard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Smart parking management for modern communities. Book your spot, manage your schedule, and never worry about parking again.
          </p>
        </header>

        {/* Main CTA */}
        <div className="flex justify-center gap-4 mb-12">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/about"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Learn More
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Availability</h3>
            <p className="text-gray-600">
              Check parking slot availability in real-time and book instantly.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book, modify, or cancel your parking reservations with just a few clicks.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Admin Tools</h3>
            <p className="text-gray-600">
              Powerful admin dashboard for managing slots, users, and bookings.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Go to Dashboard
            </Link>
            <Link href="/bookings/new" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Book a Slot
            </Link>
            <Link href="/bookings" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View My Bookings
            </Link>
            <Link href="/about" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              About ParkBoard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}