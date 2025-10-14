
# QA_AUTH_CHECKLIST_FACEBOOK.md
ParkBoard — Facebook SSO (Supabase) QA Checklist
================================================

Purpose
-------
Use this checklist to verify Facebook Single Sign-On (SSO) via Supabase during alpha/beta testing (up to ~100 users). Run these checks in each environment: `local` (localhost), `staging` (staging.<your-domain>), and `production` (https://parkboard.app).

How to use
----------
1. Run each test top-to-bottom for the environment you are validating.
2. Mark ✅ when the step passes; mark ❌ and add logs when it fails.
3. Provide evidence (console/network screenshots, Supabase auth logs, and Playwright test outputs) when reporting bugs.

Environment variables / prep
----------------------------
- SUPABASE_URL
- SUPABASE_ANON_KEY (frontend)
- SUPABASE_SERVICE_ROLE_KEY (backend-only)
- SITE_URL (in Supabase settings)
- FACEBOOK_APP_ID and FACEBOOK_APP_SECRET (from Meta Developer Console)

Quick links
-----------
- Supabase Auth: Dashboard → Authentication → Providers
- Supabase Logs: Dashboard → Authentication → Logs
- Facebook Developer Console: https://developers.facebook.com/apps/

Checklist
---------

## 1) Facebook Developer Console configuration
- [ ] App type: "Consumer" (recommended for SSO).
- [ ] Valid App ID and App Secret copied into Supabase → Auth → Providers → Facebook.
- [ ] Under **Facebook Login → Settings**, confirm:
  - `Valid OAuth Redirect URIs` includes:
    - `http://localhost:3000`
    - `https://staging.parkboard.app`
    - `https://parkboard.app`
    - The Supabase redirect URI, e.g. `https://<your-supabase-project>.supabase.co/auth/v1/callback`
  - `Login from devices` is **enabled** (optional; helps mobile testing).
- [ ] Under **App Settings → Basic**:
  - App domain includes your staging and production domains.
  - Contact email is valid.
  - Privacy policy URL and Terms of Service URL are set (required for public apps).
- [ ] If app is not yet public, add tester accounts under **Roles → Testers**.

Evidence: Screenshot of Facebook app settings (Basic + Login tabs).

## 2) Supabase Auth configuration
- [ ] Facebook provider is enabled in Supabase Auth settings.
- [ ] SITE_URL matches production/staging environment.
- [ ] Redirect URLs in Supabase Auth → Settings → Redirect URLs include each target environment.
- [ ] Facebook App ID and Secret entered correctly.

Evidence: Screenshot of Supabase Facebook provider configuration.

## 3) Basic Functional Flow (Single user)
- [ ] From app, click "Sign in with Facebook".
- [ ] Facebook login dialog appears; complete sign-in with a test account.
- [ ] App receives a valid Supabase session; `supabase.auth.getSession()` returns valid `access_token`.
- [ ] `supabase.auth.onAuthStateChange()` fires `SIGNED_IN` event.
- [ ] User appears in `auth.users` table with `provider = facebook`.

Network evidence: Browser Network tab showing Facebook OAuth and Supabase token exchange.

## 4) Token Refresh & Persistence
- [ ] After signing in, reload page → still signed in (session restored).
- [ ] Wait for access token expiration or manually call `supabase.auth.refreshSession()` — refresh succeeds.
- [ ] Log out and back in again → new session issued, previous invalidated.
- [ ] Sign in on second device/browser — verify independent sessions work as expected.

Evidence: Console logs showing session persistence, timestamps, and session IDs.

## 5) Redirect URI & Domain Edge Cases
- [ ] Attempt login from unlisted redirect URI → expect `redirect_uri_mismatch` error.
- [ ] Confirm Facebook app’s domain list includes your Supabase project domain and app domain.
- [ ] If `App not configured for this domain` error appears, verify domain whitelist in Facebook App Settings → Advanced → "App Domains".

Evidence: Screenshots of expected error states.

## 6) Permissions and Scopes
- [ ] Default scopes `public_profile` and `email` are requested automatically.
- [ ] Verify email field is returned in Supabase user metadata.
- [ ] If you need additional data (e.g., friends list), confirm Facebook review is approved before public launch.

Evidence: Example user metadata from Supabase (JSON snippet).

## 7) Rate Limits, Quotas, and Debugging
- [ ] 100 users should not exceed Facebook API limits, but monitor for `error_code 613` (rate limit exceeded).
- [ ] Watch for `OAuthException` responses; collect `fbtrace_id` for debugging.
- [ ] Supabase rate limits also apply — monitor for HTTP 429 responses.

Evidence: Any Facebook error logs or Supabase rate-limit traces.

## 8) Multi-user Simulation
- [ ] Use Playwright/Puppeteer to simulate multiple concurrent sign-ins (start with 10, scale to 50, then 100).
- [ ] Verify no duplicate users, failed redirects, or token collisions.
- [ ] Confirm Facebook consent dialog throttling or CAPTCHA not triggered excessively.

Evidence: Playwright run logs, failure traces.

## 9) Security & Best Practices
- [ ] Never embed SERVICE_ROLE_KEY or App Secret in frontend.
- [ ] Only use https on production.
- [ ] Verify Supabase JWTs are signed and valid using the project’s public key.
- [ ] Remove unused test apps from Facebook Developer Console.

Evidence: Validation logs, screenshots.

## 10) Post-mortem & Recovery Plan
- [ ] Collect: browser logs, Facebook login errors (with `fbtrace_id`), Supabase logs, and timestamps.
- [ ] Reproduce using exact redirect URI to confirm mismatch cause.
- [ ] If Facebook disables login temporarily, disable the provider in Supabase until fixed.
- [ ] Update documentation once issue is resolved.

Appendix — Example client code
------------------------------
```js
// Facebook login example (redirect)
await supabase.auth.signInWithOAuth({
  provider: 'facebook',
  options: {
    redirectTo: 'https://staging.parkboard.app/welcome'
  }
})

// Check session on page load
const { data } = await supabase.auth.getSession()
if (data?.session) console.log('User signed in:', data.session.user)

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session)
})
```

---

## Document Metadata

**Version History:**
- v1.0 (Alpha Pilot Ready) - Initial version

**Document Details:**
- **Path:** `docs/QA_AUTH_CHECKLIST_FACEBOOK.md`
- **Maintainer:** ParkBoard Dev Team
- **Last Updated:** 2025-10-14
- **Status:** Implementation Ready

**AI Assistance:**
- **Model:** GPT-5
- **Reference Session:** [ChatGPT Discussion](https://chatgpt.com/c/68edeb6c-4374-8324-bba7-f59432d38328)
