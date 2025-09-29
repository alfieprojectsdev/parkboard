// components/UserBookingsList.tsx - Enhanced with booking history
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSlotIcon } from "@/lib/getSlotIcon";

export default function UserBookingsList({ userId }: { userId: string }) {
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all bookings
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_slots(slot_number, slot_type)")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      const active = [];
      const past = [];
      
      for (const booking of data || []) {
        if (booking.status === 'cancelled' || 
            booking.status === 'completed' || 
            new Date(booking.end_time) < now) {
          past.push(booking);
        } else if (booking.status === 'confirmed') {
          active.push(booking);
        }
      }
      
      setActiveBookings(active);
      setPastBookings(past);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const cancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const booking = activeBookings.find((b) => b.booking_id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const now = new Date();
      const bookingStart = new Date(booking.start_time);
      const graceHours = 1;
      const cutoffTime = new Date(now.getTime() - graceHours * 60 * 60 * 1000);

      if (bookingStart < cutoffTime) {
        throw new Error(
          `Cannot cancel bookings that started more than ${graceHours} hour(s) ago.`
        );
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .select();

      if (error) throw new Error(error.message || "Database update failed");
      if (!data || data.length === 0)
        throw new Error("No booking found with that ID or update failed");

      await fetchBookings(); // Refresh both lists
    } catch (err: any) {
      alert("Failed to cancel booking: " + (err.message || String(err)));
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-semibold mb-2">
            Failed to load bookings
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const bookingsToShow = viewMode === 'active' ? activeBookings : pastBookings;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'history' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            History ({pastBookings.length})
          </button>
        </div>
        <button
          onClick={() => fetchBookings()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {bookingsToShow.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewMode === 'active' ? 'No Active Bookings' : 'No Booking History'}
          </h3>
          <p className="text-gray-500">
            {viewMode === 'active' 
              ? 'Your confirmed bookings will appear here' 
              : 'Your past bookings will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingsToShow.map((booking) => {
            const slotType = booking.parking_slots?.slot_type || "standard";
            const slotBgClass =
              slotType.toLowerCase() === "visitor"
                ? "bg-purple-100"
                : slotType.toLowerCase() === "covered"
                ? "bg-blue-100"
                : "bg-green-100";

            const statusColor = 
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              booking.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800';

            return (
              <div
                key={booking.booking_id}
                className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                  viewMode === 'history' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div
                        className={`${slotBgClass} p-2 rounded-lg mr-3 flex-shrink-0`}
                      >
                        {getSlotIcon(slotType)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Slot{" "}
                          {booking.parking_slots?.slot_number || booking.slot_id}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {slotType} parking space
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3a2 2 0 012-2h2a2 2 0 012 2v4m-6 0h6m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1m-6 0v11a2 2 0 002 2h2a2 2 0 002-2V7"
                            />
                          </svg>
                          <span className="font-medium text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(booking.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Notes:{" "}
                        </span>
                        <span className="text-sm text-gray-600">
                          {booking.notes}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${statusColor}`}>
                        {booking.status}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Booking #{booking.booking_id}</span>
                    </div>
                  </div>

                  {viewMode === 'active' && booking.status === 'confirmed' && (
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => cancelBooking(booking.booking_id)}
                        disabled={cancelling === booking.booking_id}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling === booking.booking_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent mr-2"></div>
                            <span className="hidden sm:inline">Cancelling...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="hidden sm:inline">Cancel</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}