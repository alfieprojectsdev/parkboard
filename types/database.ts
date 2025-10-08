// ============================================================================
// DATABASE TYPES - Mirror your SQL schema
// ============================================================================
// These TypeScript types MUST match your database schema exactly
// Think of this as a "contract" between your app and database
//
// 🎓 LEARNING: Why separate type definitions?
// ----------------------------------------------------------------------------
// 1. Type Safety: TypeScript catches errors at compile-time, not runtime
//    Example: Trying to set status = 'invalid' → TypeScript error!
//
// 2. Autocomplete: Your IDE knows what fields exist
//    Type "booking." and see all available fields
//
// 3. Documentation: Types serve as inline docs for your schema
//    No need to check SQL file to know what fields exist
//
// 4. Refactoring: Change schema? Update types once, get errors everywhere
//    TypeScript shows all places that need updating
// ----------------------------------------------------------------------------

// 🎓 LEARNING: Union Types (Literal Types)
// ----------------------------------------------------------------------------
// "Union type" = value can be ONE of several specific options
//
// type SlotStatus = 'active' | 'maintenance' | 'disabled'
//                     ^          ^                ^
//                     These are the ONLY valid values
//
// This is better than: type SlotStatus = string
// Because "string" would allow ANY text, even 'asdfasdf'
//
// Database constraint (from schema_refined.sql):
// CHECK (status IN ('active', 'maintenance', 'disabled'))
//
// TypeScript type here MUST match database constraint!
// ----------------------------------------------------------------------------
export type SlotStatus = 'active' | 'maintenance' | 'disabled'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

// 🎓 LEARNING: interface vs type
// ----------------------------------------------------------------------------
// Both define object shapes, but interfaces are better for database models:
// - Can be extended (interface UserProfile extends BaseUser)
// - Better error messages in IDE
// - Conventional for object shapes
//
// Use "type" for unions/primitives: type Status = 'active' | 'disabled'
// Use "interface" for objects: interface User { name: string }
// ----------------------------------------------------------------------------

export interface UserProfile {
  // 🎓 UUID from PostgreSQL/Supabase = string in TypeScript
  // Why string? UUIDs are text like "550e8400-e29b-41d4-a716-446655440000"
  id: string

  name: string
  email: string
  phone: string
  unit_number: string

  // 🎓 LEARNING: Dates from database are strings
  // --------------------------------------------------------------------------
  // PostgreSQL TIMESTAMPTZ → Supabase → JavaScript = string (ISO 8601 format)
  // Example: "2025-10-06T14:30:00.000Z"
  //
  // To use as Date object:
  // const date = new Date(profile.created_at)
  //
  // Why not Date type here?
  // - JSON.stringify() converts Date to string anyway
  // - Database returns string, so type should match reality
  // - Prevents confusion about what format we're working with
  // --------------------------------------------------------------------------
  created_at: string
  updated_at: string  // Added in schema_optimized.sql
}

export interface ParkingSlot {
  // 🎓 SERIAL in PostgreSQL = number in TypeScript
  // SERIAL is auto-incrementing integer: 1, 2, 3, ...
  slot_id: number

  // 🎓 LEARNING: Nullable fields (null vs undefined)
  // --------------------------------------------------------------------------
  // "string | null" means: Can be a string OR null
  // Why null? Database allows NULL for owner_id (condo-owned slots)
  //
  // null vs undefined:
  // - null = Intentionally empty (database value)
  // - undefined = Not set yet (JavaScript concept)
  //
  // From database: null (PostgreSQL NULL)
  // In TypeScript optional: undefined (field?: string)
  // --------------------------------------------------------------------------
  owner_id: string | null

  slot_number: string

  // 🎓 Why "string | null" for description but not required fields?
  // SQL schema: description TEXT (no NOT NULL constraint)
  // Means it's optional in database, so optional in TypeScript
  slot_type: string  // Changed to NOT NULL with CHECK constraint in schema_optimized.sql
  description: string | null

  // 🎓 DECIMAL in PostgreSQL = number in TypeScript
  // PostgreSQL DECIMAL(10,2) → JavaScript number
  // Be careful: JavaScript numbers are floating point (can have precision issues)
  // For money, always: Math.round(price * 100) / 100
  price_per_hour: number

  // 🎓 Using the SlotStatus type we defined above
  // This ensures status is ONLY 'active' | 'maintenance' | 'disabled'
  status: SlotStatus

  created_at: string
  updated_at: string  // Added in schema_optimized.sql
}

export interface Booking {
  booking_id: number
  slot_id: number
  renter_id: string
  slot_owner_id: string | null  // Denormalized in schema_optimized.sql for RLS performance

  // 🎓 Timestamps: Always strings from database
  start_time: string
  end_time: string

  total_price: number
  status: BookingStatus
  created_at: string
  updated_at: string  // Added in schema_optimized.sql
}

// ============================================================================
// JOINED TYPES (for queries with relationships)
// ============================================================================
// These types represent data with SQL JOINs
// Supabase returns nested objects when you join tables
//
// 🎓 LEARNING: Database Joins in Supabase
// ----------------------------------------------------------------------------
// SQL JOIN:
// SELECT slots.*, users.name FROM parking_slots slots
// JOIN user_profiles users ON slots.owner_id = users.id
//
// Supabase equivalent:
// .from('parking_slots').select('*, user_profiles(*)')
//
// Returns nested structure:
// {
//   slot_id: 1,
//   slot_number: 'A-10',
//   user_profiles: {      ← Nested object!
//     id: '...',
//     name: 'John Doe'
//   }
// }
// ----------------------------------------------------------------------------

// 🎓 LEARNING: "extends" keyword
// ----------------------------------------------------------------------------
// "SlotWithOwner extends ParkingSlot" means:
// - Has ALL fields from ParkingSlot (slot_id, slot_number, etc.)
// - PLUS additional fields defined below (user_profiles)
//
// This is inheritance for types - like a subclass in OOP
// ----------------------------------------------------------------------------
export interface SlotWithOwner extends ParkingSlot {
  // user_profiles: Result of JOIN with user_profiles table
  // Can be null if slot has no owner (owner_id IS NULL)
  user_profiles: UserProfile | null
}

// 🎓 LEARNING: Intersection type (&)
// ----------------------------------------------------------------------------
// ParkingSlot & { user_profiles: UserProfile }
//                ^
//                Ampersand = "AND" (combine types)
//
// Means: An object that has:
// - All ParkingSlot fields (slot_id, etc.) AND
// - A user_profiles field of type UserProfile
//
// Different from | (pipe) which means "OR":
// - string | number = Can be string OR number
// - string & number = Impossible! (can't be both)
// - {a: string} & {b: number} = {a: string, b: number} ✅ Works!
// ----------------------------------------------------------------------------
export interface BookingWithDetails extends Booking {
  parking_slots: ParkingSlot & {
    user_profiles: UserProfile
  }
}

// 🎓 EXAMPLE: How to use these types
// ----------------------------------------------------------------------------
// // Without joins (basic type):
// const slot: ParkingSlot = await supabase
//   .from('parking_slots')
//   .select('*')
//   .single()
//
// // With joins (nested type):
// const slotWithOwner: SlotWithOwner = await supabase
//   .from('parking_slots')
//   .select(`
//     *,
//     user_profiles (*)
//   `)
//   .single()
//
// // Access nested data:
// console.log(slotWithOwner.slot_number)              // Direct field
// console.log(slotWithOwner.user_profiles?.name)      // Joined field (optional chaining)
// ----------------------------------------------------------------------------

// ============================================================================
// TYPE GUARDS
// ============================================================================
// Type guards are functions that help TypeScript narrow types at runtime
//
// 🎓 LEARNING: What is a Type Guard?
// ----------------------------------------------------------------------------
// Problem: User input is always "string" but we need SlotStatus
//
// const status: string = userInput
// const slot: ParkingSlot = { status }  // ❌ Error! string ≠ SlotStatus
//
// Solution: Type guard validates and narrows the type
//
// if (isValidSlotStatus(status)) {
//   const slot: ParkingSlot = { status }  // ✅ Now TypeScript knows it's valid
// }
// ----------------------------------------------------------------------------

// 🎓 LEARNING: "status is SlotStatus" syntax
// ----------------------------------------------------------------------------
// This is a "type predicate" - special return type for type guards
//
// Normal function: function isValid(x: string): boolean
// Type guard: function isValid(x: string): x is SlotStatus
//                                           ^^^^^^^^^^^^
//                                           "If true, x is SlotStatus"
//
// When this function returns true, TypeScript changes x's type:
// - Before: string
// - After: SlotStatus
//
// This is how TypeScript "learns" at runtime!
// ----------------------------------------------------------------------------
export function isValidSlotStatus(status: string): status is SlotStatus {
  // 🎓 Array.includes() checks if value exists in array
  // Returns: boolean (true if found, false if not)
  //
  // Why not just: status === 'active' || status === 'maintenance' || ...?
  // - This is cleaner and maintainable
  // - If SlotStatus changes, update array in one place
  return ['active', 'maintenance', 'disabled'].includes(status)
}

export function isValidBookingStatus(status: string): status is BookingStatus {
  return ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(status)
}

// 🎓 PRACTICAL EXAMPLE: Using type guards in forms
// ----------------------------------------------------------------------------
// function handleFormSubmit(event: FormEvent) {
//   const formData = new FormData(event.target)
//   const status = formData.get('status') as string  // Always string from form
//
//   if (!isValidSlotStatus(status)) {
//     alert('Invalid status!')  // Validation!
//     return
//   }
//
//   // TypeScript now knows status is SlotStatus, not just string
//   await supabase.from('parking_slots').insert({ status })  // ✅ Type-safe
// }
// ----------------------------------------------------------------------------