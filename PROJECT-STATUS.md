# EEMMIC Website — Full Project Status

**Last updated:** 2026-08-06
**Location:** `/mnt/d/web development/Emmic` (no git repo initialized)

---

## 1. What EEMMIC Is

EEMMIC is **not an EPC (solar installer) and not a live operating company** — it is positioned as a **SaaS marketplace** for Pakistan's B2B/captive energy market, connecting:

- **Energy buyers** (textile mills, cement plants, hospitals, universities, malls, manufacturing plants)
- **Verified EPC/solar companies** (real-world reference points: Reon Energy, Nizam Energy, Premier Energy, SkyElectric, Pantera Energy, Alpha Solar)
- **Equipment suppliers**
- **Investors** (banks, infrastructure funds, DFIs)
- **Regulators** (NEPRA, CPPA-G, NTDC, DISCOs — IESCO/LESCO/GEPCO/FESCO/MEPCO/PESCO)

Through one process, branded **EMMIC**: **E**valuation → **M**anagement → **M**arketplace → **I**nvestment. (A fifth "Company" stage was deliberately removed from all site copy on 2026-07-31 — see §7.)

### Governance context (important, non-obvious)
EEMMIC is a sector inside a larger holding structure, **AmanorX Holdings (Pvt) Ltd**, which runs a 16-sector "EMMIC" model. Per AmanorX's own internal governance documents:
- EEMMIC's official status is **PIPELINE, priority 2 — not a live entity.** No EEMMIC entity is identified/sourced in any AmanorX document reviewed.
- AmanorX's own instruction: *"Copy for this sector must read as direction and intent only, never operating fact."*
- Pakistan's single-buyer regulatory legacy confines any realistic near-term mechanic to **B2B/captive and net-metered/net-billed segments** — not an open wholesale market.
- The site previously published hard operating-fact claims ("520 MW+ Installed Capacity," "40+ Countries," "15+ Years Experience," "2M+ Tons CO₂ Offset/yr") that contradicted the pipeline/no-entity status. **This has since been fixed** — as of this doc, no `520`, `40+`, or "installed capacity" style claims remain anywhere in `frontend/*.html`. The hero now uses honest, non-operating-fact stats instead (see §5).
- Positioning is confirmed **Pakistan-first** (anchored on the captive/net-billing lane, i.e. the Reon Energy model), not the earlier global-operator framing.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Static HTML/CSS/JS | No build step, no framework, no bundler |
| Frontend animation | Vanilla CSS/JS + **GSAP 3.12.5 + ScrollTrigger** (via CDN) | Added on top of the original CSS-only system |
| Backend | Node.js + Express (`backend/server.js`) | Thin API layer, called via `fetch()` from static pages |
| Database | **Supabase (Postgres)** | Re-integrated 2026-08-06; see §4 |
| Hosting target | Vercel | Static `frontend/` + one serverless function for `/api/*` |
| Email/notifications | Supabase Auth's built-in sender | Invite emails only — no new-submission alert email yet |
| Auth | Supabase Auth, **admin-provisioned accounts only** | No public signup — see §4 |
| Fonts | Google Fonts — Inter (body) + Space Grotesk (display) | Loaded via `<link>`, preconnected |

Root `package.json` exists purely so Vercel installs `backend/`'s dependencies (`cors`, `dotenv`, `express`) at build time — it has no scripts of its own.

---

## 3. Folder Structure

```
Emmic/
├── frontend/              live static site — HTML/CSS/JS, no build step
│   ├── *.html              15 pages (see §5)
│   ├── css/style.css        923 lines — design tokens, layout, components
│   ├── css/animations.css   95 lines — keyframes, transition helpers
│   ├── css/responsive.css   101 lines — breakpoints
│   ├── js/main.js           page loader, filter chips, contact/newsletter form handlers
│   ├── js/navigation.js     navbar scroll state, mobile menu, dropdown
│   ├── js/animations.js     scroll-reveal, counters, cursor, tilt, particles, ripple, theme toggle
│   ├── js/scroll-fx.js      GSAP/ScrollTrigger layer: hero parallax, mesh drift, magnetic buttons
│   ├── js/supabase-client.js   browser Supabase client (anon key — fill in URL/key, see §4)
│   ├── js/db-client.js      window.EemmicDB — session/profile/auth calls, backed by Supabase (see §4)
│   ├── js/auth.js           shared session/role helpers (requireSession, requireAdmin, logout)
│   ├── js/login.js, accept-invite.js, my-dashboard.js, dashboard.js, nav-auth.js
│   └── assets/              icons, images, logos, videos
├── backend/
│   ├── server.js            Express app: CORS, JSON body parsing, routes, static frontend serving
│   ├── src/supabaseClient.js   Supabase client (service_role key, server-side only)
│   ├── src/auth.js          bearer-token -> Supabase user helper, shared by routes/middleware
│   ├── src/db.js            Postgres queries — submissions, newsletter, profiles (see §4)
│   ├── src/routes/submissions.js   POST / (create lead), GET / (list, admin), PATCH /:id/status (admin)
│   ├── src/routes/newsletter.js    POST / (footer email signup)
│   ├── src/routes/users.js         GET / (admin: list accounts), POST / (admin: invite a client)
│   ├── src/middleware/requireAdmin.js   verifies session + eemmic_profiles.role === 'admin'
│   ├── .env / .env.example
│   └── package.json
├── api/index.js            Vercel serverless entrypoint — re-exports backend/server.js's Express app
├── vercel.json              routes /api/* → the function, everything else → frontend/
├── package.json (root)      lets Vercel install backend/'s deps
├── supabase/schema.sql      run manually in the Supabase SQL Editor — the live schema
├── BACKEND-PLAN.md          original Level 1 (contact form) vs Level 2 (full marketplace product) scoping doc
├── BACKEND-STATUS.md        detailed backend build log/status, incl. required manual Supabase setup steps
├── EEMMIC-Research-Briefing.txt   research brief naming real Pakistani energy-sector companies or context
├── dist/                    identical mirror/export of frontend/ (no diff found) — likely a deploy snapshot
└── dist.zip                 zipped copy of dist/
```

`dist/` was byte-for-byte identical to `frontend/` as of the last full audit (2026-08-05) — likely a snapshot/export copy rather than a separately maintained build. It has **not** been re-synced with this Supabase reintegration; treat `frontend/` as the source of truth.

---

## 4. Backend / Database — Current State

**Supabase was re-integrated on 2026-08-06**, with one deliberate change from the original (2026-08-02, pre-removal) design: **there is no public sign-up**. Every buyer/supplier/investor account is created by an admin from `dashboard.html`'s "Invite a client" panel, via Supabase Auth's admin invite API — the invitee gets an email with a link to `accept-invite.html` to set their own password. `signup.html` / `js/signup.js` no longer exist.

- **`backend/src/supabaseClient.js`** — Supabase client built from `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, service_role key, server-side only, bypasses RLS.
- **`backend/src/db.js`** — real queries against `eemmic_submissions`, `eemmic_newsletter_subscribers`, `eemmic_profiles`.
- **`backend/src/auth.js`** — turns a request's `Authorization: Bearer <token>` into a verified Supabase user, used by `requireAdmin` and by `submissions.js` to optionally link a submission to an account.
- **`backend/src/middleware/requireAdmin.js`** — verifies the session, then checks `eemmic_profiles.role === 'admin'`; 401/403 otherwise (no longer a 501 stub).
- **`backend/src/routes/users.js`** — admin-only: `GET /api/users` lists accounts, `POST /api/users` invites a new buyer/supplier/investor.
- **`frontend/js/supabase-client.js`** — browser Supabase client (anon key). **Has placeholder `SUPABASE_URL` / `SUPABASE_ANON_KEY` that must be filled in** (Project Settings → API).
- **`frontend/js/db-client.js`** (`window.EemmicDB`) — real implementation: `getSession`, `getProfile`, `signInWithPassword`, `setPassword` (invite acceptance), `signOut`, `fetchOwnSubmissions` (reads directly from Supabase under RLS).
- All 15 HTML pages load the Supabase JS CDN script + `js/supabase-client.js` before `js/db-client.js`.
- `@supabase/supabase-js` is back in both `package.json` files.

### Required manual setup (not doable from code — see `BACKEND-STATUS.md` §1 for full detail)
1. Run `supabase/schema.sql` once in the Supabase SQL Editor (idempotent — safe to re-run).
2. Fill in `frontend/js/supabase-client.js`'s URL/anon-key placeholders.
3. Fill in `backend/.env`'s `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SITE_URL`, and the same in Vercel's Project Settings → Environment Variables for production.
4. **Recommended:** turn off "Allow new users to sign up" (Authentication → Providers → Email) so admin-only accounts are enforced by Supabase itself, not just by the UI.
5. Confirm an email sender is configured (Supabase's built-in sender works for low volume; swap in real SMTP for production) — invite emails won't deliver without one.
6. Bootstrap the first admin by hand (Supabase dashboard → Authentication → Users → invite yourself, accept it, then `update eemmic_profiles set role = 'admin' where email = '...'` in the SQL Editor).

### Data model (`supabase/schema.sql`)
**`eemmic_submissions`**: `id, sector (default 'EEMMIC'), service (evaluation|management|marketplace|investment), name, email, phone, organisation, message, detail, status (new|contacted|qualified|closed), user_id (nullable, links to an account), created_at`

**`eemmic_newsletter_subscribers`**: `id, email (unique), created_at`

**`eemmic_profiles`**: `id (= auth user id), role (buyer|supplier|investor|admin), name, organisation, email, created_at` — role comes from invite metadata; admin can only be granted by hand in the DB, never self-served or invite-able from the UI.

### Backend API surface
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/submissions` | public (optionally linked to an account via bearer token) | validates input, inserts a row |
| GET | `/api/submissions` | admin | all submissions, newest first |
| PATCH | `/api/submissions/:id/status` | admin | updates one submission's status |
| POST | `/api/newsletter` | public | validates + inserts, tolerates duplicate email |
| GET | `/api/users` | admin | lists all accounts (`eemmic_profiles`) |
| POST | `/api/users` | admin | invites a new buyer/supplier/investor account |

### Known gaps even with the DB wired up
- No email/Slack notification on new submissions (someone would have to check the dashboard manually).
- No spam/bot protection (no CAPTCHA, no rate limiting) on the two public POST endpoints.
- No password-reset UI, and no UI to revoke/resend an invite or edit a client's role after creation (SQL Editor / Supabase dashboard only).
- No automated migrations — schema changes are applied by hand in the SQL Editor.
- CORS is currently wide open (`cors()` with no options) — acceptable only because frontend + API are same-origin under `vercel.json`.
---

## 5. Frontend — Pages & Content

15 HTML pages, all sharing `css/style.css` + `css/animations.css` + `css/responsive.css` and a common navbar/footer:

| Page | Purpose |
|---|---|
| `index.html` (601 lines — largest page) | Homepage: hero, stats band, "the problem," traditional-vs-EEMMIC comparison, how-it-works, etc. |
| `about.html` | Mission/vision, core values, why operators & investors choose EEMMIC |
| `solutions.html` | "Full-stack energy solutions, verified before you bid" — solution categories |
| `projects.html` | "How It Works" — the four EMMIC stages explained, who EEMMIC serves |
| `evaluation.html` | Stage 1 detail page + stage-specific requirement form |
| `management.html` | Stage 2 detail page + stage-specific requirement form |
| `marketplace.html` | Stage 3 detail page + stage-specific requirement form |
| `investment.html` | Stage 4 detail page + stage-specific requirement form |
| `sustainability.html` | "Clean energy, measured honestly" — sustainability pillars |
| `innovation.html` | Data-driven deal evaluation, interconnection tracking, platform roadmap |
| `contact.html` | Main contact form → `/api/submissions` |
| `login.html` / `accept-invite.html` | Login, and set-password page for an admin-sent invite |
| `my-dashboard.html` | Per-user dashboard — own submissions only |
| `dashboard.html` | Admin-only "Submissions Dashboard" — lists/updates all leads |

### Homepage hero (current, honest positioning)
> "Not an EPC. The **platform** behind Pakistan's energy deals."
> Badge: *"SaaS Marketplace · Not an EPC"*
> Stats band: **5**-stage verification process · **100%** suppliers vetted before bidding · **Pakistan** first market focus · **0** generation assets owned by EEMMIC

This directly resolves the earlier governance conflict — no unsourced MW/countries/years/CO₂ claims remain in the codebase.

### Nav structure
Home · About · Solutions · **EMMIC** (dropdown: Evaluation / Management / Marketplace / Investment) · Sustainability · Innovation · Contact — plus Log In / "Get in Touch" CTA / theme toggle / mobile hamburger.

---

## 6. Design System

- **Fonts:** Space Grotesk (display/headings) + Inter (body), loaded from Google Fonts.
- **Palette:** dark navy/near-black background (`#0A0A0C` bg, `#101014` primary), amber/yellow accent (`#FFD400` secondary, `#FFB800` accent) — high-contrast dark theme with a glowing CTA accent.
- **Surfaces:** glassmorphism cards (`--color-glass: rgba(20,20,23,0.55)` + subtle border), soft-to-strong layered shadows (`--shadow-sm` → `--shadow-xl`, plus a dedicated `--shadow-glow` for primary CTAs).
- **Radius scale:** 8 / 14 / 22 / 32 / full (pill).
- **Theming:** dark/light toggle persisted to `localStorage`.
- **Motif:** full-bleed background video (`Sustanability.mp4`) behind every page with an overlay scrim; hero includes a looping `Pakistan_energy.mp4` inside an "orb sphere."

---

## 7. Animation / Interaction Stack

Two layers, working together:

**1. Original vanilla CSS/JS system** (`animations.js`, `animations.css`):
- Page loader with pulsing "E" mark
- Custom cursor that eases toward the pointer, expands to a text pill on `[data-cursor-text]` targets
- Scroll reveal via `IntersectionObserver` (`.reveal` / `data-reveal-batch` auto-stagger)
- Animated number counters (`data-count`, cubic ease-out)
- 3D tilt on solution/project cards (mousemove-driven perspective/rotate)
- Button ripple effect on click
- Floating "energy particle" field in the hero
- Hero gradient orbs / glow-pulse on primary CTA

**2. GSAP layer** (`scroll-fx.js`, added since the last full audit — CDN `gsap@3.12.5` + `ScrollTrigger`, loaded on 11 of 15 pages):
- Hero/page-hero background orbs drift at different parallax speeds on scroll
- Mesh backgrounds get a subtle depth-drift scroll effect
- Magnetic-pull hover effect on primary CTA buttons (nudges toward cursor, springs back)
- Respects `prefers-reduced-motion` (no-ops entirely if set, and no-ops silently if GSAP fails to load)

This GSAP addition is a first step toward the stated design goal (below) — it is not yet full WebGL/Three.js.

### Design inspiration goal (not fully executed)
The user wants the site's animation/interaction quality pushed toward **Active Theory** (activetheory.net) — a WebGL/GSAP creative-dev studio (Google/Nike/Netflix work) known for: full-screen Three.js/GLSL shader scenes, theatrical canvas-wipe page transitions, Lenis-style directed smooth-scroll, and minimal typography that takes a back seat to motion. This is a large scope jump from a no-build-tool static site — a literal implementation would mean adding Three.js and a smooth-scroll library via CDN. GSAP + ScrollTrigger is now in place; Three.js/WebGL and choreographed page transitions are **not yet started**.

---

## 8. Deployment

- **Target:** Vercel.
- **`vercel.json`:** routes (`version: 2`, using the legacy `builds`/`routes` config) — `api/index.js` built with `@vercel/node`, `frontend/**` served statically; `/api/*` → the function, `/` and everything else → `frontend/`.
- **`api/index.js`:** re-exports the Express `app` from `backend/server.js` for Vercel's Node runtime.
- **`backend/server.js`:** only calls `.listen()` when run directly (`require.main === module`) — i.e. local dev (`npm start` / `npm run dev` inside `backend/`) — so the same file works as both a standalone server and a serverless handler.
- **Required env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL` — set in `backend/.env` for local dev and in Vercel's Project Settings → Environment Variables for production (see `BACKEND-STATUS.md` §1 for the full manual setup list, including the Supabase-dashboard-only steps).
- No CI/CD pipeline file found (no `.github/workflows`) — deployment is presumably manual `vercel` CLI or Vercel's Git integration.

---

## 9. What's Working vs. Not Working (quick reference)

**Working:**
- Full static site — all 15 pages render, navigate, and are responsive.
- All animation layers (CSS + GSAP).
- Contact/requirement/newsletter forms — client-side validation, submit UX, and correctly POST to the backend.
- Backend Express server — routing, CORS, JSON parsing, input validation, static file serving.
- Vercel deployment wiring (routes, serverless entrypoint).
- **Supabase integration is code-complete**: submissions, newsletter, login, admin-invite accounts, both dashboards. All of it is blocked purely on the manual Supabase setup steps in `BACKEND-STATUS.md` §1 (create project, run schema.sql, fill in URL/key placeholders, bootstrap first admin) — not on any more code.

**Depends on the manual setup steps being done:**
- Forms persisting data (contact leads, newsletter emails) — code is real, needs a live Supabase project behind it.
- Login / invite-acceptance / session management.
- Both dashboards (`my-dashboard.html`, `dashboard.html`) loading real data.
- Admin role gating (`requireAdmin` now does real verification, but needs a real admin row to test against).

---

## 10. Future Improvements / Roadmap

### Immediate — finish the manual Supabase setup (see `BACKEND-STATUS.md` §1)
1. Create the Supabase project, run `supabase/schema.sql`.
2. Fill in `frontend/js/supabase-client.js` and `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`) — locally and in Vercel's env vars.
3. Turn off "Allow new users to sign up" in Supabase Auth settings (defense in depth beyond the app no longer calling `signUp()`).
4. Confirm an email sender is configured so invite emails actually deliver.
5. Bootstrap the first admin by hand, then invite everyone else through `dashboard.html`.

### Before this is safe to put in front of real users
6. **Spam/bot protection** on `POST /api/submissions` and `POST /api/newsletter` — honeypot field and/or rate limiting (e.g. `express-rate-limit`) per IP; both are currently open, unauthenticated, write endpoints.
7. **Email/Slack notification on new submission** — a transactional email service (Resend/SendGrid/Postmark) fired after a successful insert, so leads aren't only visible by manually checking the dashboard.
8. **Tighten CORS** to the production domain once the API is public — currently wide open.
9. Password-reset flow (UI + backend) for existing accounts, and a UI to revoke/resend an invite (SQL Editor / Supabase dashboard only, today).

### Content / positioning
10. Continue auditing every page (not just the homepage hero) for any remaining unsourced operating-fact claims, now that the hero/process pages have been cleaned up — confirm `about.html`, `sustainability.html`, `innovation.html` etc. are fully consistent with the Pakistan-first, pre-entity/pipeline positioning.
11. Keep `EEMMIC-Research-Briefing.txt`'s named companies (Reon Energy, Nizam Energy, etc.) clearly framed as *"how EEMMIC's process would work with them,"* never as existing partners/clients — the file already says this explicitly; make sure site copy doesn't drift from it.

### Design / animation (Active Theory push)
12. Decide, page-by-page, how much WebGL is actually wanted — a full Active Theory-level implementation (Three.js/GLSL shader scenes, canvas-wipe transitions, Lenis smooth-scroll) is a major scope and performance/accessibility tradeoff for a B2B marketing site; GSAP + ScrollTrigger (already added) may be sufficient for most pages, with WebGL reserved for the homepage hero only.
13. If pursuing WebGL: add Three.js via CDN (no build step currently exists, so this stays consistent with the rest of the stack), scope it to hero/showcase moments, and keep `prefers-reduced-motion` and low-end-device fallbacks (the current GSAP layer already respects `prefers-reduced-motion` — extend that convention).
14. Revisit whether a build step (Vite, esbuild) is worth introducing once the animation stack grows — currently everything is CDN `<script>` tags with no bundling/minification/tree-shaking.

### Product scope (Level 2, per `BACKEND-PLAN.md` — explicitly on hold)
15. Only pursue once there's a confirmed decision to actually operate EEMMIC as a business (it is currently AmanorX pipeline/pre-entity): a real projects/bids/deals data model (today only "leads" exist), an admin panel for managing suppliers/projects without touching code, file storage for bid documents and compliance paperwork, and notification flows for suppliers (new project posted) and admins (new bid received).

### Housekeeping
16. Decide the fate of any other unused Supabase projects if this reintegration uses a different project than before.
17. Clarify whether `dist/` + `dist.zip` should be kept as a deploy artifact or removed — it has not been re-synced with this Supabase reintegration and will drift out of sync with `frontend/` if left as-is.

---

## 11. Key Reference Docs (already in the repo)
- `BACKEND-PLAN.md` — the original Level 1 (contact form) vs. Level 2 (full marketplace product) scoping decision.
- `BACKEND-STATUS.md` — detailed backend build log, including the manual Supabase setup steps required to go live.
- `supabase/schema.sql` — the live schema; run manually in the Supabase SQL Editor.
- `EEMMIC-Research-Briefing.txt` — real Pakistani energy-sector companies/regulators, used to ground how EEMMIC's process would work without claiming any existing partnership.
