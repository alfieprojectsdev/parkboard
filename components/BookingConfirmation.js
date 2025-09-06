// =============================================================================
// BookingConfirmation.js - Success state after booking
// =============================================================================

export default function BookingConfirmation({ booking, onDone }) {
  return (
    <div className="bg-green-100 p-6 rounded-lg text-center">
      <h2 className="text-xl font-bold mb-2">Booking Confirmed!</h2>
      <div className="mb-2">
        <strong>Slot:</strong> {booking.slot_id}
      </div>
      <div className="mb-2">
        <strong>Start:</strong> {new Date(booking.start_time).toLocaleString()}
      </div>
      <div className="mb-2">
        <strong>End:</strong> {new Date(booking.end_time).toLocaleString()}
      </div>
      <button
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}