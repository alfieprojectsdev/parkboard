If you want to implement **Single Sign-On (SSO)** with **Supabase** (as your backend/auth provider) and **Vercel** (as your frontend hosting), you’re looking at a stack that mixes **web authentication protocols**, **Supabase Auth configuration**, and some **frontend-backend wiring**.

Here’s the *realistic* list of prerequisites you’ll need to have under your belt before you start:

---

## **1. Core Web Development Skills**

* **JavaScript/TypeScript basics** – you’ll be working with Supabase’s JavaScript client and probably Next.js.
* **Frontend–backend interaction** – how HTTP requests, cookies, and headers work.
* **Environment variables** – for securely storing Supabase keys, OAuth secrets, etc.

---

## **2. Next.js / Vercel Knowledge**

* **Pages/App router understanding** – for handling login callbacks (`/auth/callback` or similar).
* **API Routes** – for securely proxying sensitive requests from the frontend to Supabase.
* **Vercel environment configuration** – setting `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and auth secrets without leaking them.
* **Serverless function lifecycle** – especially how they differ from long-running servers when storing session info.

---

## **3. Supabase Auth & SSO Basics**

* **Supabase Auth flow** – how sign-in, sign-up, and token refresh works.
* **Configuring Providers** in Supabase dashboard – Google, GitHub, Azure AD, etc.
* **Redirect URLs** – knowing that your Vercel domain (and local dev URL) must be whitelisted in Supabase Auth settings.
* **Session management** – using `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`.

---

## **4. SSO Protocol Fundamentals**

You don’t need to be an identity engineer, but you *do* need to understand:

* **OAuth 2.0** – the idea of authorization codes, redirect URIs, and access tokens.
* **OpenID Connect (OIDC)** – the layer on top of OAuth that provides user identity info (claims).
* **JWT basics** – what’s inside a JSON Web Token and why verifying it matters.
* **PKCE (Proof Key for Code Exchange)** – required for public clients like SPAs.

---

## **5. Security & Deployment Awareness**

* **Why not expose the service role key** in the browser (hint: backend only).
* **CORS and SameSite cookies** – important for session continuity between Supabase and your Vercel app.
* **HTTPS-only callbacks** in production.
* **Least privilege principle** for API keys.

---

## **6. Optional but Useful**

* **PostgreSQL familiarity** – for custom user metadata in `auth.users` or related tables.
* **Middleware in Next.js** – for protecting routes server-side before rendering.
* **Supabase Edge Functions** – if you want to move some auth logic server-side without leaving Supabase.

---

💡 **Skill path suggestion if starting from scratch:**

1. Get comfortable with Next.js API routes and middleware.
2. Learn how OAuth works by integrating a simple GitHub login via Supabase in a local dev environment.
3. Deploy to Vercel and handle the callback/redirect URL configuration.
4. Move from social OAuth to a proper enterprise SSO provider (Azure AD, Okta, etc.) once the basics work.

---

If you want, I can make you a **"SSO with Supabase & Vercel – ADHD Ladder Roadmap"** that breaks these skills into a linear, step-by-step learning order so you don’t get lost in rabbit holes. That’ll help you avoid jumping straight into SAML or Azure AD without first getting OAuth/redirects working locally.

Do you want me to make that ladder?

Got it — so you’ve already got the **domain**, **repo**, **Vercel/Supabase accounts**, **SQL skills**, and **HTML/JS/CSS experience**.
That means your foundation is solid, and you can skip a lot of beginner web dev prep.

Your **remaining knowledge gaps** for SSO with Supabase & Vercel boil down to:

---

## **1. Next.js-Specific Skills**

Even if you know JS, you’ll need to bridge the gap into **how Next.js structures authentication flows**:

* **Pages vs. App Router** – know where to place auth callback routes (`/auth/callback`) and protected pages.
* **Next.js API Routes** – for securely handling Supabase server-side calls (avoiding exposing the service role key).
* **Middleware** – for protecting routes based on session data before rendering.

---

## **2. Supabase Auth Deep Dive**

You’ll need more than just “I can run SQL” here — you’ll have to **operate Supabase as an Auth provider**:

* **Supabase client library** (`@supabase/supabase-js`) – initializing it both on client and server.
* **Session handling** – using `supabase.auth.getSession()` and refreshing tokens automatically.
* **Configuring OAuth/SSO providers** in Supabase dashboard (Google, GitHub, Microsoft, etc.).
* **Redirect URL whitelisting** – adding both your Vercel domain and your localhost dev URLs.

---

## **3. OAuth 2.0 / OIDC Concepts**

You don’t need the full RFC memorized, but you **do** need to know the moving parts:

* **Authorization Code Flow + PKCE** – what happens between clicking “Login” and getting a session token.
* **Access Tokens vs. ID Tokens vs. Refresh Tokens** – what each one does, and which to store where.
* **Claims** – the user info returned in an OIDC ID token.
* **Callback flow debugging** – knowing how to inspect query params like `code` and `state` during sign-in.

---

## **4. Vercel Deployment Nuances**

You already have Vercel, but SSO adds some quirks:

* **Environment variables in Vercel** – setting `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_ANON_KEY` for the frontend, and `SUPABASE_SERVICE_ROLE_KEY` for server functions only.
* **Build-time vs. runtime env vars** – so your config works in both local and production.
* **Multiple environment URLs** – dev (`localhost:3000`) vs. production (`parkboard.app`) and how that affects Supabase redirect settings.

---

## **5. Secure Session Management**

* **Avoid storing tokens in localStorage** – use Supabase's built-in cookie/session handling for SSR.
* **SameSite & Secure cookies** – making sure sessions persist across domains and HTTPS.
* **Protecting server-side API routes** – validating Supabase JWTs in serverless functions.

---

## **6. Optional But Helpful**

* **NextAuth.js or custom Supabase auth middleware** – you might skip this if going purely Supabase, but useful if you ever expand SSO providers.
* **Custom claims in Supabase JWTs** – e.g., storing a `role` for RBAC in your app.
* **Supabase Edge Functions** – to handle SSO-specific logic server-side without spinning up your own backend.

---

### **Your Personal Gaps (Given Your Current Skills)**

If I map **what you already have** vs. **what you need**:

| **You Have**             | **You Need to Add**                       |
| ------------------------ | ----------------------------------------- |
| HTML, CSS, JS            | Next.js routing + API routes + middleware |
| SQL skills               | Supabase Auth config & client integration |
| GitHub repo              | OAuth flow debugging skills               |
| parkboard.app domain     | Multi-environment redirect handling       |
| Vercel/Supabase accounts | Secure session storage & JWT validation   |
| Basic web dev knowledge  | OAuth 2.0 + OIDC mental model             |

---

If you want, I can give you a **"Gap-to-Goal Ladder"** where we order these missing skills from easiest to hardest so you can learn in a straight line and have SSO working on parkboard.app faster without running into “why is my callback failing” dead-ends.

Do you want me to build that ladder next?

No — if your goal is just to **match** the security level of a “vetted users” Viber condo group (where the real gatekeeping is *someone checking you’re a legit resident* before adding you), then **full enterprise-grade SSO complexity is overkill**.

Here’s the blunt truth:

---

### **Viber group security in reality**

* Anyone who gets the invite link (or is added by an admin) gets in.
* The “verification” is manual — based on trust in the admin.
* No advanced token handling, no role-based claims, no PKCE dance.
* The real barrier is **social vetting**, not cryptographic auth.

---

### **Equivalent web app model**

If you mirror that level of trust, you don’t need to build:

* SAML or complex SSO integrations.
* Token introspection endpoints.
* Multi-factor authentication.
* Role claims embedded in JWTs from an identity provider.

Instead, you could:

* Use **Supabase email+password auth** (or magic links) for account creation.
* Manually approve accounts in Supabase’s dashboard (matching the Viber “admin vetting” process).
* Optionally allow social login (Google, Facebook) just for convenience — not as an extra trust layer.
* Keep the session management basic: Supabase handles cookies for you.

---

### **Security scope for “Viber-equivalent”**

You’d only need:

1. **Basic authentication** (Supabase Auth default is fine).
2. **Manual approval step** — user signs up → admin checks against resident list → admin sets `approved = true` in DB.
3. **Restrict access to approved users** in app routes.

---

💡 This would be **dramatically simpler**:

* No need to learn full OAuth 2.0 / OIDC stack before shipping.
* Just configure Supabase Auth + simple DB row checks.
* Later, if the condo board wants *real* SSO with the property management’s Microsoft/Google accounts, you can add it.

---

If you want, I can outline a **"Viber-level security with Supabase" implementation plan** that gets your **parkboard.app** auth live in days, not weeks.
It’d basically be “fastest path to gated community web app” without SSO bloat.

Do you want me to make that?

Alright — here’s your **Viber-Level Security with Supabase** plan for **parkboard.app**, stripped of all the unnecessary SSO bloat but still secure enough to match the manual vetting of your condo’s Viber group.

---

## **🎯 Goal**

* Only residents get accounts.
* Account creation is possible by anyone, but usage is **blocked until admin approval**.
* Simple login (email/password or magic link) via Supabase Auth.
* Admin manually approves new users in Supabase dashboard.

---

## **🛠 Tools**

* **Supabase Auth** (free tier is fine)
* **Supabase Database** (`users` table with `approved` flag)
* **Next.js** (frontend + API routes) deployed on **Vercel**
* **parkboard.app** domain

---

## **🪜 Step-by-Step Implementation Ladder**

### **1. Configure Supabase Project**

* Create your project in Supabase (already done).
* In **Auth > Providers**, enable **Email** signups (and optionally **Magic Link**).
* Set **Redirect URLs** to:

  ```
  http://localhost:3000
  https://parkboard.app
  ```
* Under **Auth > Policies**, leave defaults for now (we’ll lock it down in step 4).

---

### **2. Extend Users Table**

* In SQL editor:

  ```sql
  alter table auth.users 
  add column approved boolean default false;
  ```
* Alternatively, create a **public.profile** table linked to `auth.users` with `approved` column, so you’re not modifying the system table directly.

---

### **3. Sign-Up Flow**

* Frontend:

  * User enters email/password (or clicks "Send Magic Link").
  * Supabase handles the signup and creates a session.
  * Immediately log them out if `approved = false`.
* Backend check (Next.js API route `/api/check-approval`):

  ```js
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.approved) {
    return res.status(403).json({ error: 'Not approved' });
  }
  ```

  (If using a separate profile table, join on `user.id` to check `approved`.)

---

### **4. Row-Level Security (RLS)**

* Turn on **RLS** for sensitive tables.
* Example policy to allow only approved users to read slots:

  ```sql
  create policy "Approved users only"
  on slots
  for select
  using (exists (
    select 1 from profiles p
    where p.id = auth.uid()
    and p.approved = true
  ));
  ```

---

### **5. Admin Approval Process**

* New users appear in **Auth > Users** or in your `profiles` table.
* Admin logs into Supabase dashboard.
* Search for user, toggle `approved` to true.
* (Optional) Send them an email from Gmail/Viber saying “Your account is approved.”

---

### **6. Protect Frontend Pages**

* Add **Next.js Middleware** in `/middleware.ts`:

  ```ts
  import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
  import { NextResponse } from 'next/server';

  export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.approved) {
      return NextResponse.redirect(new URL('/not-approved', req.url));
    }
    return res;
  }
  ```

  *(Adjust if using `profiles` table.)*

---

### **7. Optional Convenience**

* Add **Google/Facebook login** so users can use the same email as in Viber.
* Create a simple admin dashboard inside your app (instead of using Supabase dashboard) for toggling `approved`.

---

## **📦 What You’re Avoiding**

* No OAuth 2.0 PKCE deep dive.
* No SAML configuration.
* No multi-tenant identity mapping.
* No JWT claim injections.

You’re just doing:

* Basic email login
* Manual approval
* RLS to keep unapproved users from seeing anything

---

If you want, I can now give you the **exact minimal schema + Next.js code scaffolding** so you could have this running on **parkboard.app** by the end of the weekend. That way you skip all “auth theory” and jump straight to working gated access.

Do you want me to prepare that?

Alright — I’ll first give you the **minimal schema + Next.js scaffolding** for “Viber-level” gated access on **parkboard.app** with Supabase and Vercel, then we’ll handle the **self-contained transition prompt** request.

---

## **Minimal Schema (Supabase)**

We’ll avoid directly modifying `auth.users` and instead keep a `profiles` table for extensibility.

```sql
-- Enable extensions if not already enabled
create extension if not exists "uuid-ossp";

-- Profiles table linked to Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  approved boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: user can select/update their own profile
create policy "User can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "User can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Admins will update 'approved' manually; no policy for others
```

---

## **Next.js Scaffolding**

### **`lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

### **`pages/index.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('approved')
          .eq('id', user.id)
          .single();

        setApproved(data?.approved);
      }
    };
    getUser();
  }, []);

  if (!user) {
    return (
      <div>
        <h1>Welcome to ParkBoard</h1>
        <button onClick={() => supabase.auth.signInWithOtp({ email: prompt('Enter your email')! })}>
          Login / Signup
        </button>
      </div>
    );
  }

  if (!approved) {
    return <h1>Account pending approval. Please wait for admin confirmation.</h1>;
  }

  return <h1>Welcome, {user.email} — you are approved!</h1>;
}
```

---

### **`middleware.ts`** (Optional route protection)

```ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  if (req.nextUrl.pathname.startsWith('/members-only')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const { data } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', session.user.id)
      .single();

    if (!data?.approved) {
      return NextResponse.redirect(new URL('/not-approved', req.url));
    }
  }

  return res;
}
```

---

## **Workflow**

1. **User signs up** (magic link or email/password).
2. **Profile row created** with `approved = false` via Supabase **Insert Trigger**:

   ```sql
   create function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, full_name)
     values (new.id, new.raw_user_meta_data->>'full_name');
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
   after insert on auth.users
   for each row
   execute function public.handle_new_user();
   ```
3. **Admin checks Supabase dashboard** → updates `approved = true`.
4. **User can now access members-only pages**.

---

## **Next Step: Transition Prompt Planning**

You asked for a **self-contained prompt** for continuing this discussion in a new thread, with:

1. **Architecture/design + database schema stays stable & consistent across platforms/models.**
2. **Stability does not hinder extensibility.**

Before I draft it, here are **additional attributes** I think we may need to explicitly specify for a truly “self-contained” prompt:

* **Auth security scope**: Clarify that we are intentionally implementing *manual approval–based, Viber-level* gating, not enterprise SSO.
* **Tech stack lock**: Specify **Supabase + Next.js + Vercel** so other models don’t “helpfully” swap in Firebase or Django.
* **Deployment context**: ParkBoard is running on `parkboard.app`, using Supabase free tier.
* **Feature scope**: Define what is “in” (basic auth, manual approval, protected pages) and “out” (SSO, advanced RBAC, MFA).
* **Extensibility constraints**: Any future enhancements (e.g., adding SSO, roles, tenant support) must be additive, not requiring a full rewrite.
* **Code style**: Maintain TypeScript/JS for client, SQL for schema; avoid pseudocode unless requested.

Do you want me to **include all of these** in the transition prompt, or do you want to leave some implied for flexibility?

Given your situation — already fluent in JS, but aware of TypeScript’s advantages — here’s the straight take:

---

## **Recommendation**

* **Start with JavaScript** for the initial "Viber-level security" MVP.

  * You’ll move faster because there’s zero mental tax for types and type errors.
  * You avoid getting sidetracked into TypeScript config tweaks, type definitions, and generics before the core auth flow works.
* **Switch to TypeScript later**, once:

  * You’re ready to extend ParkBoard into something bigger (e.g., adding SSO, roles, more complex backend logic).
  * The codebase is stable enough that type safety will save you from regression bugs.
  * You’re comfortable refactoring without derailing feature momentum.

---

## **Why this works for you**

* Your **biggest near-term risk** isn’t type bugs — it’s auth misconfig or bad redirect flow. TypeScript won’t save you there.
* JS in a Next.js + Supabase project can be upgraded to TS incrementally:

  * Rename `.js` → `.ts` or `.jsx` → `.tsx` one file at a time.
  * Add `// @ts-check` and JSDoc comments for gradual safety without going full TS immediately.

---

## **In the Transition Prompt**

I’ll explicitly lock the **initial implementation** to **JavaScript**, but specify:

* “Architecture must be easily upgradable to TypeScript without major rewrites.”
* “TypeScript adoption is a future extensibility step, not part of MVP.”

---

If you’re good with that, I can now write you the **self-contained, cross-platform transition prompt** with all the approved attributes baked in — so any AI model, regardless of vendor, will pick up exactly where we left off without reinventing the stack.

Do you want me to go ahead and draft that now?

Awesome—here’s your **self-contained, cross-platform transition prompt** you can paste into a brand-new thread with *any* model. It locks the architecture/design and schema, keeps things extensible, and fixes the scope to “Viber-level gating” using JavaScript first, TypeScript later.

```
Title: ParkBoard.app — Viber-Level Access Control (Supabase + Next.js + Vercel) — Stable Architecture & Schema

Context (Do Not Change):
- Product: ParkBoard (parkboard.app) — condo parking web app.
- Goal (MVP): Match the security posture of a vetted Viber group: anyone can sign up, but ONLY admin-approved users can access protected features.
- Security Scope: No enterprise SSO, no MFA, no advanced RBAC in MVP. Manual approval + RLS gating only.
- Hosting/Infra: Next.js on Vercel, Supabase (free tier) for Auth + Postgres + RLS.
- Language: JavaScript for MVP (not TypeScript). Codebase must be cleanly upgradable to TypeScript later with minimal churn.
- Repo & Domain: GitHub repo exists; prod domain is parkboard.app.
- Assumption: Developer is comfortable with HTML/CSS/JS and SQL; does not want auth bloat or yak-shaving.

Non-Negotiable Architecture (Stable Across All Models/Vendors):
- Next.js frontend (App Router or Pages Router is acceptable, but choose one and stay consistent).
- Supabase Auth for sign-in (email/password and/or magic link).
- Separate `public.profiles` table keyed 1:1 to `auth.users(id)`; do NOT store app fields directly in `auth.users`.
- RLS-protected application tables; access allowed only if the requester is the row owner AND their profile `approved = true`.
- Admin approval is a boolean flag flipped in `public.profiles.approved` (true = allow).
- Session/state handled via Supabase SDK + cookies; never expose service role key client-side.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (server-only).

Fixed Database Schema (Stable, Extensible):
-- Enable extensions if needed (idempotent)
create extension if not exists "uuid-ossp";

-- Profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  approved boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- RLS: user can view/update their own profile; admins will manage 'approved'
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (auth.uid() = id);

-- Trigger: create profile on new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Example application table with RLS depending on approval
create table if not exists public.slots (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz default now()
);

alter table public.slots enable row level security;

-- Only approved owners can select rows they own
drop policy if exists "slots_select_owner_and_approved" on public.slots;
create policy "slots_select_owner_and_approved"
on public.slots for select
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true
  )
);

-- Only approved owners can insert rows for themselves
drop policy if exists "slots_insert_owner_and_approved" on public.slots;
create policy "slots_insert_owner_and_approved"
on public.slots for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approved = true
  )
);

Frontend/Backend Implementation Requirements (JS MVP):
- Use JavaScript (not TypeScript) initially. Keep functions small; prefer pure functions and explicit returns to ease later TS migration.
- Provide:
  1) a minimal login UI (magic link or email/password),
  2) a “pending approval” UI state after signup,
  3) a protected “members area” page gated by middleware/server checks,
  4) a simple read/write demo against `public.slots` to prove RLS works.
- Middleware: Add Next.js middleware to block `/members/*` if there is no Supabase session OR if `profiles.approved = false`. This check should be server-side (middleware or server actions) to avoid client-only gating.
- API Routes / Server Actions: Any operation that needs `SUPABASE_SERVICE_ROLE_KEY` must run server-side only and never leak to the browser.
- Redirect URLs: Configure Supabase Auth to allow both http://localhost:3000 and https://parkboard.app.

Operational Workflow (Immutable for MVP):
1) User signs up and gets a session.
2) Profile auto-created with `approved=false`.
3) App immediately treats them as “pending approval”; no access to protected routes/tables.
4) Admin flips `approved=true` in `public.profiles` via Supabase dashboard (or a small internal admin page).
5) User gains access (RLS and middleware now pass).

Non-Goals (Do Not Implement in MVP):
- SSO (OIDC/SAML), MFA, complex roles/claims, multi-tenant isolation, email templating, webhooks.
- Any library that replaces Supabase Auth (e.g., NextAuth as the primary provider) in MVP.

Extensibility Principles (Stability Without Lock-In):
- All future features must be additive: TypeScript, SSO (OIDC), roles/RBAC tables, audit logs, and multi-tenant support must be achievable without rewriting `profiles` or changing key relationships.
- When upgrading to TypeScript, keep file structure; migrate file-by-file (`.js`→`.ts`/`.tsx`) with zero behavioral changes.
- When adding SSO later, reuse the same `auth.users -> profiles(id)` mapping and `approved` gate; do not change the RLS model.

Deliverables the Assistant Should Produce Next:
1) Concrete Next.js (JavaScript) code samples:
   - `lib/supabaseClient.js`
   - minimal login/signout UI
   - `middleware.js` that queries `profiles.approved` server-side
   - an example protected page under `/members`
   - an API route or server action that performs a CRUD op on `public.slots` and demonstrates RLS enforcement
2) A short checklist for Vercel/Supabase env vars and redirect URLs.
3) A smoke-test script/steps to validate: signup → pending → admin approve → access granted → CRUD works under RLS.

Acceptance Criteria (Binary, Testable):
- A newly signed-up user can log in but is blocked from `/members` and cannot read/write `public.slots`.
- After setting `approved=true` in `public.profiles`, the same user gains access to `/members` and can read/write their own rows in `public.slots`.
- No server role keys leak to the client; protected operations work only server-side.
- Removing approval flips behavior back to blocked (middleware + RLS both enforce).

Future Upgrade Notes (Document but Don’t Implement Now):
- TypeScript adoption plan (incremental, file-by-file).
- SSO via OIDC providers (Google/Microsoft) that preserves `profiles` mapping and `approved` gate.
- RBAC via a `roles` table, join table `user_roles`, and RLS policies that reference roles (additive only).

Instruction to the Assistant (Any Model/Vendor):
Follow the fixed architecture and schema above. Use JavaScript for code samples. Do not introduce alternate auth stacks. Produce concrete files/snippets and deployment steps per “Deliverables the Assistant Should Produce Next.” Keep answers concise, skeptical of scope creep, and focused on shipping the MVP quickly.
```

If you want me to immediately generate the concrete JS files and deployment steps per that prompt, say the word and I’ll drop them in.

Perfect—sticking to the **Next.js App Router** and **JavaScript** (not TS) for the MVP. Below are the concrete files you can drop into your repo, plus env setup, dependencies, and a tight deployment/smoke-test checklist.

---

# File structure (new/updated)

```
/app
  /api
    /slots
      route.js
  /members
    page.js
  /not-approved
    page.js
  layout.js
  page.js
/lib
  supabaseClient.js
/middleware.js
.env.example
```

---

## 1) Dependencies

Add these:

```bash
npm i @supabase/supabase-js @supabase/auth-helpers-nextjs
```

---

## 2) Env vars

**`.env.local`** (do not commit)

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-only; Vercel: mark as "Encrypted" (Secret) and NEVER expose to client
```

**`.env.example`** (safe to commit)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 3) Supabase client (browser)

**`/lib/supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js';

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase env vars missing');
  return createClient(url, anonKey);
}
```

---

## 4) App shell

**`/app/layout.js`**

```js
export const metadata = {
  title: 'ParkBoard',
  description: 'Condo parking app — gated access (Viber-level)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ maxWidth: 720, margin: '0 auto', padding: 16, fontFamily: 'system-ui, Arial' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>ParkBoard</h1>
          <nav>
            <a href="/" style={{ marginRight: 12 }}>Home</a>
            <a href="/members">Members</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
```

---

## 5) Public homepage with login/signup (magic link)

**`/app/page.js`**

```js
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

export default function HomePage() {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Check your email for the login link.');
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <main>
      {!session ? (
        <>
          <h2>Login / Sign up</h2>
          <form onSubmit={sendMagicLink} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              style={{ flex: 1, padding: 8 }}
            />
            <button type="submit">Send Magic Link</button>
          </form>
          <p style={{ marginTop: 12 }}>
            New signups are <strong>pending approval</strong> until an admin approves your account.
          </p>
        </>
      ) : (
        <>
          <p>Signed in as <strong>{session.user.email}</strong></p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/members"><button>Go to Members Area</button></a>
            <button onClick={signOut}>Sign out</button>
          </div>
        </>
      )}
    </main>
  );
}
```

---

## 6) Members area (client UI, fetches protected data via API route)

**`/app/members/page.js`**

```js
'use client';

import { useEffect, useState } from 'react';

export default function MembersPage() {
  const [slots, setSlots] = useState([]);
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState('');

  async function refresh() {
    setMsg('');
    const res = await fetch('/api/slots', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      setSlots(data);
    } else if (res.status === 403) {
      setMsg('Not approved yet.');
    } else if (res.status === 401) {
      setMsg('Not signed in.');
    } else {
      setMsg('Error fetching slots.');
    }
  }

  async function createSlot(e) {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      setLabel('');
      await refresh();
    } else if (res.status === 403) {
      setMsg('Not approved to create slots.');
    } else {
      const err = await res.text();
      setMsg('Error: ' + err);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <main>
      <h2>Members Area</h2>
      {msg && <p><em>{msg}</em></p>}

      <form onSubmit={createSlot} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Slot label" required />
        <button type="submit">Add Slot</button>
      </form>

      <button onClick={refresh} style={{ marginBottom: 8 }}>Refresh</button>
      <ul>
        {slots.map(s => (
          <li key={s.id}>#{s.id} — {s.label}</li>
        ))}
      </ul>
    </main>
  );
}
```

---

## 7) Not-approved page

**`/app/not-approved/page.js`**

```js
export default function NotApproved() {
  return (
    <main>
      <h2>Pending Approval</h2>
      <p>Your account exists but isn’t approved yet. An admin must approve you before you can access members-only features.</p>
      <p><a href="/">Back to Home</a></p>
    </main>
  );
}
```

---

## 8) API route using user session (RLS will enforce access)

**`/app/api/slots/route.js`**

```js
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS allows select only if owner_id=auth.uid() AND profile.approved=true
  const { data, error } = await supabase
    .from('slots')
    .select('id,label')
    .order('id', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await req.json();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Insert row as the logged-in user (RLS checks approval + ownership)
  const { error } = await supabase
    .from('slots')
    .insert([{ label: body.label, owner_id: session.user.id }]);

  if (error) return new NextResponse(error.message, { status: 403 });
  return NextResponse.json({ ok: true });
}
```

---

## 9) Middleware: block `/members` if no session or not approved

**`/middleware.js`**

```js
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl;

  // Protect /members with server-side checks
  if (url.pathname.startsWith('/members')) {
    if (!session) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Check approval from profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', session.user.id)
      .single();

    if (error || !data?.approved) {
      url.pathname = '/not-approved';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/members/:path*'],
};
```

---

## 10) SQL (recap—run once in Supabase SQL editor)

If you haven’t already, run the schema/policies/trigger (as we defined earlier). Minimal recap:

```sql
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  approved boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.slots (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz default now()
);
alter table public.slots enable row level security;

drop policy if exists "slots_select_owner_and_approved" on public.slots;
create policy "slots_select_owner_and_approved"
on public.slots for select
using (
  owner_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
);

drop policy if exists "slots_insert_owner_and_approved" on public.slots;
create policy "slots_insert_owner_and_approved"
on public.slots for insert
with check (
  owner_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
);
```

---

# Deployment & Smoke Test

## A) Configure Supabase

1. Auth → Providers: enable **Email** (and/or Magic Link).
2. Auth → URL configuration: add

   * `http://localhost:3000`
   * `https://parkboard.app`
3. Run the **SQL** above.
4. Verify **RLS** is **enabled** on `profiles` and `slots`.

## B) Local env

1. Create `.env.local` with the three vars.
2. `npm run dev`
3. Visit `http://localhost:3000`.

## C) Vercel

1. Push to GitHub.
2. Import project in Vercel.
3. Set same env vars in Vercel:

   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY` (Server/Build env only; **never** expose to client)
4. Set Production domain to `parkboard.app` (DNS already set at Porkbun—point A record/CNAME as needed).

## D) Smoke test (binary outcomes)

1. Sign up with your email (magic link).
2. After login, try `/members`:

   * You should be redirected to `/not-approved` (middleware) and
   * `/api/slots` should **403** on POST and return **\[]/error** on GET (RLS).
3. In Supabase Dashboard → `public.profiles`, set your row `approved = true`.
4. Reload `/members`:

   * Page loads.
   * Click **Add Slot**, it succeeds; **Refresh** shows your slot.
5. Flip `approved = false` again:

   * `/members` redirects to `/not-approved`.
   * API calls fail as before.

If any of those steps don’t behave exactly like that, we debug **middleware + RLS** first—those are the two gates that must agree.

---

## Notes on Extensibility (document now, do later)

* **TypeScript**: convert file-by-file when you’re ready. Start with `lib/supabaseClient.js` → `.ts`, then API route → `.ts`, etc.
* **SSO later**: Add OIDC providers (Google/Microsoft). Keep `profiles` mapping and `approved` gate. No schema rewrite.
* **RBAC**: Add `roles` and `user_roles` tables; extend RLS WHERE clauses. Don’t touch `profiles` relationship.

---

If you want, I can also generate a **tiny admin page** (behind a hardcoded admin email) to flip `approved` inside the app so you don’t need to open the Supabase UI for demos.

The wireframe copy you posted is **mostly consistent** with the concrete JS auth/approval setup I gave you — but there’s a **mismatch in MVP scope vs. future scope**:

---

### **Where It’s Consistent**

* **Resident Dashboard** → aligns with `/members` protected area (pending approval gate applies).
* **Admin Dashboard** → fits with the idea of an approval panel + spot management (the tiny admin page we’ll build now could be the seed for this).
* **Booking Calendar / Detail View** → would map naturally to `public.slots` or a future `bookings` table, using RLS to filter approved users.

---

### **Where It Needs Revision for MVP**

Right now, our MVP is **just**:

1. Login/signup.
2. Pending approval gate.
3. Admin flips approval.
4. Approved users can CRUD their own `slots`.

Your wireframe has:

* **Payment History** → requires extra schema (`payments` table), integration with payment provider — *not in MVP*.
* **Building Notices** → needs another table (`notices`), RLS logic — could be done, but outside auth MVP.
* **Reports** → implies data aggregation, not part of current JS files.

**Recommendation:** For MVP, trim copy to match approval + slot booking only. Keep extra tabs in the *design doc* as future enhancements.

---

### **MVP-Compatible Wireframe Copy**

```markdown
## Wireframe Copy – ParkBoard MVP
*(Shared Condo Parking Booking — Approval Gated)*

**Pages & Sections**
1. **Landing Page**
   * Hero: *"Book Your Spot Without the Hassle"*
   * Subtext: *"Residents can reserve parking once approved by the building admin."*
   * CTA: *Login or Sign Up*

2. **Pending Approval Page**
   * Message: *"Your account is pending admin approval. You'll be notified once access is granted."*

3. **Members Dashboard** (Approved Users Only)
   * Tab: My Parking Spots (CRUD against `public.slots`)
   * Tab: Booking Calendar (basic — show own slots only)

4. **Admin Dashboard** (Admin-Only Link, Protected by Server Key)
   * Tab: Approve Residents (toggle `profiles.approved`)
   * Tab: Manage Parking Spots
```

---

### Next Step — Tiny Admin Page

I’ll now create a **minimal `/admin` page** that:

* Lists all profiles (`id`, `full_name`, `approved`).
* Lets an admin toggle the `approved` field.
* Runs server-side with `SUPABASE_SERVICE_ROLE_KEY` so no security leak.

Do you want this admin page built as:

* **Simple Server-Side Rendered table + form buttons** (fastest, no client-side state), or
* **React client component with fetch calls to an API route** (more interactive, but adds API code)?

The choice affects how it integrates with our existing JS files.

Got it — you want a barebones **server-side rendered** page in plain JavaScript (no TypeScript, no frameworks) that:

* Reads data from Supabase.
* Shows it in a simple HTML table.
* Has basic form buttons to add/update/delete.

Here’s a minimal example using **Express + EJS** for rendering:

---

## **1. Install dependencies**

```bash
npm init -y
npm install express ejs @supabase/supabase-js dotenv
```

---

## **2. Project structure**

```
project/
  server.js
  views/
    index.ejs
  .env
  package.json
```

---

## **3. `.env`**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
PORT=3000
```

---

## **4. `server.js`**

```js
import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- GET table data ---
app.get("/", async (req, res) => {
  const { data: users, error } = await supabase.from("users").select("*").order("id");
  if (error) return res.status(500).send(error.message);
  res.render("index", { users });
});

// --- POST new user ---
app.post("/add", async (req, res) => {
  const { name, email } = req.body;
  await supabase.from("users").insert([{ name, email }]);
  res.redirect("/");
});

// --- DELETE user ---
app.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  await supabase.from("users").delete().eq("id", id);
  res.redirect("/");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
```

---

## **5. `views/index.ejs`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Users Table</title>
</head>
<body>
  <h1>Users</h1>

  <!-- Add Form -->
  <form method="POST" action="/add">
    <input type="text" name="name" placeholder="Name" required />
    <input type="email" name="email" placeholder="Email" required />
    <button type="submit">Add User</button>
  </form>

  <!-- Table -->
  <table border="1" cellpadding="5" cellspacing="0">
    <tr>
      <th>ID</th><th>Name</th><th>Email</th><th>Action</th>
    </tr>
    <% users.forEach(user => { %>
      <tr>
        <td><%= user.id %></td>
        <td><%= user.name %></td>
        <td><%= user.email %></td>
        <td>
          <form method="POST" action="/delete/<%= user.id %>">
            <button type="submit">Delete</button>
          </form>
        </td>
      </tr>
    <% }) %>
  </table>
</body>
</html>
```

---

## **6. Run locally**

```bash
node server.js
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## **7. Deployment steps (Railway / Render / Vercel)**

For **Render** or **Railway**:

1. Push project to GitHub.
2. Create a new web service on Render or Railway.
3. Set environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `PORT`).
4. Deploy — your SSR table+form will be live.

---

If you want, I can next **extend this** with **inline edit buttons** so you can update entries without leaving the table.
Would you like me to add that?
