// =============================================================================
// BookingCard.js - Individual booking display component
// =============================================================================

function BookingCard({ booking, onCancel }) {
  const now = new Date();
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const isActive = booking.status === 'confirmed' && endTime > now;
  const isPast = endTime <= now;

  const getStatusColor = () => {
    switch (booking.status) {
      case 'confirmed': return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">
            Slot {booking.parking_slots?.slot_number}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {booking.parking_slots?.slot_type}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor()}`}>
          {booking.status}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        <div className="font-medium">
          {startTime.toLocaleDateString()}
        </div>
        <div>
          {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
        </div>
      </div>

      {booking.parking_slots?.description && (
        <p className="text-sm text-gray-500">
          {booking.parking_slots.description}
        </p>
      )}

      {booking.notes && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">Notes: </span>
          <span className="text-gray-600">{booking.notes}</span>
        </div>
      )}

      {isActive && booking.status === 'confirmed' && (
        <button
          onClick={() => onCancel(booking.booking_id)}
          className="w-full mt-3 px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
        >
          Cancel Booking
        </button>
      )}
    </div>
  );
}

