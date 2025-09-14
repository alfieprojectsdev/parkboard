<!-- docs/curl-testing-checklist.md -->
## **1️⃣ User Profiles**

### GET all
[X] Pass / [ ] Fail
```bash
curl -X GET http://localhost:3000/api/profiles
```

### POST new
[x] Pass / [ ] Fail
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "id": "44444444-4444-4444-4444-444444444444",
    "name": "Eve Resident",
    "unit_number": "104D",
    "email": "eve@example.com",
    "phone": "09170001133",
    "vehicle_plate": "GHI-789",
    "role": "resident"
  }'
```

### PATCH existing
[x] Pass / [ ] Fail
```bash
curl -X PATCH http://localhost:3000/api/profiles/44444444-4444-4444-4444-444444444444 \
  -H "Content-Type: application/json" \
  -d '{"phone":"09179998877"}'
```

### DELETE
[x] Pass / [ ] Fail
```bash
curl -X DELETE http://localhost:3000/api/profiles/44444444-4444-4444-4444-444444444444
```

---

## **2️⃣ Parking Slots**

### GET all
[x] Pass / [ ] Fail
```bash
curl -X GET http://localhost:3000/api/slots
```

### POST new
[x] Pass / [ ] Fail
```bash
curl -X POST http://localhost:3000/api/slots \
  -H "Content-Type: application/json" \
  -d '{"slot_number":"107F","slot_type":"covered","status":"available","description":"Near elevator"}'
```

### PATCH existing
[x] Pass / [ ] Fail
<!-- passed on second attempt -->
```bash
curl -X PATCH http://localhost:3000/api/slots/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"maintenance"}'
```

### DELETE
[x] Pass / [ ] Fail
```bash
curl -X DELETE http://localhost:3000/api/slots/1
```

---

## **3️⃣ Bookings**

### GET all
[x] Pass / [ ] Fail
```bash
curl -X GET http://localhost:3000/api/bookings
```

### POST new
[x] Pass / [ ] Fail
<!-- passed on second attempt -->
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "11111111-1111-1111-1111-111111111111",
    "slot_id": 2,
    "start_time": "2025-09-11T08:00:00Z",
    "end_time": "2025-09-11T18:00:00Z",
    "status": "confirmed",
    "notes": "Morning to evening"
  }'
```

### PATCH existing
[x] Pass / [ ] Fail
<!-- passed on second attempt -->
```bash
curl -X PATCH http://localhost:3000/api/bookings/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

### DELETE
[x] Pass / [ ] Fail
```bash
curl -X DELETE http://localhost:3000/api/bookings/1
```

---

## **4️⃣ Payments**

### GET all
[x] Pass / [ ] Fail
```bash
curl -X GET http://localhost:3000/api/payments
```

### POST new
[x] Pass / [ ] Fail
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "amount": 150.00,
    "payment_method": "gcash",
    "status": "completed",
    "reference_number": "GC12345"
  }'
```

### PATCH existing
[x] Pass / [ ] Fail
<!-- passed after several attempts -->
```bash
curl -X PATCH http://localhost:3000/api/payments/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"refunded"}'
```

### DELETE
[x] Pass / [ ] Fail
<!-- passed on second attempt -->
```bash
curl -X DELETE http://localhost:3000/api/payments/1
```

---

### ✅ Notes
* Replace IDs / UUIDs / slot numbers as appropriate for your seeded dev data.
* When `NEXT_PUBLIC_DEV_MODE=true` → FK checks bypassed, so you can insert arbitrary `user_id` and `id`.
* When `NEXT_PUBLIC_DEV_MODE=false` → FK checks active, errors are returned if `auth.users` or referenced rows don’t exist.
* You can chain `GET` commands after POST/PATCH/DELETE to verify changes in real time.
