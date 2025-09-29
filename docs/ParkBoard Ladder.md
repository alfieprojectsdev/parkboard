# ParkBoard — Condo Parking Booking Ladder

> MVP: Residents reserve slots; admins manage slots & approvals.  
> [[Shared Foundation Ladder]]

## 1. Discovery & constraints
- [ ] Confirm condo-specific booking rules  
  - #due::2025-08-21

## 2. MVP scope
- [ ] Choose core features (booking, calendar view, recurring)  
  - #due::2025-08-21

## 3. Schema — core tables
- [ ] Draft SQL for `users`, `profiles`, `buildings`, `units`, `parking_slots`, `bookings`, `recurring_bookings`, `reservation_rules`  
- [ ] Add exclusion constraints for overlaps  
  - Depends on: [[Shared Foundation Ladder#4. Shared Auth & RLS plan]]  
  - #due::2025-08-22

## 4. Availability logic
- [ ] Create `available_slots_view`  
- [ ] Write `get_available_slots_at()` function  
  - #due::2025-08-22

## 5. RLS & roles mapping
- [ ] Roles: `resident`, `building_admin`, `security`, `guest`  
- [ ] RLS: residents see own bookings; admins manage slots  
  - #due::2025-08-23

## 6. UI wireframes
- [ ] Quick-book button, calendar, slot map, admin slot manager  
  - #due::2025-08-24

## 7. Implement booking flows
- [ ] Booking form & conflict detection  
  - #due::2025-08-25

## 8. Admin slot management
- [ ] Add/edit slots, assign rules, CSV import  
  - #due::2025-08-26

## 9. Recurring bookings
- [ ] Implement recurring logic & cancellation policy  
  - #due::2025-08-27

## 10. Guest passes
- [ ] Generate printable guest pass PDFs  
  - #due::2025-08-28

## 11. Notifications
- [ ] Booking confirmations & reminders  
  - #due::2025-08-29

## 12. QA & testing
- [ ] UAT with residents & admins  
  - #due::2025-08-30

## 13. Launch & metrics
- [ ] Deploy MVP  
- [ ] Monitor usage  
  - #due::2025-08-31

## Additional Supabase Extensions
See [[Baseline Supabase Extensions]] for shared installs.
- [ ] **btree_gist** – Exclusion constraints to prevent overlapping slot bookings.
- [ ] **postgis** – Geospatial mapping of parking slots.
- [ ] **pg_cron** – Scheduled jobs for auto-expiring unpaid/pending bookings.

## Schema — core tables (in JSON)
```json
{
  "enums": {
    "user_role": ["resident", "building_admin", "security_staff", "super_admin"],
    "booking_status": ["pending", "approved", "rejected", "completed", "cancelled"],
    "slot_type": ["regular", "visitor", "ev_charging", "disabled_access"]
  },
  "tables": {
    "users": {
      "columns": {
        "id": "uuid (PK)",
        "email": "text (unique, not null)",
        "full_name": "text",
        "role": "user_role (default: resident)",
        "unit_number": "text",
        "created_at": "timestamp (default: now())"
      },
      "relationships": {
        "bookings": "bookings.user_id"
      }
    },
    "parking_slots": {
      "columns": {
        "id": "uuid (PK)",
        "slot_number": "text (not null)",
        "type": "slot_type (default: regular)",
        "location": "text",
        "is_active": "boolean (default: true)",
        "created_at": "timestamp (default: now())"
      },
      "relationships": {
        "bookings": "bookings.slot_id"
      }
    },
    "bookings": {
      "columns": {
        "id": "uuid (PK)",
        "user_id": "uuid (FK -> users.id)",
        "slot_id": "uuid (FK -> parking_slots.id)",
        "status": "booking_status (default: pending)",
        "start_time": "timestamp",
        "end_time": "timestamp",
        "created_at": "timestamp (default: now())"
      },
      "relationships": {
        "user": "users.id",
        "slot": "parking_slots.id"
      }
    },
    "notifications": {
      "columns": {
        "id": "uuid (PK)",
        "user_id": "uuid (FK -> users.id)",
        "message": "text",
        "is_read": "boolean (default: false)",
        "created_at": "timestamp (default: now())"
      },
      "relationships": {
        "user": "users.id"
      }
    }
  },
  "rls_rules": {
    "users": ["Self-select/update only"],
    "parking_slots": ["Admins manage all", "Residents select all active"],
    "bookings": ["Residents insert/select own", "Admins select/update all"],
    "notifications": ["User selects own", "Admins insert to any"]
  }
}

```

## Wireframe Copy – ParkBoard
*(Shared Condo Parking Booking)*
**Pages & Sections**
1. **Landing Page**
   * Hero: *"Book Your Spot Without the Hassle"*
   * Subtext: *"Easily reserve and manage shared parking in your building."*
   * CTA: *Book a Spot*
2. **Booking Calendar**
   * Month/week toggle
   * Tooltip: *"{Spot Name} – Available/Booked"*
3. **Booking Detail View**
   * Spot photo & details
   * Reserve button
4. **Resident Dashboard**
   * Tabs: My Bookings, Payment History, Building Notices
5. **Admin Dashboard**
   * Tabs: Spot Management, Booking Requests, Reports