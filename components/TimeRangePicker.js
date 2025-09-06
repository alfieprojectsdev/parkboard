// =============================================================================
// TimeRangePicker.js - Select start/end times for booking
// =============================================================================

import { useEffect, useState } from 'react';

export default function TimeRangePicker({ value, onChange }) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('4'); // hours
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!startDate || !startTime) {
        throw new Error('Please select both date and time');
      }

      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(start.getTime() + (parseFloat(duration) * 60 * 60 * 1000));

      // Validation
      const now = new Date();
      if (start <= now) {
        throw new Error('Start time must be in the future');
      }

      if (end <= start) {
        throw new Error('End time must be after start time');
      }

      onChange({
        start: start.toISOString(),
        end: end.toISOString()
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  }, []);

  return (
    <div className="max-w-md space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="4">4 hours</option>
            <option value="8">8 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Find Available Slots
        </button>
      </form>
    </div>
  );
}

