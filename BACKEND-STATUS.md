# EEMMIC Website — Backend Status

> **2026-08-04: Supabase has been removed.** Everything below describes the
> Supabase-based implementation that existed until now — it's kept as a
> reference for the data model (submissions/newsletter/profiles shape) and
> endpoints (`/api/submissions`, `/api/newsletter`) the *next* database
> should replicate, not as a description of current behavior. In the actual
> code: `backend/src/db.js` is a stub every route calls into (marked `TODO`),
> `frontend/js/db-client.js` (`window.EemmicDB`) is the equivalent browser
> stub, admin auth (`requireAdmin.js`) fails closed (501), and
> `supabase/schema.sql` is left in place only as schema reference. Login,
> signup, and both dashboards render but can't actually authenticate or load
> data until a new database is wired up in those two stub files.

What's built so far, and what's still needed. This is a status snapshot, not a
plan — see `BACKEND-PLAN.md` for the original Level 1 vs Level 2 decision
this was scoped against (Level 1: make the contact form actually work. This
is that, plus a Vercel deployment path and an internal leads dashboard).

---

## 1. What's built

### Architecture
Node.js + Express backend, Supabase (Postgres) for storage. No build step
on the frontend (still plain HTML/CSS/JS) — the backend is a thin API layer
the existing frontend calls with `fetch()`.

```
frontend/               static site (unchanged structure, now calls /api/*)
backend/
  server.js              Express app: CORS, JSON body parsing, routes, static frontend serving
  src/supabaseClient.js   Supabase client, built from env vars
  src/routes/submissions.js   POST /  (create), GET /  (list), PATCH /:id/status (update)
  src/routes/newsletter.js    POST /  (footer email signup)
supabase/schema.sql      run manually in Supabase SQL Editor — not auto-migrated
api/index.js             Vercel serverless entrypoint (re-exports backend/server.js's app)
vercel.json              routes /api/* to the function, everything else to frontend/
package.json (root)      lets Vercel install backend/'s dependencies at build time
```

### Accounts (2026-08-02 update)
Login, signup, a per-user dashboard, and a gated admin dashboard were added
on top of the Level 1 backend above, using **Supabase Auth** directly from
the browser (not through the Express backend) for signup/login/session:

```
frontend/login.html, signup.html, my-dashboard.html   new account pages
frontend/dashboard.html                                now admin-only (was open to anyone)
frontend/js/supabase-client.js   browser Supabase client (anon key — needs filling in, see below)
frontend/js/auth.js              shared session/role helpers (requireSession, requireAdmin, logout)
frontend/js/login.js, signup.js, my-dashboard.js   page-specific logic
backend/src/middleware/requireAdmin.js   verifies the caller's Supabase session + admin role
```

- **Roles:** `buyer` / `supplier` / `investor` (public signup, self-selected) and `admin`
  (not self-serve — see `supabase/schema.sql`'s comment on promoting an account by hand
  via `update eemmic_profiles set role = 'admin' where email = '...'`).
- **eemmic_profiles** table (new) holds role/name/organisation per account, one row per
  Supabase Auth user, auto-created by a database trigger on signup.
- **eemmic_submissions** gained a nullable `user_id` — set automatically when a request
  to `POST /api/submissions` carries a valid session, so the public `contact.html` form
  keeps working unauthenticated exactly as before.
- **GET/PATCH /api/submissions are now auth-gated** (`requireAdmin` middleware): this
  closes the "anyone with the URL" gap flagged below — that gap is resolved, not just
  hidden behind a nav link.
- **Before this works:** `frontend/js/supabase-client.js` has placeholder
  `SUPABASE_URL` / `SUPABASE_ANON_KEY` values that must be filled in with your Supabase
  project's actual Project URL and anon/public key (Project Settings → API — the anon
  key is safe to publish, RLS is what restricts access). And `supabase/schema.sql`'s
  new sections (profiles, policies, trigger, `user_id` column) need to be re-run in the
  SQL Editor if you already ran the earlier version of this file.
- **Cross-site note:** this Supabase project is shared with another site (per the
  2026-08-02 decision to prefix table names `eemmic_*`). Supabase Auth's `auth.users`
  table is project-wide, not per-site — so a person who signs up on EEMMIC and a person
  who signs up on the other site are drawing from the *same* pool of accounts (same
  email = same account) unless the other site is configured with its own Supabase
  project for auth. Worth confirming that's the intended behavior before both sites are
  live with real users.

### Data model — `submissions` table (Supabase)
```
id            uuid, primary key
sector        text, default 'EEMMIC'
service       text, one of: evaluation | management | marketplace | investment
name          text
email         text
phone         text, optional
organisation  text, optional
message       text
status        text, one of: new | contacted | qualified | closed (default 'new')
created_at    timestamptz, default now()
```
Row Level Security is enabled with **no policies** — the anon/public key has
zero access. Only the backend's `service_role` key can read/write, and that
key never leaves the server.

A second table, `newsletter_subscribers` (id, email, created_at), backs the
footer email signup on every page.

### What each piece does
- **Contact form** (`contact.html`) — collects name / organisation / email /
  phone / service (Evaluation, Management, Marketplace, or Investment) /
  message, POSTs to `/api/submissions`, and Supabase stores it.
- **Admin dashboard** (`dashboard.html`) — lists all submissions, with
  stat counts and a status filter (New / Contacted / Qualified / Closed).
  An operator can change a submission's status inline; that PATCHes
  `/api/submissions/:id/status`. Requires an admin-role account (see
  Accounts section above) — no longer linked from the public nav.
- **Login / signup / my-dashboard** — buyer, supplier, and investor accounts
  via Supabase Auth; each account's own dashboard shows only their own
  submissions and lets them submit a new requirement while logged in.
- **Newsletter signup** (footer, every page) — POSTs an email to
  `/api/newsletter`.
- **Vercel deploy path** — `backend/server.js` exports its Express `app`
  instead of always calling `.listen()`; `api/index.js` re-exports it for
  Vercel's Node runtime; `vercel.json` routes `/api/*` there and everything
  else to the static `frontend/` folder.

### Explicitly NOT built
- No email/Slack notification when a submission comes in — it's stored in
  the database only, so someone has to check the dashboard to see new leads.
- Auth now exists (see Accounts section above) and gates the admin
  dashboard/API. Still missing: password reset UI (Supabase Auth supports
  it, but no page calls it yet), and email verification enforcement depends
  on your Supabase project's "Confirm email" setting rather than anything
  this app enforces itself.
- No spam/bot protection (no CAPTCHA, no rate limiting) on the public
  `POST /api/submissions` or `POST /api/newsletter` endpoints.
- No automated Supabase migrations — `schema.sql` has to be run by hand in
  the Supabase SQL Editor, and again by hand for any future schema change.

---

## 2. What's needed to actually go live

### Accounts / credentials (manual steps, can't be done from here)
1. A Supabase project (free tier is fine to start) — create it, then run
   `supabase/schema.sql` once in its SQL Editor.
2. From that project: **Project Settings → API** → copy the Project URL and
   the `service_role` secret key.
3. A Vercel project connected to this codebase (or deployed via `vercel`
   CLI). In **Project Settings → Environment Variables**, set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   (There's no `.env` file in the deployed bundle — `backend/.env.example`
   is for local dev only.)
4. For local development: copy `backend/.env.example` to `backend/.env` and
   fill in the same two values, then `npm install` in `backend/` and
   `npm start`.
5. Fill in `frontend/js/supabase-client.js`'s `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` placeholders (Project Settings → API → Project URL /
   anon public key) so login/signup/dashboards can reach Supabase Auth.
6. Promote your own account to admin once, by hand, in the SQL Editor:
   `update eemmic_profiles set role = 'admin' where email = 'you@example.com';`
   (do this only after signing up normally through `signup.html` once).

### Before this is safe to put in front of real users
- **Spam protection** on the two public POST endpoints — at minimum a
  honeypot field or basic rate limiting (e.g. `express-rate-limit`) per IP,
  since both are open, unauthenticated, write-to-database endpoints.
- **Email/notification on new submission** — otherwise someone has to
  remember to check `dashboard.html`. A transactional email service
  (Resend, SendGrid, Postmark — anything with a simple API) fired from
  `submissions.js` after a successful insert would close this gap. Not
  wired up yet.
- **CORS is currently wide open** (`cors()` with no options, i.e. any
  origin). Fine while the API and frontend are served from the same
  domain (which is how `vercel.json` is set up), worth tightening
  (`origin: 'https://yourdomain.com'`) if the API is ever called from
  anywhere else.

### If EEMMIC becomes a real operating product (Level 2, per BACKEND-PLAN.md)
Not needed now, but flagging since it changes the tech significantly:
user accounts/login for admins vs. suppliers vs. buyers, a real
projects/bids/deals data model (today only leads are modeled), file
storage for documents (bid proposals, compliance paperwork), and
role-based access instead of the current no-auth internal tool.

---

## 3. Tech stack summary

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Static HTML/CSS/JS | No build step, no framework |
| Backend | Node.js + Express | `backend/server.js` |
| Database | Supabase (Postgres) | `@supabase/supabase-js`, service_role key server-side only |
| Hosting target | Vercel | Static frontend + one serverless function for `/api/*` |
| Email | none yet | Needed for new-submission alerts (see above) |
| Auth | none | Needed before this is public-safe (see above) |
