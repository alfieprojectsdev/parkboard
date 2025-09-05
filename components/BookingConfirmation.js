// =============================================================================
// BookingConfirmation.js - Success state after booking
// =============================================================================

export default function BookingConfirmation({ booking, onDone }) {
  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600">
          Your parking slot has been successfully reserved.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Slot:</span>
          <span className="font-medium">#{booking.slot_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">
            {new Date(booking.start_time).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Time:</span>
          <span className="font-medium">
            {new Date(booking.start_time).toLocaleTimeString()} - {new Date(booking.end_time).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onDone}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          View My Bookings
        </button>
        <p className="text-sm text-gray-500">
          You can manage your booking from the "My Bookings" tab.
        </p>
      </div>
    </div>
  );
}