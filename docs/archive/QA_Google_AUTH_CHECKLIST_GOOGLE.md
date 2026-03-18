
# QA_AUTH_CHECKLIST.md
ParkBoard — Google SSO (Supabase) QA Checklist
==============================================

Purpose
-------
Use this checklist to verify Google Single Sign-On (SSO) via Supabase during alpha/beta testing (up to ~100 users). Run these checks in each environment: `local` (localhost), `staging` (staging.<your-domain>), and `production` (https://parkboard.app).

How to use
----------
1. Run each test top-to-bottom for the environment you are validating.
2. Mark ✅ when the step passes; mark ❌ and add logs when it fails.
3. Provide the attached evidence (console/network screenshots, Supabase auth logs, and any Playwright run outputs) when filing bugs.

Environment variables / prep
---------------------------
- SUPABASE_URL
- SUPABASE_ANON_KEY (client)
- SUPABASE_SERVICE_ROLE_KEY (server-only; never expose in frontend)
- SITE_URL (set in Supabase Auth settings)
- Ensure Google Cloud OAuth client is configured with correct Redirect URIs and Authorized JavaScript origins.

Quick links
-----------
- Supabase Auth: Dashboard → Authentication → Providers
- Supabase Logs: Dashboard → Authentication → Logs
- Google Cloud Console: APIs & Services → Credentials

Checklist
---------

## 1) Provider & Console Configuration
- [ ] Google OAuth client exists and is set to "Web application".
- [ ] Client ID and Client Secret are copied into Supabase → Auth → Providers → Google.
- [ ] `Authorized JavaScript origins` includes:
  - `http://localhost:3000` (dev; change port if different)
  - `https://staging.parkboard.app` (staging)
  - `https://parkboard.app` (production)
- [ ] `Authorized redirect URIs` includes Supabase redirect URI(s) if applicable (see Supabase docs). Usually:
  - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
  - If using `redirectTo` in client flows, include the final app redirect URL(s).
- [ ] Google APIs needed (if any) are enabled in the cloud project.

Evidence to attach on pass/fail: screenshot of Google Console credentials page.

## 2) Supabase Auth configuration
- [ ] Provider "Google" is enabled in Supabase Auth.
- [ ] SITE_URL matches production domain in Supabase Project Settings → General.
- [ ] Redirect URLs (allow list) include each target URL you will use (`localhost`, `staging`, `prod`).
- [ ] If using `redirectTo` parameter in signIn, confirm intended redirect is on the allow list.

Evidence: screenshot of Supabase Auth provider settings and Redirect URLs.

## 3) Basic Functional Flow (Single user)
- [ ] From app, click "Sign in with Google".
- [ ] Google consent screen appears; complete sign-in.
- [ ] App receives a Supabase session; `supabase.auth.getSession()` returns a valid session with `access_token` and `refresh_token`.
- [ ] `supabase.auth.onAuthStateChange()` fires `SIGNED_IN` event in the client (observe console/log).
- [ ] User data appears in `auth.users` table (Supabase dashboard).

Network evidence: Browser Network tab capture showing OAuth redirect and token exchange. Attach console logs showing session object.

## 4) Token Refresh & Persistence
- [ ] After sign-in, reload the page — user remains signed in (client calls `supabase.auth.getSession()` on startup).
- [ ] Wait for the access token expiry (or simulate by clearing token) and call `supabase.auth.refreshSession()` — session refresh succeeds.
- [ ] Test sign-in across two devices/browsers: logging out from one does not automatically log out the other (unless you enforce single-session rules).
- [ ] Verify session lifetime and session-per-user settings if you require stricter controls (note: some settings are Pro-only).

Evidence: Logs showing `refreshSession()` success, timestamps, and session IDs.

## 5) Redirect URI / Mismatch edge-cases
- [ ] Try signing in with an intentionally wrong redirect URI to confirm the error is `redirect_uri_mismatch` (expected failure case).
- [ ] Confirm that changes in Google Console propagate (sometimes changes take minutes); retry after 5–10 minutes if you recently edited URIs.

Evidence: Screenshot of error page / browser console error.

## 6) Rate Limits, Quotas & Abuse Protection
- [ ] Confirm expected daily OAuth request volume is far below Google default quotas (Google's default API quotas are generous; 100 users is typically safe).
- [ ] Check Supabase Auth rate limits for your project; watch for `429` responses in auth endpoints during stress tests.
- [ ] If you plan promotional events or expected spikes, prepare to enable billing or request quota increases with Google Cloud and Supabase.

Evidence: Any `429` responses captured; Supabase rate limit docs snapshot.

## 7) Multi-user smoke test (~100 simulated users)
- [ ] Use Playwright/Puppeteer scripts or headless browser automation to simulate concurrent sign-ins (start with 10, then 50, then 100).
- [ ] Confirm no `invalid_client`, `redirect_uri_mismatch`, `429`, or other OAuth errors occur under load.
- [ ] Confirm Supabase project still responds and your app's frontend handles session state without crashing.

Suggested Playwright test plan:
- Spawn N parallel browser contexts.
- Each context performs: open app → click "Sign in with Google" → complete OAuth handshake (use test accounts or mock the consent step by pre-authenticating).
- Record success/fail counts and latency.

Evidence: Test run logs, failure stack traces, screenshots.

## 8) Security & Best Practices
- [ ] Never embed SERVICE_ROLE_KEY in frontend code.
- [ ] Use https on all production domains; ensure HSTS is enabled where possible.
- [ ] Consider using server-side calls to handle sensitive token refresh flows if you need HttpOnly cookies or extra protection.
- [ ] Audit `auth.users` rows for correct provider IDs and expected metadata.

## 9) Observability & Rollback
- [ ] Add auth log monitoring (Supabase Auth logs, or export logs to Papertrail/Datadog).
- [ ] Have a rollback plan (e.g., revert client-side auth code or disable provider in Supabase) if you discover a critical bug during alpha release.
- [ ] Document steps to disable a provider quickly in Supabase dashboard.

## 10) Post-mortem checklist (if issues happen)
- [ ] Collect: browser network traces, Supabase Auth logs, Google Cloud Console request logs, Playwright run outputs, timestamps.
- [ ] Reproduce locally with exact redirect URIs and environment variables.
- [ ] If `redirect_uri_mismatch`, verify both Google Console and Supabase Redirect allow list match the actual redirect URL exactly (including protocol and trailing slash).
- [ ] If `invalid_client`, confirm client ID/secret match and have been entered correctly into Supabase.
- [ ] If `429` or rate limit, capture exact endpoint and consider backoff/retry strategies.

Appendix — Helpful commands/snippets
-----------------------------------
- Example: Get session on page load
```js
const { data } = await supabase.auth.getSession()
if (data?.session) { /* user is signed in */ }
supabase.auth.onAuthStateChange((event, session) => console.log(event, session))
```

- Refresh session
```js
const { data, error } = await supabase.auth.refreshSession()
```

- Sign in with redirect (explicit redirectTo)
```js
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://staging.parkboard.app/welcome' }})
```

- Important: To avoid `redirect_uri_mismatch`, ensure final redirect targets are added to Supabase allow list and Google Console redirect URIs.

-- End of QA_AUTH_CHECKLIST.md

---

## Document Metadata

**Version History:**
- v1.0 (Alpha Pilot Ready) - Initial version

**Document Details:**
- **Path:** `docs/QA_Google_AUTH_CHECKLIST_GOOGLE.md`
- **Maintainer:** ParkBoard Dev Team
- **Last Updated:** 2025-10-14
- **Status:** Implementation Ready

**AI Assistance:**
- **Model:** GPT-5
- **Reference Session:** [ChatGPT Discussion](https://chatgpt.com/c/68edeb6c-4374-8324-bba7-f59432d38328)
