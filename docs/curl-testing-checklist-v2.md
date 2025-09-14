<!-- docs/curl-testing-checklist-v2.md -->

## **1️⃣ User Profiles (Seeded Users)**

### GET all

\[ ] Pass / \[ ] Fail

```bash
curl -X GET http://localhost:3000/api/profiles
```

### POST new (extra resident)

\[ ] Pass / \[ ] Fail

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "id": "55555555-5555-5555-5555-555555555555",
    "name": "New Resident",
    "unit_number": "205B",
    "email": "newresident@example.com",
    "phone": "09179990000",
    "vehicle_plate": "JKL-222",
    "role": "resident"
  }'
```

### PATCH existing (seeded user)

\[ ] Pass / \[ ] Fail

```bash
curl -X PATCH http://localhost:3000/api/profiles/00000000-0000-0000-0000-000000000001 \
  -H "Content-Type: application/json" \
  -d '{"phone":"09175551234"}'
```

### DELETE

\[ ] Pass / \[ ] Fail

```bash
curl -X DELETE http://localhost:3000/api/profiles/55555555-5555-5555-5555-555555555555
```

---

## **2️⃣ Parking Slots (Seeded Slots)**

### GET all

\[ ] Pass / \[ ] Fail

```bash
curl -X GET http://localhost:3000/api/slots
```

### POST new

\[ ] Pass / \[ ] Fail

```bash
curl -X POST http://localhost:3000/api/slots \
  -H "Content-Type: application/json" \
  -d '{"slot_number":"210Z","slot_type":"visitor","status":"available","description":"Temporary visitor slot"}'
```

### PATCH existing (seeded slot)

\[ ] Pass / \[ ] Fail

```bash
curl -X PATCH http://localhost:3000/api/slots/3 \
  -H "Content-Type: application/json" \
  -d '{"status":"reserved"}'
```

### DELETE

\[ ] Pass / \[ ] Fail

```bash
curl -X DELETE http://localhost:3000/api/slots/210Z
```

---

## **3️⃣ Bookings (Seeded + New)**

### GET all

\[ ] Pass / \[ ] Fail

```bash
curl -X GET http://localhost:3000/api/bookings
```

### POST new (resident booking a seeded slot)

\[ ] Pass / \[ ] Fail

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000002",
    "slot_id": 5,
    "start_time": "2025-09-12T08:00:00Z",
    "end_time": "2025-09-12T17:00:00Z",
    "status": "confirmed",
    "notes": "Test seeded booking"
  }'
```

### PATCH existing (seeded booking)

\[ ] Pass / \[ ] Fail

```bash
curl -X PATCH http://localhost:3000/api/bookings/2 \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}'
```

### DELETE

\[ ] Pass / \[ ] Fail

```bash
curl -X DELETE http://localhost:3000/api/bookings/2
```

---

## **4️⃣ Payments (Seeded + New)**

### GET all

\[ ] Pass / \[ ] Fail

```bash
curl -X GET http://localhost:3000/api/payments
```

### POST new

\[ ] Pass / \[ ] Fail

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 3,
    "amount": 250.00,
    "payment_method": "gcash",
    "status": "completed",
    "reference_number": "GC88888"
  }'
```

### PATCH existing (seeded payment)

\[ ] Pass / \[ ] Fail

```bash
curl -X PATCH http://localhost:3000/api/payments/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"refunded"}'
```

### DELETE

\[ ] Pass / \[ ] Fail

```bash
curl -X DELETE http://localhost:3000/api/payments/3
```

---

### ✅ Notes

* Swap in actual UUIDs/slot IDs/payment IDs from your seeder run output.
* Keep at least a few seeded users/admins untouched for repeat testing.
* Chain `GET` → `POST` → `PATCH` → `DELETE` to verify CRUD integrity per entity.
* Log failed attempts separately — intermittent PHIVOLCS network issues may require 2nd runs.

---

## 🔧 Delta Patch (Additions to v2)

### 1. Invalid enums

```bash
# Invalid slot_type
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/slots \
  -H "Content-Type: application/json" \
  -d '{"slot_number":"X1","slot_type":"invalid","status":"available"}'
# Expect: 400

# Invalid payment_method
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"booking_id":1,"amount":100,"payment_method":"cashmoney","status":"completed"}'
# Expect: 400
```

---

### 2. Foreign key failures (prod mode)

```bash
# Non-existent user + slot
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000","slot_id":9999,"start_time":"2030-01-01T10:00:00Z","end_time":"2030-01-01T12:00:00Z"}'
# Expect: 400 (if NEXT_PUBLIC_DEV_MODE=false)
```

---

### 3. Booking-specific rules

```bash
# Booking in the past
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id":"111...","slot_id":2,"start_time":"2000-01-01T10:00:00Z","end_time":"2000-01-01T12:00:00Z"}'
# Current: 500; Desired: 400

# Double booking (same slot, overlapping time)
# First should succeed (201), second should fail (409 desired)
curl -i -X POST http://localhost:3000/api/bookings -H "Content-Type: application/json" \
  -d '{"user_id":"111...","slot_id":2,"start_time":"2030-01-01T10:00:00Z","end_time":"2030-01-01T12:00:00Z"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/bookings -H "Content-Type: application/json" \
  -d '{"user_id":"222...","slot_id":2,"start_time":"2030-01-01T11:00:00Z","end_time":"2030-01-01T13:00:00Z"}'
# Expect: 409 (currently 201)

# One active booking per user
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id":"111...","slot_id":3,"start_time":"2030-01-02T10:00:00Z","end_time":"2030-01-02T12:00:00Z"}'
# Expect: 409 (currently 201)
```

---

### 4. Role/authorization checks

```bash
# Attempt admin-only change as non-admin
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:3000/api/profiles/<user_id> \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
# Expect: 403 (currently may succeed if RLS not configured properly)
```

---

### 5. Payment edge cases

```bash
# Negative amount
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"booking_id":1,"amount":-50,"payment_method":"gcash","status":"completed"}'
# Expect: 400
```

---

### 6. Post-action assertions

```bash
# Verify booking count increased
curl -s http://localhost:3000/api/bookings | jq '. | length'

# Inspect last booking
curl -s http://localhost:3000/api/bookings | jq '.[-1] | {user_id, slot_id, start_time, end_time}'
```
