# EEMMIC Website — Backend Status

> **2026-08-06: Supabase has been re-integrated**, with one change from the
> original (2026-08-02) design: there is **no public sign-up**. Every buyer/
> supplier/investor account is created by an admin from `dashboard.html`
> ("Invite a client"), via Supabase Auth's admin invite API. The invitee
> gets an email with a link to `accept-invite.html` to set their own
> password. `signup.html` / `js/signup.js` have been deleted.

What's built so far, and what's still needed. This is a status snapshot, not a
plan — see `BACKEND-PLAN.md` for the original Level 1 vs Level 2 decision
this was scoped against.

---

## 1. What's built

### Architecture
Node.js + Express backend, Supabase (Postgres + Auth) for storage. No build
step on the frontend (still plain HTML/CSS/JS) — the backend is a thin API
layer the existing frontend calls with `fetch()`; login/session/profile
reads go straight from the browser to Supabase under Row Level Security.

```
frontend/                    static site (unchanged structure, now calls /api/*)
backend/
  server.js                  Express app: CORS, JSON body parsing, routes, static frontend serving
  src/supabaseClient.js      Supabase client (service_role key — server-side only)
  src/auth.js                bearer-token -> Supabase user helper, shared by routes/middleware
  src/db.js                  all Postgres queries (submissions, newsletter, profiles)
  src/middleware/requireAdmin.js   verifies session + eemmic_profiles.role === 'admin'
  src/routes/submissions.js  POST / (create), GET / (admin list), PATCH /:id/status (admin update)
  src/routes/newsletter.js   POST /  (footer email signup)
  src/routes/users.js        GET / (admin: list accounts), POST / (admin: invite a client)
supabase/schema.sql          run manually in Supabase SQL Editor — not auto-migrated
api/index.js                 Vercel serverless entrypoint (re-exports backend/server.js's app)
vercel.json                  routes /api/* to the function, everything else to frontend/
package.json (root)          lets Vercel install backend/'s dependencies at build time
```

### Accounts (2026-08-06 — admin-provisioned, no public signup)
```
frontend/login.html, accept-invite.html, my-dashboard.html   account pages
frontend/dashboard.html                                       admin-only: submissions + "Invite a client"
frontend/js/supabase-client.js   browser Supabase client (anon key — needs filling in, see below)
frontend/js/db-client.js         window.EemmicDB — session/profile/auth calls, backed by Supabase
frontend/js/auth.js              shared session/role helpers (requireSession, requireAdmin, logout)
frontend/js/login.js, accept-invite.js, my-dashboard.js, dashboard.js, nav-auth.js
backend/src/routes/users.js      admin-only invite + list accounts
backend/src/middleware/requireAdmin.js   verifies the caller's Supabase session + admin role
```

- **Roles:** `buyer` / `supplier` / `investor` (admin-created only, via the dashboard invite
  form) and `admin` (not self-serve, and not invite-able from the UI — see below).
- **No public sign-up.** There is no `signup.html`. An admin fills in name / organisation /
  email / role on `dashboard.html` and clicks "Send Invite" → `POST /api/users` →
  `supabase.auth.admin.inviteUserByEmail()`. The invitee receives a Supabase Auth email with
  a link to `accept-invite.html`, where they set a password and land on their dashboard.
- **eemmic_profiles** table holds role/name/organisation per account, one row per Supabase
  Auth user, auto-created by a database trigger reading the invite's metadata.
- **eemmic_submissions** gained a nullable `user_id` — set automatically when a request to
  `POST /api/submissions` carries a valid session, so the public `contact.html` form keeps
  working unauthenticated exactly as before.
- **GET/PATCH /api/submissions and both /api/users routes are admin-gated** (`requireAdmin`
  middleware, real token + role verification — no longer a 501 stub).
- **Before this works — manual steps in your Supabase project:**
  1. Run `supabase/schema.sql` once in the SQL Editor (safe to re-run — every statement is
     `create table if not exists` / `create or replace` / `drop ... if exists` first).
  2. Fill in `frontend/js/supabase-client.js`'s `SUPABASE_URL` / `SUPABASE_ANON_KEY`
     placeholders (Project Settings → API → Project URL / anon public key — safe to publish,
     RLS restricts access).
  3. Fill in `backend/.env`'s `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (same page,
     `service_role` secret key — **never** publish this one) and `SITE_URL` (your deployed
     domain, used to build the invite email's redirect link).
  4. **Recommended:** Authentication → Providers → Email → turn **off** "Allow new users to
     sign up". The frontend no longer calls `signUp()` anywhere, but the anon key can still
     hit Supabase's REST API directly unless this is off — turning it off makes "admin-only
     accounts" enforced by Supabase itself, not just by what buttons the site shows.
  5. Confirm an email-sending method is configured for the project (Supabase's built-in
     sender works for low volume; swap in your own SMTP under Authentication → Emails for
     production) — without one, invite emails won't actually deliver.
  6. **Bootstrapping your first admin** (one-time, chicken-and-egg: dashboard.html's
     invite form needs an admin to use it): in the Supabase dashboard, go to
     Authentication -> Users -> Add user -> Send invite email, using your own email.
     Accept it via the link at accept-invite.html to set a password, then in the SQL
     Editor run:
     ```sql
     update public.eemmic_profiles set role = 'admin' where email = 'you@example.com';
     ```
     From then on, invite every other account through dashboard.html as normal.
- **Cross-site note:** this Supabase project is shared with another site (tables are
  prefixed `eemmic_*`). Supabase Auth's `auth.users` table is project-wide — a person
  invited on EEMMIC and a person who signs up on the other site draw from the same pool of
  accounts (same email = same account) unless the other site uses its own Supabase project.

### Data model — `eemmic_submissions` table (Supabase)
```
id            uuid, primary key
sector        text, default 'EEMMIC'
service       text, one of: evaluation | management | marketplace | investment
name          text
email         text
phone         text, optional
organisation  text, optional
message       text
detail        text, optional (per-stage form dropdown)
status        text, one of: new | contacted | qualified | closed (default 'new')
user_id       uuid, nullable, references auth.users
created_at    timestamptz, default now()
```
Row Level Security is enabled. The backend's `service_role` key bypasses it entirely
(admin list/update, and every insert). Browser reads (a user's own dashboard) go through
RLS policies scoped to `auth.uid() = user_id`, or admin-wide via a security-definer
`eemmic_is_admin()` check.

A second table, `eemmic_newsletter_subscribers` (id, email, created_at), backs the
footer email signup on every page.

### What each piece does
- **Contact form** (`contact.html`) — collects name / organisation / email / phone /
  service / message, POSTs to `/api/submissions`, Supabase stores it.
- **Admin dashboard** (`dashboard.html`) — two panels: **Invite a client** (creates
  buyer/supplier/investor accounts) and the **submissions table** (stat counts, status
  filter, inline status updates via `PATCH /api/submissions/:id/status`). Both panels
  require an admin-role account.
- **Login / accept-invite / my-dashboard** — an invited buyer/supplier/investor logs in
  at `login.html`; first-time visitors from an invite email land on `accept-invite.html`
  to set a password; `my-dashboard.html` shows only that account's own submissions and
  lets them submit a new requirement while logged in.
- **Newsletter signup** (footer, every page) — POSTs an email to `/api/newsletter`.
- **Vercel deploy path** — unchanged from before: `backend/server.js` exports its Express
  `app`, `api/index.js` re-exports it for Vercel's Node runtime, `vercel.json` routes
  `/api/*` there and everything else to the static `frontend/` folder.

### Explicitly NOT built
- No email/Slack notification when a submission comes in — it's stored in the database
  only, so someone has to check the dashboard to see new leads.
- No UI to revoke/resend an invite, or to change a client's role/organisation after
  creation — that's a manual SQL Editor / Supabase dashboard action for now.
- No password reset UI (Supabase Auth supports it, but no page calls it yet).
- No spam/bot protection (no CAPTCHA, no rate limiting) on the public `POST
  /api/submissions` or `POST /api/newsletter` endpoints.
- No automated Supabase migrations — `schema.sql` has to be run by hand.

---

## 2. What's needed to actually go live

### Accounts / credentials (manual steps — see the numbered list above)
Supabase project + `schema.sql`, both sets of URL/key placeholders filled in, "Allow new
users to sign up" turned off, an email sender configured, and the first admin bootstrapped
by hand.

### Before this is safe to put in front of real users
- **Spam protection** on the two public POST endpoints — at minimum a honeypot field or
  basic rate limiting (e.g. `express-rate-limit`) per IP.
- **Email/notification on new submission** — a transactional email service (Resend,
  SendGrid, Postmark) fired from `submissions.js` after a successful insert. Not wired up.
- **CORS is currently wide open** (`cors()` with no options). Fine while API and frontend
  share a domain (as `vercel.json` sets up); tighten (`origin: 'https://yourdomain.com'`)
  if the API is ever called from anywhere else.

### If EEMMIC becomes a real operating product (Level 2, per BACKEND-PLAN.md)
Not needed now, but flagging since it changes the tech significantly: a real
projects/bids/deals data model (today only leads are modeled), file storage for
documents, and finer-grained role-based access than admin/buyer/supplier/investor.

---

## 3. Tech stack summary

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Static HTML/CSS/JS | No build step, no framework |
| Backend | Node.js + Express | `backend/server.js` |
| Database | Supabase (Postgres) | `@supabase/supabase-js`, service_role key server-side only |
| Auth | Supabase Auth | Admin-provisioned accounts only (no public signup) |
| Hosting target | Vercel | Static frontend + one serverless function for `/api/*` |
| Email | Supabase Auth's built-in sender (invite emails) | No transactional email for new-submission alerts yet |
