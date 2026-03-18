# ParkBoard - SQL & API Testing Guide
**Date:** 2025-10-12
**Topics:** SQL Execution, API Testing, Testing Tools
**Status:** Comprehensive Guide

---

## Table of Contents
1. [SQL Execution Options](#sql-execution-options)
2. [API Testing: cURL vs. Better Tools](#api-testing-curl-vs-better-tools)
3. [Recommended Approach](#recommended-approach)
4. [Implementation Guide](#implementation-guide)

---

## SQL Execution Options

### Current Status

**What's Available:**
- ✅ `psql` (PostgreSQL CLI) is installed
- ✅ Supabase credentials in `.env.local`
- ❌ Direct PostgreSQL connection blocked (network/firewall)
- ✅ Supabase Dashboard SQL Editor available (manual)

### Option 1: Supabase Dashboard (CURRENT - Easiest)

**How it works:**
1. Go to: https://supabase.com/dashboard
2. Select project: `cgbkknefvggnhkvmuwsa`
3. Click: **SQL Editor**
4. Paste SQL and run

**Pros:**
- ✅ Always works (web-based)
- ✅ Visual query builder
- ✅ Can save queries
- ✅ Shows results in table format
- ✅ No CLI needed

**Cons:**
- ❌ Manual (not automated)
- ❌ Not scriptable
- ❌ Requires browser

**Status:** ✅ **Currently the best option for running SQL**

---

### Option 2: Supabase CLI (RECOMMENDED - Install Needed)

**Installation:**
```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

**Usage:**
```bash
# Login
supabase login

# Link to project
supabase link --project-ref cgbkknefvggnhkvmuwsa

# Run SQL file
supabase db execute --file db/schema_optimized.sql

# Run SQL query
supabase db execute "SELECT * FROM user_profiles LIMIT 5;"
```

**Pros:**
- ✅ Can run from CLI
- ✅ Scriptable
- ✅ Works with migrations
- ✅ No direct DB connection needed (uses Supabase API)

**Cons:**
- ❌ Requires installation
- ❌ Requires login/authentication

**Status:** ⏳ **Not installed, but highly recommended**

---

### Option 3: Direct psql Connection (NOT WORKING)

**Why it doesn't work:**
```bash
# This times out:
psql "postgresql://postgres.cgbkknefvggnhkvmuwsa:..."
```

**Reason:** Supabase blocks direct PostgreSQL connections from most IPs for security

**When it works:**
- If you enable "Connection Pooler" in Supabase
- If you whitelist your IP address
- If you use Supabase's Connection Pooler URL

**Status:** ❌ **Not recommended (blocked by default)**

---

### Option 4: Node.js Script (BEST for Automation)

**Create a script to run SQL:**

**File:** `scripts/run-sql.js`
```javascript
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

async function runSQL(sqlFile) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const sql = fs.readFileSync(sqlFile, 'utf-8')

  const { data, error } = await supabase.rpc('exec_sql', {
    query: sql
  })

  if (error) {
    console.error('SQL Error:', error)
    process.exit(1)
  }

  console.log('✅ SQL executed successfully')
  console.log(data)
}

// Usage: node scripts/run-sql.js db/schema.sql
runSQL(process.argv[2])
```

**Pros:**
- ✅ Fully automated
- ✅ Works from CI/CD
- ✅ Uses existing credentials
- ✅ Can be version controlled

**Cons:**
- ❌ Requires creating custom SQL function in Supabase
- ❌ Limited to what Supabase allows

**Status:** ⏳ **Can be implemented if needed**

---

## API Testing: cURL vs. Better Tools

### Your Current Approach: cURL

**Example from stress test script:**
```bash
curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"test123"}'
```

**Pros:**
- ✅ Available everywhere (no install)
- ✅ Simple for quick tests
- ✅ Works in shell scripts
- ✅ Good for CI/CD

**Cons:**
- ❌ Hard to read/maintain
- ❌ No built-in assertions
- ❌ Difficult to parse JSON responses
- ❌ No automatic retry/timeout handling
- ❌ Verbose syntax

**Verdict:** ⚠️ **OK for simple scripts, not ideal for comprehensive testing**

---

### Better Option 1: Supertest (RECOMMENDED)

**What it is:**
- Node.js library for testing HTTP APIs
- Built on top of `superagent`
- Designed specifically for testing Express/Next.js APIs

**Installation:**
```bash
npm install -D supertest
```

**Example Test:**
```javascript
// __tests__/api/auth/signup.test.ts
import request from 'supertest'

describe('POST /api/auth/signup', () => {
  it('creates a new user successfully', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/auth/signup')
      .send({
        email: 'newuser@test.com',
        password: 'test123456',
        name: 'Test User',
        phone: '+639171234567',
        unit_number: '10A'
      })
      .expect(200)
      .expect('Content-Type', /json/)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.user).toHaveProperty('email', 'newuser@test.com')
  })

  it('returns error for duplicate email', async () => {
    await request('http://localhost:3000')
      .post('/api/auth/signup')
      .send({ email: 'existing@test.com', /* ... */ })
      .expect(409)
      .expect((res) => {
        expect(res.body.error).toContain('already registered')
      })
  })
})
```

**Pros:**
- ✅ Clean, readable syntax
- ✅ Built-in assertions
- ✅ Integrates with Jest
- ✅ Automatic JSON parsing
- ✅ Follows testing best practices
- ✅ Can test without running server (mocks Next.js)

**Cons:**
- ❌ Requires installation
- ❌ Need to learn new syntax (but it's simple!)

**Verdict:** ✅ **Best for comprehensive API testing**

---

### Better Option 2: Axios (Good for Scripts)

**What it is:**
- Popular HTTP client for Node.js
- Better than cURL for scripting
- Not specifically for testing (but works well)

**Installation:**
```bash
npm install axios
```

**Example Script:**
```javascript
// scripts/test-signup.js
const axios = require('axios')

async function testSignup() {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/auth/signup',
      {
        email: 'test@test.com',
        password: 'test123',
        name: 'Test User',
        phone: '+639171234567',
        unit_number: '10A'
      }
    )

    console.log('✅ Signup successful:', response.data)
  } catch (error) {
    if (error.response) {
      console.error('❌ Signup failed:', error.response.data)
      console.error('Status:', error.response.status)
    } else {
      console.error('❌ Network error:', error.message)
    }
  }
}

testSignup()
```

**Pros:**
- ✅ Cleaner than cURL
- ✅ Easy to use
- ✅ Good error handling
- ✅ Automatic JSON parsing
- ✅ Works in scripts and tests

**Cons:**
- ❌ Not as testing-focused as Supertest
- ❌ Need to write your own assertions

**Verdict:** ✅ **Good for quick scripts, OK for testing**

---

### Better Option 3: Node.js Built-in Fetch (Simple)

**Available since Node.js 18:**
```javascript
// scripts/test-api.js
async function testSignup() {
  const response = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@test.com',
      password: 'test123',
      name: 'Test User',
      phone: '+639171234567',
      unit_number: '10A'
    })
  })

  const data = await response.json()

  if (response.ok) {
    console.log('✅ Success:', data)
  } else {
    console.error('❌ Error:', data.error)
  }
}

testSignup()
```

**Pros:**
- ✅ No installation needed (built-in)
- ✅ Modern API (Promise-based)
- ✅ Standard across browsers and Node.js

**Cons:**
- ❌ More verbose than axios
- ❌ Need to handle JSON manually

**Verdict:** ✅ **Good for simple scripts without dependencies**

---

## Comparison Table

| Tool | Use Case | Setup | Readability | Testing Features | Verdict |
|------|----------|-------|-------------|------------------|---------|
| **cURL** | Quick tests | None | ⭐⭐ | ⭐ | ⚠️ OK for simple |
| **Supertest** | Comprehensive API tests | npm install | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Best for tests |
| **Axios** | Scripts & simple tests | npm install | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Good middle ground |
| **Node fetch** | Simple scripts | None | ⭐⭐⭐ | ⭐⭐ | ✅ Good if no deps |

---

## Recommended Approach

### For ParkBoard, Use This Setup:

```
1. SQL Execution:
   ✅ Supabase Dashboard (manual queries)
   ⏳ Supabase CLI (install when needed)

2. API Testing:
   ✅ Supertest (for Jest test suite)
   ✅ cURL (keep for stress test script)

3. Automation:
   ✅ Node.js scripts with axios or fetch
```

---

## Implementation Guide

### Phase 1: Install Supertest (5 minutes)

```bash
# Install Supertest
npm install -D supertest @types/supertest

# Verify installation
npm list supertest
```

### Phase 2: Create API Test Suite (30 minutes)

**File:** `__tests__/api/auth/signup.test.ts`

```typescript
import request from 'supertest'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

describe('API: POST /api/auth/signup', () => {
  it('successfully creates a new user', async () => {
    const response = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: `test${Date.now()}@test.com`,  // Unique email
        password: 'test123456',
        name: 'Test User',
        phone: '+639171234567',
        unit_number: '10A'
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.user).toHaveProperty('email')
  })

  it('rejects duplicate email', async () => {
    const email = `duplicate${Date.now()}@test.com`

    // Create first user
    await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email,
        password: 'test123',
        name: 'First User',
        phone: '+639171234567',
        unit_number: '1A'
      })

    // Try to create duplicate
    const response = await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email,  // Same email
        password: 'test123',
        name: 'Second User',
        phone: '+639171234568',
        unit_number: '2B'
      })
      .expect(409)

    expect(response.body.error).toContain('already registered')
  })

  it('validates email format', async () => {
    await request(API_URL)
      .post('/api/auth/signup')
      .send({
        email: 'invalid-email',  // Bad format
        password: 'test123',
        name: 'Test',
        phone: '+639171234567',
        unit_number: '1A'
      })
      .expect(400)
  })
})
```

### Phase 3: Run API Tests

```bash
# Start dev server (Terminal 1)
npm run dev

# Run API tests (Terminal 2)
npm test -- signup.test

# Or run all API tests
npm test -- __tests__/api/
```

---

### Phase 4: Install Supabase CLI (Optional)

```bash
# Install globally
npm install -g supabase

# Verify
supabase --version

# Login
supabase login

# Link to project
supabase link --project-ref cgbkknefvggnhkvmuwsa

# Run SQL
supabase db execute "SELECT COUNT(*) FROM user_profiles;"
```

---

## Example: Converting cURL to Supertest

### Before (cURL in bash script):

```bash
#!/bin/bash
response=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')

if echo "$response" | grep -q "success"; then
  echo "✅ Success"
else
  echo "❌ Failed"
fi
```

### After (Supertest in Jest test):

```typescript
test('signup API works', async () => {
  const response = await request('http://localhost:3000')
    .post('/api/auth/signup')
    .send({
      email: 'test@test.com',
      password: 'test123',
      name: 'Test User',
      phone: '+639171234567',
      unit_number: '10A'
    })
    .expect(200)

  expect(response.body.success).toBe(true)
})
```

**Benefits:**
- ✅ More readable
- ✅ Better error messages
- ✅ Integrated with test suite
- ✅ Automatic retries/timeouts
- ✅ Clear assertions

---

## SQL Execution Workflows

### Workflow 1: Manual (Dashboard)

**When to use:** Quick queries, exploration, one-time changes

```
1. Open https://supabase.com/dashboard
2. Select project
3. Go to SQL Editor
4. Write/paste SQL
5. Click "Run"
6. See results
```

### Workflow 2: CLI (Supabase CLI)

**When to use:** Repeatable queries, migrations, automation

```bash
# One-time query
supabase db execute "SELECT * FROM user_profiles LIMIT 5;"

# Run SQL file
supabase db execute --file db/schema_optimized.sql

# Create migration
supabase migration new add_booking_status
# Edit migration file
supabase db push
```

### Workflow 3: Programmatic (Node.js)

**When to use:** Test setup, data seeding, CI/CD

```javascript
// scripts/seed-test-data.js
const { createClient } = require('@supabase/supabase-js')

async function seedData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Insert test data
  const { error } = await supabase
    .from('user_profiles')
    .insert([
      { email: 'test1@test.com', name: 'Test User 1' },
      { email: 'test2@test.com', name: 'Test User 2' }
    ])

  if (error) console.error('Error:', error)
  else console.log('✅ Data seeded')
}

seedData()
```

---

## API Testing Best Practices

### 1. Always Use Unique Emails
```typescript
// ❌ Bad: same email every time
email: 'test@test.com'

// ✅ Good: unique each run
email: `test${Date.now()}@test.com`
```

### 2. Test Both Success and Failure
```typescript
// Test happy path
expect(response.status).toBe(200)

// Test error cases
expect(response.status).toBe(400)
expect(response.body.error).toBeDefined()
```

### 3. Clean Up Test Data
```typescript
afterEach(async () => {
  // Delete test users
  await supabase
    .from('user_profiles')
    .delete()
    .like('email', '%@test.com')
})
```

### 4. Use Descriptive Test Names
```typescript
// ❌ Bad
it('test signup', () => {})

// ✅ Good
it('successfully creates user with valid data', () => {})
it('returns 409 error for duplicate email', () => {})
```

---

## Summary: What to Do Now

### Immediate (Can do now):
1. ✅ Use Supabase Dashboard for SQL
2. ✅ Keep using cURL in stress test script (it works)
3. ✅ Install Supertest: `npm install -D supertest @types/supertest`

### Next Steps (This week):
1. Create first Supertest API test
2. Run it against local dev server
3. See how much cleaner it is than cURL

### Optional (Future):
1. Install Supabase CLI for SQL automation
2. Convert stress test script to use Supertest
3. Add API tests to CI/CD pipeline

---

## Quick Reference

### SQL Execution Commands
```bash
# Dashboard (always works)
https://supabase.com/dashboard → SQL Editor

# Supabase CLI (if installed)
supabase db execute "SELECT * FROM user_profiles;"
supabase db execute --file db/schema.sql

# psql (blocked by default)
# Not recommended
```

### API Testing Commands
```bash
# cURL (current)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Supertest (recommended)
npm test -- signup.test
```

### Installation Commands
```bash
# Supertest (recommended)
npm install -D supertest @types/supertest

# Axios (if preferred)
npm install axios

# Supabase CLI (optional)
npm install -g supabase
```

---

## Your Questions Answered

### Q: Can Claude execute SQL directly?

**A:** Not directly to Supabase. Options:
- ✅ Yes, via `psql` (if network allows) - currently blocked
- ✅ Yes, via Supabase CLI (if installed) - not installed yet
- ✅ Yes, via Node.js scripts - can be created
- ✅ **Best now:** Use Supabase Dashboard (manual)

### Q: Is cURL optimal for API testing?

**A:** No, but it's OK for simple scripts.

**Better options:**
- ✅ **Supertest** for comprehensive testing
- ✅ **Axios** for scripting
- ✅ **Node fetch** for simple scripts

**Verdict:** Keep cURL in stress test script, but use Supertest for proper API tests

### Q: Was this addressed before?

**A:** Partially:
- ✅ We created cURL-based stress test script
- ✅ We created E2E tests (which test APIs indirectly)
- ❌ We didn't specifically address:
  - SQL execution options
  - API testing best practices
  - Supertest vs cURL comparison

**This document fills that gap!**

---

**Last Updated:** 2025-10-12
**Status:** ✅ **Complete Guide**
**Next Action:** Install Supertest and try first API test
