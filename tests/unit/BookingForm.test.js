/**
 * Unit tests for BookingForm component logic
 * 
 * Here we test the validation and submission handling
 * without needing a real Supabase backend.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import BookingForm from '@/components/BookingForm';

// Mock supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              gt: jest.fn(() => ({
                neq: jest.fn(() => ({
                  then: jest.fn()
                }))
              }))
            }))
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        then: jest.fn()
      }))
    }))
  }
}));

describe('BookingForm', () => {
  const mockSlot = { slot_id: 1, slot_number: 'A1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays validation error if end < start', async () => {
    render(<BookingForm selectedSlot={mockSlot} onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '2030-01-01T14:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.click(screen.getByText(/Book Slot/i));
    expect(await screen.findByText(/End time must be after start time/)).toBeInTheDocument();
  });

  test('displays error if booking is in the past', async () => {
    render(<BookingForm selectedSlot={mockSlot} onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '2000-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '2000-01-01T12:00' } });
    fireEvent.click(screen.getByText(/Book Slot/i));
    expect(await screen.findByText(/Cannot book slots in the past/)).toBeInTheDocument();
  });

  test('displays error if double-booking', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              gt: jest.fn(() => ({
                neq: jest.fn(() => ({
                  then: jest.fn(cb => cb({ data: [{ booking_id: 99 }] }))
                }))
              }))
            }))
          }))
        }))
      }))
    });
    render(<BookingForm selectedSlot={mockSlot} onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '2030-01-01T12:00' } });
    fireEvent.click(screen.getByText(/Book Slot/i));
    expect(await screen.findByText(/Time slot conflicts/)).toBeInTheDocument();
  });

  test('displays error if user already has active booking', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gt: jest.fn(() => ({
              then: jest.fn(cb => cb({ data: [{ booking_id: 88 }] }))
            }))
          }))
        }))
      }))
    });
    render(<BookingForm selectedSlot={mockSlot} onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '2030-01-01T12:00' } });
    fireEvent.click(screen.getByText(/Book Slot/i));
    expect(await screen.findByText(/User already has an active booking/)).toBeInTheDocument();
  });

  test('calls onSuccess for valid booking', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              gt: jest.fn(() => ({
                neq: jest.fn(() => ({
                  then: jest.fn(cb => cb({ data: [] }))
                }))
              }))
            }))
          }))
        }))
      }))
    });
    supabase.insert.mockReturnValue({
      select: jest.fn(() => ({
        then: jest.fn(cb => cb({ data: [{ booking_id: 1 }] }))
      }))
    });
    const onSuccess = jest.fn();
    render(<BookingForm selectedSlot={mockSlot} onSuccess={onSuccess} onCancel={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/End Time/i), { target: { value: '2030-01-01T12:00' } });
    fireEvent.click(screen.getByText(/Book Slot/i));
    expect(onSuccess).toHaveBeenCalledWith({ booking_id: 1 });
  });
});
