Got it. Here’s a clean **migration plan** for when you’re ready to swap from **fake UUIDs** → **real `auth.users`**:

---

## Migration Plan: Fake UUIDs → Real Supabase Auth

### Step 1. Prep Real Users

* Create your test accounts in Supabase Dashboard (Auth → Users).
  Example:

  * Alice Resident → `alice@example.com`
  * Bob Resident → `bob@example.com`
  * Carol Admin → `carol@example.com`

These will generate real `auth.users.id` values.

---

### Step 2. Backup Current Data

```sql
-- Optional: keep a snapshot
CREATE TABLE user_profiles_backup AS
SELECT * FROM user_profiles;
```

---

### Step 3. Add Real FK to `auth.users`

```sql
-- Add a new column for real auth link
ALTER TABLE user_profiles
ADD COLUMN auth_id uuid REFERENCES auth.users (id);

-- Keep old fake UUIDs temporarily to avoid breaking joins
```

---

### Step 4. Map Existing Profiles → Auth Users

* Manually or via SQL update, map emails:

```sql
UPDATE user_profiles p
SET auth_id = a.id
FROM auth.users a
WHERE p.email = a.email;
```

---

### Step 5. Flip the Primary Key

* Once all `auth_id` values are filled:

```sql
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_pkey;
ALTER TABLE user_profiles
    ADD PRIMARY KEY (auth_id);
```

* Drop the old `id` column (or keep temporarily if you want a grace period).

---

### Step 6. Update Dependencies

* Update foreign keys in `bookings.user_id` to point to `user_profiles.auth_id` instead of the old fake IDs.
* Example:

```sql
ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_fkey;
ALTER TABLE bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles (auth_id);
```

---

### Step 7. Reinstate RLS

* Enable RLS:

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

* Write policies like:

```sql
-- Residents can only see their own profile
CREATE POLICY "Residents can view self"
ON user_profiles
FOR SELECT
USING (auth.uid() = auth_id);

-- Residents can only manage their own bookings
CREATE POLICY "Residents manage own bookings"
ON bookings
FOR ALL
USING (auth.uid() = user_id);
```

---

### Step 8. Clean Up

* Drop `user_profiles.id` (the fake UUIDs).
* Drop `user_profiles_backup` if no longer needed.
* From this point on, all seeding must go through Supabase Auth API or Dashboard.

---

✅ That’s the bridge. You can stay on **Option A (fake UUIDs)** while finishing core UI + API testing, and only run this migration when you’re ready to enforce real auth.

---

Would you like me to also prep a **drop-in modified version of `wipe_and_seed_testing.sql`** that’s “auth-ready” but still runs with fake UUIDs until you flip the switch? That way you won’t maintain two diverging seed scripts.
