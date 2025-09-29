# Adding Slot Ownership to ParkBoard MVP

## Phase 1: Database Changes (5 minutes)

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE parking_slots
ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id);

-- Update RLS: Users can only book slots they own OR shared slots
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
```

## Phase 2: Backend API Update (10 minutes)

Update `/app/api/bookings/route.ts` validation:

```typescript
// Add after line 35 (before overlap check)
// Check ownership
const { data: slot } = await supabase
  .from("parking_slots")
  .select("owner_id")
  .eq("slot_id", body.slot_id)
  .single();

if (slot?.owner_id && slot.owner_id !== body.user_id) {
  return NextResponse.json(
    { error: "You cannot book a slot owned by another resident" },
    { status: 403 }
  );
}
```

## Phase 3: Frontend Changes (20 minutes)

### A. Update SlotGrid Component

In `/components/booking/SlotGrid.tsx`, modify the slot fetching:

```typescript
// Around line 38, enhance the slot data structure
const slotsWithAvailability = await Promise.all(
  (allSlots || []).map(async (slot) => {
    // ... existing conflict check ...
    
    return {
      ...slot,
      isAvailable: !conflicts || conflicts.length === 0,
      isOwned: slot.owner_id === profile?.id,  // Add this
      isShared: !slot.owner_id,                 // Add this
      canBook: !slot.owner_id || slot.owner_id === profile?.id  // Add this
    };
  })
);
```

Then update the slot display (around line 130):

```typescript
// Add ownership badge
{slot.isOwned && (
  <span className="mt-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">
    Your Slot
  </span>
)}
{slot.owner_id && !slot.isOwned && (
  <span className="mt-1 text-xs bg-gray-100 text-gray-600 px-1 rounded">
    Reserved
  </span>
)}
```

### B. Admin Slot Assignment

In `/app/admin/slots/page.tsx`, add owner assignment to the form (around line 90):

```typescript
// Add to formData state
const [formData, setFormData] = useState({
  slot_number: '',
  slot_type: 'uncovered',
  status: 'available',
  description: '',
  owner_id: ''  // Add this
});

// Add user selection dropdown in the form (after description field):
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Owner (leave empty for shared)
  </label>
  <select
    value={formData.owner_id}
    onChange={(e) => setFormData({...formData, owner_id: e.target.value})}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
  >
    <option value="">Shared/Visitor</option>
    {users.map(user => (
      <option key={user.id} value={user.id}>
        {user.name} - Unit {user.unit_number}
      </option>
    ))}
  </select>
</div>
```

## Phase 4: Mixed Slot Display (10 minutes)

Update the main dashboard to show owned vs shared slots clearly:

```typescript
// In UserDashboard.tsx or a new MySlots component
const MySlots = () => {
  const [ownedSlots, setOwnedSlots] = useState([]);
  
  useEffect(() => {
    const fetchMySlots = async () => {
      const { data } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('owner_id', profile.id);
      setOwnedSlots(data || []);
    };
    fetchMySlots();
  }, [profile.id]);
  
  if (ownedSlots.length > 0) {
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900">Your Assigned Slots</h3>
        <div className="mt-2 space-y-1">
          {ownedSlots.map(slot => (
            <div key={slot.slot_id} className="text-sm text-blue-700">
              Slot {slot.slot_number} ({slot.slot_type})
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
```

## Testing Checklist

- [ ] Create slots with different owners via admin panel
- [ ] Verify residents can book their own slots
- [ ] Verify residents can book shared slots (owner_id = NULL)
- [ ] Verify residents CANNOT book other people's owned slots
- [ ] Check slot grid shows ownership status correctly
- [ ] Admin can reassign slot ownership

## Benefits of This Approach

1. **Minimal Changes**: Uses existing structure
2. **Backward Compatible**: All current slots work as shared
3. **Progressive Enhancement**: Can gradually assign ownership
4. **Clear Visual Feedback**: Users see what they own
5. **Flexible Model**: Supports mixed owned/shared environment

## Common Patterns

Most condos have:
- 60-70% owned/assigned slots (residents)
- 20-30% visitor slots (shared)
- 10% maintenance/reserved slots

Start by keeping all slots shared, then gradually assign ownership as needed.