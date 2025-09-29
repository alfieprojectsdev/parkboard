// =====================================================
// File: components/ErrorBoundary.tsx
// React Error Boundary for crash protection
// =====================================================
"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // You could send error to logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =====================================================
// File: components/dashboard/MySlots.tsx
// Component to show user's owned slots
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function MySlots() {
  const { profile } = useAuth();
  const [ownedSlots, setOwnedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMySlots = async () => {
      if (!profile?.id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('owner_id', profile.id)
        .order('slot_number');
      
      if (!error) {
        setOwnedSlots(data || []);
      }
      setLoading(false);
    };
    
    fetchMySlots();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="animate-pulse bg-blue-50 rounded-lg p-4">
        <div className="h-4 bg-blue-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-blue-100 rounded w-1/2"></div>
      </div>
    );
  }

  if (ownedSlots.length === 0) {
    return null; // Don't show anything if user has no owned slots
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Your Assigned Parking Slots
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ownedSlots.map(slot => (
          <div key={slot.slot_id} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-900">
                  Slot {slot.slot_number}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {slot.slot_type} parking
                </div>
                {slot.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {slot.description}
                  </div>
                )}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                slot.status === 'available' 
                  ? 'bg-green-100 text-green-800'
                  : slot.status === 'maintenance'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {slot.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-700">
        💡 You can book your assigned slots anytime they're available
      </div>
    </div>
  );
}

// =====================================================
// File: components/UserDashboard.tsx
// Updated with MySlots component
// =====================================================
"use client";

import { useState, useRef } from 'react';
import UserBookingsList from '@/components/booking/UserBookingsList';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import MySlots from '@/components/dashboard/MySlots';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 mb-2">No profile found</p>
          <p className="text-sm text-gray-600">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setBookingConfirmed(null);
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome back, {profile.name}!
        </h1>
        <p className="text-gray-600">Unit {profile.unit_number}</p>
      </div>

      {/* Show owned slots if user has any */}
      <MySlots />

      {/* Tab navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'bookings' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('bookings')}
        >
          My Bookings
        </button>
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'new' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('new')}
        >
          New Booking
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'bookings' && (
          <UserBookingsList userId={profile.id || ''} key={refreshKey} />
        )}

        {activeTab === 'new' && !bookingConfirmed && (
          <BookingForm
            onSuccess={setBookingConfirmed}
          />
        )}

        {bookingConfirmed && (
          <BookingConfirmation
            booking={bookingConfirmed}
            onDone={() => {
              setBookingConfirmed(null);
              setActiveTab('bookings');
            }}
            refreshBookings={triggerRefresh}
          />
        )}
      </div>
    </div>
  );
}

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

// =====================================================
// File: lib/constants.ts
// Centralized booking rules and constants
// =====================================================
export const BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
} as const;

export const SLOT_TYPES = {
  COVERED: 'covered',
  UNCOVERED: 'uncovered', 
  VISITOR: 'visitor',
} as const;

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export const USER_ROLES = {
  RESIDENT: 'resident',
  ADMIN: 'admin',
} as const;

// =====================================================
// File: components/booking/BookingForm.tsx
// Updated with booking rules validation
// =====================================================
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import { BOOKING_RULES } from '@/lib/constants';
import ErrorDisplay, { SuccessMessage } from '../common/ErrorDisplay';

export default function BookingForm({ onSuccess }: { onSuccess: (booking: any) => void }) {
  const { profile, user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateBooking = () => {
    if (!selectedSlot) {
      setError('Please select a parking slot.');
      return false;
    }
    
    if (!selectedTimeRange.start || !selectedTimeRange.end) {
      setError('Please select both start and end times.');
      return false;
    }

    const start = new Date(selectedTimeRange.start);
    const end = new Date(selectedTimeRange.end);
    const now = new Date();
    
    // Check duration limits
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (durationHours < BOOKING_RULES.MIN_DURATION_HOURS) {
      setError(`Minimum booking duration is ${BOOKING_RULES.MIN_DURATION_HOURS} hour(s)`);
      return false;
    }
    
    if (durationHours > BOOKING_RULES.MAX_DURATION_HOURS) {
      setError(`Maximum booking duration is ${BOOKING_RULES.MAX_DURATION_HOURS} hours`);
      return false;
    }
    
    // Check advance booking limit
    const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysInAdvance > BOOKING_RULES.MAX_ADVANCE_DAYS) {
      setError(`Cannot book more than ${BOOKING_RULES.MAX_ADVANCE_DAYS} days in advance`);
      return false;
    }
    
    return true;
  };

  const handleBooking = async () => {
    setError('');
    setSuccess('');

    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile?.id,
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Booking failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();

      const bookingResult =
        result && result.parking_slots
          ? result
          : {
              ...result,
              parking_slots: {
                slot_number: selectedSlot.slot_number,
                slot_type: selectedSlot.slot_type,
              },
            };

      setSuccess('Booking successful! Redirecting...');
      
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });
      
      setTimeout(() => {
        onSuccess(bookingResult);
      }, 1500);

    } catch (err: any) {
      console.error('Booking error:', err);
      
      if (err.message.includes('fetch failed') || err.message.includes('TypeError')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else if (err.message.includes('already booked')) {
        setError('This slot is already booked for the selected time. Please choose a different slot or time.');
      } else if (err.message.includes('reserved for another')) {
        setError('This slot is reserved for another resident. Please select a different slot.');
      } else if (err.message.includes('500')) {
        setError('Server error occurred. Please try again in a moment.');
      } else if (err.message.includes('past')) {
        setError('Cannot book slots in the past. Please select a future time.');
      } else {
        setError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>
        
        <ErrorDisplay error={error} onRetry={clearError} className="mb-4" />
        <SuccessMessage message={success} onDismiss={clearSuccess} className="mb-4" />
        
        <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      </div>

      {selectedTimeRange.start && selectedTimeRange.end && (
        <SlotGrid
          selectedDate={selectedTimeRange.start?.slice(0, 10)}
          selectedTimeRange={selectedTimeRange}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Selected Slot</h3>
          <p className="text-blue-700">
            {selectedSlot.slot_number} ({selectedSlot.slot_type})
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {new Date(selectedTimeRange.start).toLocaleString()} - {' '}
            {new Date(selectedTimeRange.end).toLocaleString()}
          </p>
          
          <button
            className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end}
            aria-busy={loading}
            aria-disabled={loading || !selectedSlot}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? 'Saving booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}