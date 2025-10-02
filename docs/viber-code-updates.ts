// ============================================================================
// CRITICAL CODE UPDATES FOR VIBER MIGRATION
// Update these files BEFORE testing
// ============================================================================

// ----------------------------------------------------------------------------
// 1. app/onboarding/page.tsx - ADD VIBER MEMBER RECOGNITION
// ----------------------------------------------------------------------------
// Add around line 30-40, after user check:

const checkViberMember = async (email: string) => {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('viber_member, viber_nickname, viber_join_date')
    .eq('email', email)
    .single();
  
  return profile;
};

// In the component, add welcome message for Viber members:
{viberProfile?.viber_member && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
    <h3 className="font-semibold text-green-800">
      Welcome back from LMR Parking! 👋
    </h3>
    <p className="text-sm text-green-600 mt-1">
      We recognize you as {viberProfile.viber_nickname} - 
      member since {new Date(viberProfile.viber_join_date).toLocaleDateString('en-PH')}
    </p>
  </div>
)}

// ----------------------------------------------------------------------------
// 2. app/owner/setup/page.tsx - FIX P6 CONFUSION & ADD QUICK POST
// ----------------------------------------------------------------------------
// Replace slot number input with smart naming:

const generateUniqueSlotId = (floor: string, tower: string, number: string) => {
  // Auto-generate unique identifier to prevent P6 confusion
  const towerId = tower.substring(0, 2).toUpperCase(); // NT, ST, ET, WT
  return `${floor}-${towerId}-${number.padStart(3, '0')}`;
};

// Add these new form fields:
<div className="grid grid-cols-3 gap-4">
  <div>
    <label className="block text-sm font-medium mb-2">
      Floor Level *
    </label>
    <select
      value={floorLevel}
      onChange={(e) => setFloorLevel(e.target.value)}
      className="w-full p-2 border rounded-md"
      required
    >
      <option value="">Select floor</option>
      <option value="P1">P1</option>
      <option value="P2">P2</option>
      <option value="P3">P3</option>
      <option value="P4">P4</option>
      <option value="P5">P5</option>
      <option value="P6">P6</option>
      <option value="B1">B1 (Basement)</option>
      <option value="B2">B2 (Basement)</option>
    </select>
  </div>
  
  <div>
    <label className="block text-sm font-medium mb-2">
      Building/Tower *
    </label>
    <select
      value={buildingTower}
      onChange={(e) => setBuildingTower(e.target.value)}
      className="w-full p-2 border rounded-md"
      required
    >
      <option value="">Select tower</option>
      <option value="North Tower">North Tower</option>
      <option value="South Tower">South Tower</option>
      <option value="East Tower">East Tower</option>
      <option value="West Tower">West Tower</option>
    </select>
  </div>
  
  <div>
    <label className="block text-sm font-medium mb-2">
      Slot Number *
    </label>
    <input
      type="text"
      value={slotNumber}
      onChange={(e) => setSlotNumber(e.target.value)}
      placeholder="001"
      className="w-full p-2 border rounded-md"
      maxLength={3}
      required
    />
    <p className="text-xs text-gray-500 mt-1">
      Will create: {generateUniqueSlotId(floorLevel, buildingTower, slotNumber)}
    </p>
  </div>
</div>

// Add location tags for better discovery:
<div className="mt-4">
  <label className="block text-sm font-medium mb-2">
    Location Features (helps renters find you faster)
  </label>
  <div className="flex flex-wrap gap-2">
    {['near elevator', 'near exit', 'easy access', 'corner spot', 
      'near entrance', 'well-lit', 'CCTV covered', 'wide space'].map(tag => (
      <label key={tag} className="flex items-center">
        <input
          type="checkbox"
          value={tag}
          checked={locationTags.includes(tag)}
          onChange={(e) => {
            if (e.target.checked) {
              setLocationTags([...locationTags, tag]);
            } else {
              setLocationTags(locationTags.filter(t => t !== tag));
            }
          }}
          className="mr-2"
        />
        <span className="text-sm bg-gray-100 px-2 py-1 rounded">
          {tag}
        </span>
      </label>
    ))}
  </div>
</div>

// Add "AVAILABLE NOW" quick post button:
<div className="border-t pt-4 mt-4">
  <h3 className="font-semibold mb-2">Quick Availability (Viber-style)</h3>
  <button
    type="button"
    onClick={() => setShowQuickPost(true)}
    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
  >
    🚀 Available NOW
  </button>
  
  {showQuickPost && (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
      <label className="block text-sm font-medium mb-2">
        Available until:
      </label>
      <input
        type="datetime-local"
        value={quickAvailableUntil}
        min={new Date().toISOString().slice(0, 16)}
        onChange={(e) => setQuickAvailableUntil(e.target.value)}
        className="w-full p-2 border rounded-md"
      />
      <button
        onClick={async () => {
          await supabase.from('parking_slots').update({
            quick_availability_active: true,
            quick_availability_until: quickAvailableUntil,
            quick_availability_posted_at: new Date().toISOString(),
            is_listed_for_rent: true
          }).eq('slot_id', slotId);
          toast.success('Posted as Available NOW!');
        }}
        className="mt-2 bg-green-500 text-white px-4 py-2 rounded"
      >
        Post Immediate Availability
      </button>
    </div>
  )}
</div>

// ----------------------------------------------------------------------------
// 3. app/marketplace/page.tsx - OPTIMIZE FOR VIBER MIGRATION
// ----------------------------------------------------------------------------
// Add quick filters for common Viber searches:

const QuickFilters = () => (
  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
    <h3 className="text-sm font-semibold mb-2">Quick Search (Viber-style):</h3>
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setSearchTerm('P6 North Tower')}
        className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-50"
      >
        P6 North Tower
      </button>
      <button
        onClick={() => setSearchTerm('near elevator')}
        className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-50"
      >
        Near Elevator
      </button>
      <button
        onClick={() => filterByQuickAvailability()}
        className="px-3 py-1 bg-green-500 text-white rounded-full text-sm hover:bg-green-600"
      >
        ⚡ Available NOW
      </button>
      <button
        onClick={() => setSearchTerm('easy access')}
        className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-50"
      >
        Easy Access
      </button>
    </div>
  </div>
);

// Update the slot query to include Viber context:
const fetchSlots = async () => {
  let query = supabase
    .from('parking_slots')
    .select(`
      *,
      owner:owner_id (
        full_name,
        viber_nickname,
        viber_member,
        preferred_payment_note
      )
    `)
    .eq('is_listed_for_rent', true)
    .eq('status', 'available');

  // Prioritize "Available NOW" posts
  if (showQuickAvailability) {
    query = query
      .eq('quick_availability_active', true)
      .gt('quick_availability_until', new Date().toISOString())
      .order('quick_availability_posted_at', { ascending: false });
  }
  
  const { data } = await query;
  return data;
};

// Display Viber member badges on listings:
{slot.owner?.viber_member && (
  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
    ✓ LMR Parking Member
    {slot.owner.viber_nickname && ` (${slot.owner.viber_nickname})`}
  </span>
)}

// Show payment note prominently:
<div className="mt-2 p-2 bg-gray-50 rounded text-sm">
  💰 Payment: {slot.owner?.preferred_payment_note || 'Contact owner for payment details'}
</div>

// ----------------------------------------------------------------------------
// 4. app/marketplace/[slotId]/page.tsx - ZERO PM BOOKING FLOW
// ----------------------------------------------------------------------------
// Display ALL information upfront to eliminate PMs:

<div className="space-y-4">
  {/* Viber Trust Signal */}
  {slot.owner?.viber_member && (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-green-800">
            ✓ Verified LMR Parking Member
          </span>
          <p className="text-sm text-green-600 mt-1">
            {slot.owner.viber_nickname || slot.owner.full_name}
            {slot.owner.viber_join_date && 
              ` • Member since ${new Date(slot.owner.viber_join_date).toLocaleDateString('en-PH')}`
            }
          </p>
        </div>
      </div>
    </div>
  )}

  {/* Clear Location Info */}
  <div className="bg-white border rounded-lg p-4">
    <h3 className="font-semibold mb-2">📍 Exact Location</h3>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>Tower: {slot.building_tower}</div>
      <div>Floor: {slot.floor_level}</div>
      <div>Slot ID: {slot.unique_identifier}</div>
      <div>Type: {slot.slot_type}</div>
    </div>
    {slot.location_tags && (
      <div className="mt-2 flex flex-wrap gap-1">
        {slot.location_tags.map(tag => (
          <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-xs">
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>

  {/* Payment Instructions - No PM Needed */}
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <h3 className="font-semibold mb-2">💰 Payment Method</h3>
    <p className="text-sm">
      {slot.owner?.preferred_payment_note || 
       'GCash/Maya/Cash - coordinate after booking confirmation'}
    </p>
    <p className="text-xs text-yellow-700 mt-2">
      Note: Payment is handled directly with owner, just like in Viber
    </p>
  </div>

  {/* One-Click Booking - No PM Required */}
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h3 className="font-semibold mb-2">🎯 Book Without PM!</h3>
    <p className="text-sm text-blue-700 mb-4">
      All details are here. No need to message "Is this available?" - 
      just book directly!
    </p>
    {/* Existing booking form */}
  </div>
</div>

// ----------------------------------------------------------------------------
// 5. components/common/Navigation.tsx - ADD VIBER MIGRATION HELPERS
// ----------------------------------------------------------------------------
// Add migration stats badge:

const MigrationStats = () => {
  const [stats, setStats] = useState({ saved_time: 0, pms_avoided: 0 });
  
  useEffect(() => {
    // Fetch user's migration metrics
    supabase
      .from('viber_migration_metrics')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setStats(data);
      });
  }, []);

  if (stats.pms_avoided > 0) {
    return (
      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
        ✨ {stats.pms_avoided} PMs avoided • {stats.saved_time}min saved
      </div>
    );
  }
  return null;
};

// Add to navigation:
<nav className="flex items-center space-x-4">
  {/* Existing nav items */}
  <MigrationStats />
</nav>

// ----------------------------------------------------------------------------
// 6. CRITICAL PERFORMANCE OPTIMIZATIONS
// ----------------------------------------------------------------------------
// Add to app/marketplace/page.tsx for 1,655-member scale:

// Implement pagination for large slot lists:
const SLOTS_PER_PAGE = 20;

const [currentPage, setCurrentPage] = useState(1);
const [totalSlots, setTotalSlots] = useState(0);

const fetchSlotsWithPagination = async (page: number) => {
  const from = (page - 1) * SLOTS_PER_PAGE;
  const to = from + SLOTS_PER_PAGE - 1;
  
  const { data, count } = await supabase
    .from('parking_slots')
    .select('*', { count: 'exact' })
    .eq('is_listed_for_rent', true)
    .range(from, to)
    .order('quick_availability_active', { ascending: false }) // NOW posts first
    .order('rental_rate_hourly', { ascending: true }); // Then by price
  
  setSlots(data);
  setTotalSlots(count);
};

// Add search debouncing to prevent overload:
import { debounce } from 'lodash';

const debouncedSearch = debounce((term: string) => {
  performSearch(term);
}, 300);

// Implement virtual scrolling for mobile performance:
import { FixedSizeList } from 'react-window';

const SlotList = ({ slots }) => (
  <FixedSizeList
    height={600}
    width="100%"
    itemCount={slots.length}
    itemSize={120}
  >
    {({ index, style }) => (
      <div style={style}>
        <SlotCard slot={slots[index]} />
      </div>
    )}
  </FixedSizeList>
);