// components/UserBookingsList.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSlotIcon } from "@/lib/getSlotIcon";

export default function UserBookingsList({ userId }: { userId: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_slots(slot_number, slot_type)")
        .eq("user_id", userId)
        .in("status", ["confirmed"])
        .order("start_time", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
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
      const booking = bookings.find((b) => b.booking_id === bookingId);
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

      setBookings((prev) => prev.filter((b) => b.booking_id !== bookingId));
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
          <div className="text-red-600 mb-3">
            <svg
              className="w-6 h-6 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
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

  if (!bookings.length) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Active Bookings
          </h3>
          <p className="text-gray-500 mb-4">
            Your confirmed bookings will appear here
          </p>
          <button
            onClick={() => fetchBookings()}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
          >
            Refresh Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">My Active Bookings</h2>
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

      <div className="space-y-4">
        {bookings.map((booking) => {
          const slotType = booking.parking_slots?.slot_type || "standard";
          const slotBgClass =
            slotType.toLowerCase() === "visitor"
              ? "bg-purple-100"
              : slotType.toLowerCase() === "covered"
              ? "bg-blue-100"
              : "bg-green-100";

          return (
            <div
              key={booking.booking_id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
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
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Confirmed
                    </span>
                    <span className="mx-2">•</span>
                    <span>Booking #{booking.booking_id}</span>
                  </div>
                </div>

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
                        <span className="sm:hidden">...</span>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
