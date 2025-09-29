// =====================================================
// DATABASE MIGRATION - Run this first in Supabase SQL Editor
// File: db/migrations/add_slot_ownership.sql
// =====================================================
/*
-- Add owner_id column to parking_slots
ALTER TABLE parking_slots
ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id);

-- Update RLS policies for ownership-aware booking
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;

CREATE POLICY "Users can book owned or shared slots"
  ON bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM parking_slots ps
      WHERE ps.slot_id = bookings.slot_id
        AND (ps.owner_id = auth.uid() OR ps.owner_id IS NULL)
    )
  );

-- Update viewing policy to show ownership info
DROP POLICY IF EXISTS "Anyone logged in can view slots" ON parking_slots;

CREATE POLICY "Users can view all slots with ownership info"
  ON parking_slots FOR SELECT
  USING (true);  -- Everyone can see all slots, but owner_id shows ownership
*/

// =====================================================
// File: app/api/bookings/route.ts
// Updated booking API with ownership validation
// =====================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest) {
  try {
    // Get user_id from query params or headers
    const userId = req.nextUrl.searchParams.get('user_id') || req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, parking_slots(slot_number, slot_type, owner_id)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.user_id || !body.slot_id || !body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, slot_id, start_time, end_time" },
      { status: 400 }
    );
  }

  // Validate booking duration limits
  const start = new Date(body.start_time);
  const end = new Date(body.end_time);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  const MIN_DURATION_HOURS = 1;
  const MAX_DURATION_HOURS = 24;
  const MAX_ADVANCE_DAYS = 30;
  
  if (durationHours < MIN_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Minimum booking duration is ${MIN_DURATION_HOURS} hour(s)` },
      { status: 400 }
    );
  }
  
  if (durationHours > MAX_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Maximum booking duration is ${MAX_DURATION_HOURS} hours` },
      { status: 400 }
    );
  }
  
  const now = new Date();
  const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysInAdvance > MAX_ADVANCE_DAYS) {
    return NextResponse.json(
      { error: `Cannot book more than ${MAX_ADVANCE_DAYS} days in advance` },
      { status: 400 }
    );
  }

  // Status validation
  if (body.status && !BOOKING_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (new Date(body.end_time) <= new Date(body.start_time)) {
    return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
  }

  // Check slot ownership
  const { data: slot, error: slotError } = await supabase
    .from("parking_slots")
    .select("owner_id, status")
    .eq("slot_id", body.slot_id)
    .single();

  if (slotError || !slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status !== 'available') {
    return NextResponse.json(
      { error: `Slot is currently ${slot.status}` },
      { status: 400 }
    );
  }

  // Check if slot is owned by someone else
  if (slot.owner_id && slot.owner_id !== body.user_id) {
    return NextResponse.json(
      { error: "This slot is reserved for another resident" },
      { status: 403 }
    );
  }

  // Overlap check
  const { data: existing, error: checkErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("slot_id", body.slot_id)
    .eq("status", "confirmed")
    .or(`and(start_time.lt.${body.end_time},end_time.gt.${body.start_time})`);

  if (checkErr)
    return NextResponse.json({ error: "Error checking existing bookings: " + checkErr.message }, { status: 500 });

  if (existing?.length)
    return NextResponse.json({ error: "Slot is already booked for this time period" }, { status: 409 });

  // Insert
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ ...body, status: body.status || "confirmed" }])
    .select("*, parking_slots(slot_number, slot_type, owner_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// =====================================================
// File: components/booking/SlotGrid.tsx
// Updated with ownership display
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import React from "react";

type Slot = {
  slot_id: string | number;
  slot_number?: string;
  slot_type?: string;
  isAvailable?: boolean;
  status?: string;
  owner_id?: string | null;
  description?: string;
};

export default function SlotGrid(props: {
  onSlotSelect: (s: { slot_id: string | number; slot_number?: string; slot_type?: string }) => void;
  selectedSlotId?: string | number | null;
  selected?: { slot_id?: string | number } | null;
  selectedDate?: string;
  selectedTimeRange?: { start: string; end: string };
}) {
  const {
    onSlotSelect,
    selectedSlotId,
    selected,
    selectedDate,
    selectedTimeRange,
  } = props;

  const { profile } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selId = selectedSlotId ?? selected?.slot_id ?? null;

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedTimeRange?.start || !selectedTimeRange?.end) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch all slots including ownership info
        const { data: allSlots, error: slotsError } = await supabase
          .from('parking_slots')
          .select('slot_id, slot_number, slot_type, status, description, owner_id')
          .eq('status', 'available');

        if (slotsError) throw slotsError;

        // Check availability for each slot with proper error handling
        const slotsWithAvailability = await Promise.all(
          (allSlots || []).map(async (slot) => {
            try {
              const { data: conflicts, error: conflictsError } = await supabase
                .from('bookings')
                .select('booking_id')
                .eq('slot_id', slot.slot_id)
                .eq('status', 'confirmed')
                .or(`and(start_time.lt.${selectedTimeRange.end},end_time.gt.${selectedTimeRange.start})`);

              if (conflictsError) {
                console.error('Error checking slot availability:', conflictsError);
                return { ...slot, isAvailable: true };
              }

              const hasConflicts = conflicts && conflicts.length > 0;
              const isOwned = slot.owner_id === profile?.id;
              const isShared = !slot.owner_id;
              const isOwnedByOther = slot.owner_id && slot.owner_id !== profile?.id;

              return {
                ...slot,
                isAvailable: !hasConflicts,
                isOwned,
                isShared,
                canBook: !hasConflicts && (isOwned || isShared),
                isOwnedByOther
              };
            } catch (networkError) {
              console.error('Network error checking slot availability:', networkError);
              return { ...slot, isAvailable: true };
            }
          })
        );

        setSlots(slotsWithAvailability);
      } catch (err: any) {
        console.error('Error fetching slots:', err);
        setError(err.message || 'Failed to load slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedTimeRange?.start, selectedTimeRange?.end, profile?.id]);

  const getSlotStatusColor = (slot: any) => {
    if (!slot.isAvailable) {
      return "bg-gray-200 border-gray-300";
    }
    if (slot.isOwnedByOther) {
      return "bg-red-50 border-red-200";
    }
    if (selId !== null && selId === slot.slot_id) {
      return "bg-blue-100 border-blue-500 ring-2 ring-blue-300";
    }
    if (slot.isOwned) {
      return "bg-green-50 border-green-300 hover:border-green-500 hover:bg-green-100";
    }
    return "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50";
  };

  const getSlotBadge = (slot: any) => {
    if (slot.isOwned) {
      return { text: "Your Slot", className: "bg-blue-100 text-blue-800" };
    }
    if (slot.isOwnedByOther) {
      return { text: "Reserved", className: "bg-red-100 text-red-800" };
    }
    if (!slot.isAvailable) {
      return { text: "Booked", className: "bg-gray-300 text-gray-800" };
    }
    if (slot.slot_type === 'visitor') {
      return { text: "Visitor", className: "bg-purple-100 text-purple-800" };
    }
    return { text: "Available", className: "bg-green-100 text-green-800" };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <div className="text-gray-600">Loading parking slots...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (slots.length === 0) {
    return <div className="text-gray-600 text-center py-8">No available slots for the selected time</div>;
  }

  // Sort slots: owned first, then shared, then unavailable
  const sortedSlots = [...slots].sort((a: any, b: any) => {
    if (a.isOwned && !b.isOwned) return -1;
    if (!a.isOwned && b.isOwned) return 1;
    if (a.isShared && !b.isShared) return -1;
    if (!a.isShared && b.isShared) return 1;
    return 0;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Available Slots</h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
          <span>Your Slots</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
          <span>Shared</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span>Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedSlots.map((slot: any) => {
          const canBook = slot.canBook;
          const badge = getSlotBadge(slot);

          return (
            <button
              key={slot.slot_id}
              onClick={() =>
                canBook &&
                onSlotSelect({
                  slot_id: slot.slot_id,
                  slot_number: slot.slot_number,
                  slot_type: slot.slot_type,
                })
              }
              disabled={!canBook}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-100 transform ${getSlotStatusColor(
                slot
              )} ${canBook ? "hover:scale-[1.02] cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              aria-pressed={selId !== null && selId === slot.slot_id}
              aria-label={`${slot.slot_number ?? slot.slot_id} - ${slot.slot_type ?? ""} - ${badge.text}`}
            >
              <div className="text-sm font-semibold">{slot.slot_number ?? slot.slot_id}</div>
              <div className="text-xs text-gray-700 capitalize">{slot.slot_type ?? "—"}</div>

              <span className={`mt-2 inline-block px-2 py-0.5 text-xs rounded-full ${badge.className}`}>
                {badge.text}
              </span>
              
              {slot.description && (
                <div className="mt-1 text-xs text-gray-500 text-center">{slot.description}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// File: app/admin/slots/page.tsx
// Updated admin page with owner assignment
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function AdminSlotsPage() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [formData, setFormData] = useState({
    slot_number: '',
    slot_type: 'uncovered',
    status: 'available',
    description: '',
    owner_id: ''
  });

  useEffect(() => {
    if (profile?.role !== 'admin') {
      window.location.href = '/dashboard';
    } else {
      fetchSlots();
      fetchUsers();
    }
  }, [profile]);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*, owner:user_profiles!parking_slots_owner_id_fkey(name, unit_number)')
      .order('slot_number');
    
    if (!error) {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, name, unit_number')
      .order('name');
    setUsers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slotData = {
      slot_number: formData.slot_number,
      slot_type: formData.slot_type,
      status: formData.status,
      description: formData.description,
      owner_id: formData.owner_id || null,
      updated_at: new Date().toISOString()
    };

    if (editingSlot) {
      const { error } = await supabase
        .from('parking_slots')
        .update(slotData)
        .eq('slot_id', editingSlot.slot_id);

      if (!error) {
        setEditingSlot(null);
        fetchSlots();
      } else {
        alert('Error updating slot: ' + error.message);
      }
    } else {
      const { error } = await supabase
        .from('parking_slots')
        .insert([slotData]);

      if (!error) {
        setIsAddingSlot(false);
        setFormData({
          slot_number: '',
          slot_type: 'uncovered',
          status: 'available',
          description: '',
          owner_id: ''
        });
        fetchSlots();
      } else {
        alert('Error adding slot: ' + error.message);
      }
    }
  };

  const handleEdit = (slot: any) => {
    setEditingSlot(slot);
    setFormData({
      slot_number: slot.slot_number,
      slot_type: slot.slot_type,
      status: slot.status,
      description: slot.description || '',
      owner_id: slot.owner_id || ''
    });
    setIsAddingSlot(true);
  };

  const handleDelete = async (slotId: number) => {
    if (!confirm('Are you sure you want to delete this slot?')) return;

    const { error } = await supabase
      .from('parking_slots')
      .delete()
      .eq('slot_id', slotId);

    if (!error) {
      fetchSlots();
    } else {
      alert('Error deleting slot: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsAddingSlot(false);
    setEditingSlot(null);
    setFormData({
      slot_number: '',
      slot_type: 'uncovered',
      status: 'available',
      description: '',
      owner_id: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Parking Slots</h1>
          {!isAddingSlot && (
            <button
              onClick={() => setIsAddingSlot(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add New Slot
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {isAddingSlot && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingSlot ? 'Edit Slot' : 'Add New Slot'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slot Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slot_number}
                    onChange={(e) => setFormData({...formData, slot_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., A-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slot Type
                  </label>
                  <select
                    value={formData.slot_type}
                    onChange={(e) => setFormData({...formData, slot_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="covered">Covered</option>
                    <option value="uncovered">Uncovered</option>
                    <option value="visitor">Visitor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner (leave empty for shared/visitor)
                  </label>
                  <select
                    value={formData.owner_id}
                    onChange={(e) => setFormData({...formData, owner_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Shared/Visitor Slot</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - Unit {user.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Near elevator, Compact cars only"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSlot ? 'Update Slot' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Slots Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slot Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slots.map((slot) => (
                <tr key={slot.slot_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {slot.slot_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {slot.slot_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      slot.status === 'available' 
                        ? 'bg-green-100 text-green-800'
                        : slot.status === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {slot.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {slot.owner ? `${slot.owner.name} (Unit ${slot.owner.unit_number})` : 'Shared'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {slot.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(slot)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(slot.slot_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Slots</div>
            <div className="text-2xl font-bold text-gray-900">{slots.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Owned Slots</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => s.owner_id).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Shared Slots</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => !s.owner_id).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Available</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => s.status === 'available').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}