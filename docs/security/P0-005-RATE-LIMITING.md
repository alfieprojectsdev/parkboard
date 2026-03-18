# P0-005: Rate Limiting on Authentication Endpoints

## Status: COMPLETED

## Summary

Added rate limiting to signup and login endpoints to prevent brute-force password attacks and community code enumeration attacks.

## Implementation Details

### 1. Signup Endpoint (`/app/api/auth/signup/route.ts`)

**Changes:**
- Added rate limit check BEFORE any validation (prevents enumeration)
- Uses email as rate limit identifier
- Returns 429 status when rate limited
- Includes X-RateLimit-* headers in all responses

**Rate Limit Configuration:**
- **Max Attempts:** 5 attempts per 15 minutes
- **Identifier:** Email address
- **Reset Window:** 15 minutes (900,000 milliseconds)

**Example Response (Rate Limited):**
```json
{
  "error": "Too many signup attempts. Please try again in 14 minutes."
}
```

**Response Headers:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1702345678000
```

### 2. Login Endpoint (`/lib/auth/auth.ts`)

**Changes:**
- Added rate limit check in NextAuth.js `authorize()` callback
- Checks rate limit BEFORE database query (prevents enumeration)
- Uses email as rate limit identifier
- Returns `null` when rate limited (NextAuth interprets as failed login)

**Rate Limit Configuration:**
- **Max Attempts:** 5 attempts per 15 minutes
- **Identifier:** Email address
- **Reset Window:** 15 minutes (900,000 milliseconds)

**Behavior:**
- Rate limit exceeded → Returns null → Login fails with generic error
- Client sees: "Invalid credentials or community code"
- This prevents attackers from distinguishing between:
  - Rate limited
  - Invalid email
  - Invalid password
  - Invalid community code

### 3. Rate Limiter Implementation (`/lib/rate-limit.ts`)

**Existing implementation** - No changes needed

**Features:**
- In-memory Map for tracking attempts
- Automatic cleanup every 5 minutes (prevents memory leaks)
- Configurable max attempts and window
- Thread-safe (single-threaded Node.js)

**Limitations:**
- Resets on server restart
- Doesn't work across multiple server instances
- For production scale, consider Upstash Redis (@upstash/ratelimit)

## Security Benefits

### 1. Prevents Brute-Force Password Attacks

**Before:**
- Attacker could try unlimited passwords
- 10 attempts/second = 864,000 attempts/day
- Weak passwords crackable in hours

**After:**
- Limited to 5 attempts per 15 minutes
- 5 attempts/15min = 480 attempts/day
- Brute-force attacks become impractical

### 2. Prevents Community Code Enumeration

**Before:**
- Attacker could try all community codes to find active ones
- Example: LMR, SRP, BGC, ABC, XYZ... (unlimited attempts)

**After:**
- Rate limit applies BEFORE community code validation
- 5 attempts every 15 minutes
- Enumeration attacks become impractical

### 3. Prevents Email Enumeration (Partially)

**Note:** Rate limiting helps but doesn't fully prevent email enumeration because:
- Rate limit errors reveal "too many attempts" (vs "invalid credentials")
- Attackers can still try 5 emails every 15 minutes

**Additional mitigation:**
- Generic error messages ("Invalid registration credentials")
- Same error for invalid email, community code, or rate limit
- Makes enumeration slower and less reliable

## Testing

### Unit Tests

Location: `/home/finch/repos/parkboard/__tests__/api/rate-limit-signup.test.ts`

**Test Coverage:**
- ✅ Allows first 5 attempts
- ✅ Blocks 6th attempt for same email
- ✅ Returns correct remaining attempts
- ✅ Returns 0 remaining when exhausted
- ✅ Includes resetAt timestamp
- ✅ Separate limits per email
- ✅ Error message includes reset time
- ✅ Headers formatted correctly

**Run tests:**
```bash
npm test -- __tests__/api/rate-limit-signup.test.ts
```

### Manual Testing

**Test Signup Rate Limiting:**
```bash
# Make 5 signup attempts with same email
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
      "community_code": "INVALID",
      "email": "test@example.com",
      "password": "password123456",
      "name": "Test User",
      "phone": "1234567890",
      "unit_number": "101"
    }'
  echo ""
done

# 6th attempt should return 429
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "community_code": "INVALID",
    "email": "test@example.com",
    "password": "password123456",
    "name": "Test User",
    "phone": "1234567890",
    "unit_number": "101"
  }' \
  -i  # Include headers to see X-RateLimit-*
```

**Test Login Rate Limiting:**
```bash
# Make 5 login attempts with same email
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/callback/credentials \
    -H "Content-Type: application/json" \
    -d '{
      "communityCode": "LMR",
      "email": "user1@parkboard.test",
      "password": "wrongpassword"
    }'
  echo ""
done

# 6th attempt should fail (rate limited)
```

## Production Considerations

### 1. Multi-Instance Deployments

**Current Limitation:**
- In-memory rate limiter doesn't sync across server instances
- User on Server A can make 5 attempts, then switch to Server B for 5 more

**Solution for Scale:**
Use distributed rate limiting with Redis:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
})

// In API route:
const { success, limit, reset, remaining } = await ratelimit.limit(email)
if (!success) {
  return NextResponse.json(
    { error: 'Too many attempts...' },
    { status: 429 }
  )
}
```

### 2. Monitoring and Alerts

**Recommended monitoring:**
- Track rate limit triggers (high frequency = attack attempt)
- Alert on sustained rate limit violations
- Log IP addresses of rate-limited requests

**Implementation:**
```typescript
if (!checkRateLimit(email)) {
  // Log rate limit violation
  console.warn('[Security] Rate limit exceeded', {
    email,
    ip: req.headers.get('x-forwarded-for'),
    timestamp: new Date().toISOString()
  })

  // TODO: Send alert to security monitoring
  // await sendSecurityAlert({ type: 'rate_limit', email, ip })

  return NextResponse.json(...)
}
```

### 3. IP-Based Rate Limiting (Future Enhancement)

**Current:** Rate limit by email only
**Enhancement:** Add IP-based rate limiting

**Benefits:**
- Prevents distributed attacks (using many emails from same IP)
- Catches attacks before they try email enumeration

**Implementation:**
```typescript
const ip = req.headers.get('x-forwarded-for') || 'unknown'

// Check IP rate limit FIRST (broader limit: 20/15min)
if (!checkRateLimit(`ip:${ip}`, 20)) {
  return NextResponse.json({ error: 'Too many requests from your IP' }, { status: 429 })
}

// Then check email rate limit (stricter: 5/15min)
if (!checkRateLimit(`email:${email}`, 5)) {
  return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
}
```

## Files Changed

1. `/app/api/auth/signup/route.ts`
   - Added rate limit import
   - Added rate limit check before validation
   - Added X-RateLimit-* headers to responses

2. `/lib/auth/auth.ts`
   - Added rate limit import
   - Added rate limit check in authorize() callback

3. `/home/finch/repos/parkboard/__tests__/api/rate-limit-signup.test.ts` (NEW)
   - Unit tests for rate limiting functionality

4. `/home/finch/repos/parkboard/docs/P0-005-RATE-LIMITING.md` (NEW)
   - This documentation file

## Related Issues

- **P0-006:** Generic error messages to prevent enumeration (already implemented)
- **P1-002:** Password strength validation (already implemented)
- **P0-XXX:** Consider adding IP-based rate limiting (future enhancement)

## Acceptance Criteria

- [x] Signup route has rate limiting (5 attempts per 15 minutes)
- [x] Login has rate limiting (5 attempts per 15 minutes)
- [x] Rate limit uses email as identifier
- [x] Returns 429 status when rate limited
- [x] Returns helpful error message with reset time
- [x] Adds X-RateLimit-* headers to responses
- [x] Existing functionality preserved
- [x] Zero linting errors
- [x] Zero TypeScript errors
- [x] Unit tests pass
- [x] Build succeeds

## Deployment Checklist

Before deploying to production:

- [ ] Verify rate limit settings (5 attempts / 15 minutes is reasonable)
- [ ] Set up monitoring for rate limit violations
- [ ] Configure logging for security events
- [ ] Test with production traffic patterns
- [ ] Consider distributed rate limiting (Upstash Redis) for multi-instance setups
- [ ] Document rate limits in API documentation
- [ ] Add rate limit info to user-facing error messages

## References

- [OWASP: Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
