// =============================================================================
// components/BookingConfirmation.tsx - Success state after booking
// =============================================================================

export default function BookingConfirmation({ booking, onDone, refreshBookings }) {
  if (!booking) return null;

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const slotNumber = booking.parking_slots?.slot_number ?? booking.slot_number ?? booking.slot_id;
  const slotType = booking.parking_slots?.slot_type ?? booking.slot_type ?? 'slot';

  return (
    <div role="status" aria-live="polite" className="max-w-md mx-auto">
      <div className="flex flex-col items-center bg-white border rounded-xl p-6 shadow-sm">
        <div className="bg-green-50 p-4 rounded-full mb-3">
          {/* Big checkmark */}
          <svg className="h-12 w-12 text-green-700" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
            <path d="M7 12.5l2.5 2.5L17 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-green-800">Booking Confirmed</h2>
        <p className="text-sm text-gray-600 mt-2">Your parking slot has been reserved.</p>

        <div className="w-full mt-4 text-left">
          <div className="text-sm text-gray-500">Slot</div>
          <div className="font-medium text-gray-800">{slotNumber} <span className="text-sm text-gray-500">({slotType})</span></div>

          <div className="mt-3 text-sm text-gray-500">When</div>
          <div className="text-gray-800">
            {startTime.toLocaleString()} – {endTime.toLocaleString()}
          </div>
        </div>

        <div className="w-full mt-6">
          <button
            onClick={() => {
              refreshBookings?.();
              onDone();
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

