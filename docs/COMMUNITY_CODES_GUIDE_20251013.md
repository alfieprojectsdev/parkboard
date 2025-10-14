# ParkBoard - Community Codes Guide
**Date:** 2025-10-13
**Purpose:** Guidelines for community code assignment

---

## Understanding Community Codes

### Origin: Organic vs Official

**Example: LMR (Lumiere)**
- ✅ **Emerged organically** from Viber group chat
- ✅ Community consensus (not management-assigned)
- ✅ Short, memorable identifier
- ✅ Already recognized by residents

**Why This Matters:**
- Organic codes have better adoption (residents already use them)
- No need to "teach" new codes
- Community ownership of branding
- Natural word-of-mouth marketing

---

## Code Format Guidelines

### Recommended Format

**3-Letter Codes (Primary):**
```
LMR  - Lumiere (organic from Viber GC)
SRP  - Serendra (example)
BGC  - BGC condos (example)
```

**Why 3 letters:**
- Easy to type in mobile
- Easy to remember
- Clean URLs (parkboard.app/LMR)
- Fits well in UI headers

**Alternative Formats (If Needed):**
```
2-4 letters acceptable:
  LU   - Very short (if community prefers)
  LUMI - Slightly longer (if needed for clarity)

Avoid:
  LUMIERE    - Too long for URLs
  LMR-2024   - Don't include dates
  lmr        - System converts to uppercase anyway
```

---

## Code Assignment Process

### For New Communities

**Step 1: Ask the Community**
```
"What code does your community already use?"
- Check Viber/WhatsApp group names
- Check existing resident abbreviations
- Ask building admin what residents call it
```

**Step 2: Validate Uniqueness**
```sql
-- Check if code already exists
SELECT * FROM communities WHERE community_code = 'XYZ';

-- If exists, suggest alternatives
```

**Step 3: Register in Database**
```sql
INSERT INTO communities (community_code, name, display_name) VALUES
  ('LMR', 'Lumiere', 'Lumiere Residences');
```

**Step 4: Deploy** (no code changes needed!)

---

## Examples of Good Community Codes

### From Manila Condos

```
LMR  - Lumiere Residences (Pasig Blvd)
ONE  - One Shangri-La Place
SRP  - Serendra (BGC)
RCK  - Rockwell Center condos
SHR  - The Shang (Makati)
BGC  - Generic BGC area condos
MCK  - McKinley Hill
```

### Why These Work
- Residents already use them
- Easy to say: "I'm in LMR"
- Clean branding: parkboard.app/LMR
- No confusion

---

## Code Conflicts & Resolution

### If Two Buildings Want Same Code

**Example:** Both "Lumiere" and "Luna" want "LUM"

**Resolution Options:**
1. **Geographic suffix:** LUM-P (Pasig), LUM-Q (QC)
2. **Building suffix:** LUM1, LUM2
3. **Negotiate:** One uses LMR, other uses LUN
4. **First-come basis:** First to onboard gets preferred code

**Best Practice:** Prevent conflicts by checking existing codes first

---

## Implementation Notes

### Case Sensitivity
```typescript
// System always uppercases codes
user enters: "lmr"
system stores: "LMR"
URL works: parkboard.app/lmr OR parkboard.app/LMR
```

### URL Routing
```typescript
// Both URLs work (system normalizes)
parkboard.app/lmr   → redirects to → parkboard.app/LMR
parkboard.app/LMR   → works directly
```

### Validation Rules
```typescript
const VALID_CODE_REGEX = /^[A-Z]{2,4}$/

// Valid:
"LMR"  ✅
"SRP"  ✅
"BGCT" ✅

// Invalid:
"L"         ❌ (too short)
"LUMIERE"   ❌ (too long)
"LM-R"      ❌ (no special chars)
"123"       ❌ (no numbers)
```

---

## Community Settings

### Per-Community Customization

**Example: LMR Settings**
```json
{
  "branding": {
    "fullName": "Lumiere Residences",
    "shortName": "Lumiere",
    "tagline": "Park smarter at Lumiere",
    "origin": "organic",
    "viberGroup": "Lumiere Residents"
  },
  "features": {
    "requestQuote": true,
    "instantBooking": true,
    "guestParking": false
  },
  "rules": {
    "maxBookingDays": 30,
    "cancellationHours": 24,
    "requireApproval": false
  },
  "contact": {
    "buildingManagement": "+63 2 123 4567",
    "email": "parking@lumiere.com"
  }
}
```

---

## Marketing & Onboarding

### How to Introduce ParkBoard to New Communities

**Step 1: Identify the Code**
```
"What do you call yourselves in your group chat?"
→ Use that code!
```

**Step 2: Test with Small Group**
```
"Visit parkboard.app/LMR to try it out"
→ 5-10 early adopters
```

**Step 3: Viber Announcement**
```
"We're now on ParkBoard!
Visit parkboard.app/LMR to:
- Rent parking from neighbors
- List your slot when you're away

Use code: LMR (that's us!)"
```

**Step 4: Word of Mouth**
```
"Park at LMR through parkboard.app/LMR"
→ Natural adoption
```

---

## Technical: Adding New Community

### Quick Add (15 minutes)

**Step 1: Database**
```sql
INSERT INTO communities (community_code, name, display_name, address, city) VALUES
  ('SRP', 'Serendra', 'Serendra', 'BGC, Taguig', 'Metro Manila');
```

**Step 2: Update VALID_COMMUNITIES**
```typescript
// middleware.ts or community validator
const VALID_COMMUNITIES = ['LMR', 'SRP']  // Add new code
```

**Step 3: Test**
```
Visit: parkboard.app/SRP
Expected: Community landing page
```

**Step 4: Done!**
No other code changes needed.

---

## Future: Dynamic Community Discovery

### Phase 1 (Current): Hardcoded List
```typescript
const VALID_COMMUNITIES = ['LMR', 'SRP', 'BGC']
```

### Phase 2 (Future): Database-Driven
```typescript
// Fetch from database at runtime
const { data: communities } = await supabase
  .from('communities')
  .select('community_code')
  .eq('status', 'active')

const VALID_COMMUNITIES = communities.map(c => c.community_code)
```

**Benefit:** Add communities without code deployment

---

## FAQs

### Q: What if community wants to change their code?
**A:** Can be done, but requires:
1. Update database: `UPDATE communities SET community_code = 'NEW'`
2. Update URLs: Old URLs redirect to new
3. Notify users: "We're now /NEW instead of /OLD"
4. Migration period: Support both for 30 days

### Q: Can one building have multiple codes?
**A:** Yes, but not recommended. Better to have one primary code.

### Q: What about towers within buildings?
**A:** Use single code for entire building complex:
- Lumiere Tower A & B = LMR (not LMR-A, LMR-B)
- Unit numbers differentiate (already in profile)

### Q: Can communities share ParkBoard?
**A:** No - data isolation enforced. Each community is separate.

### Q: What if code is offensive/inappropriate?
**A:** Admin can reject. Suggest alternatives.

---

## Summary

**Key Points:**
1. ✅ Use organic codes from community (like LMR from Viber)
2. ✅ Keep codes 2-4 letters (3 is ideal)
3. ✅ Uppercase normalized automatically
4. ✅ Easy to add new communities (15 min)
5. ✅ Community-driven = better adoption

**For LMR Launch:**
- "LMR" already recognized by Lumiere residents
- Natural fit for parkboard.app/LMR
- No need to teach new terminology
- Community owns the branding

---

**Ready for deployment with LMR as the organic community code!**

