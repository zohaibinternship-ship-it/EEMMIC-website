# EEMMIC Website — Full Project Status

**Last updated:** 2026-08-05
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
| Database | **None currently — stubbed out** | Supabase was removed 2026-08-04; see §4 |
| Hosting target | Vercel | Static `frontend/` + one serverless function for `/api/*` |
| Email/notifications | None | Not built yet |
| Auth | None (stubbed, fails closed) | Was Supabase Auth; removed with the DB |
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
│   ├── js/db-client.js      window.EemmicDB — STUBBED auth/data client (see §4)
│   ├── js/auth.js           shared session/role helpers (requireSession, requireAdmin, logout)
│   ├── js/login.js, signup.js, my-dashboard.js, dashboard.js, nav-auth.js
│   └── assets/              icons, images, logos, videos
├── backend/
│   ├── server.js            Express app: CORS, JSON body parsing, routes, static frontend serving
│   ├── src/db.js             STUB — see §4
│   ├── src/routes/submissions.js   POST / (create lead), GET / (list, admin), PATCH /:id/status (admin)
│   ├── src/routes/newsletter.js    POST / (footer email signup)
│   ├── src/middleware/requireAdmin.js   currently fails closed (HTTP 501)
│   ├── .env / .env.example
│   └── package.json
├── api/index.js            Vercel serverless entrypoint — re-exports backend/server.js's Express app
├── vercel.json              routes /api/* → the function, everything else → frontend/
├── package.json (root)      lets Vercel install backend/'s deps
├── supabase/schema.sql      REFERENCE ONLY — old Supabase schema, kept as the data-model blueprint
├── BACKEND-PLAN.md          original Level 1 (contact form) vs Level 2 (full marketplace product) scoping doc
├── BACKEND-STATUS.md        detailed backend build log/status (Supabase-era, with a removal banner at top)
├── EEMMIC-Research-Briefing.txt   research brief naming real Pakistani energy-sector companies or context
├── dist/                    identical mirror/export of frontend/ (no diff found) — likely a deploy snapshot
└── dist.zip                 zipped copy of dist/
```

`dist/` is byte-for-byte identical to `frontend/` at the time of writing (no diff) — it appears to be a snapshot/export copy rather than a separately maintained build.

---

## 4. Backend / Database — Current State (the most important "what's broken" section)

**Supabase was fully removed on 2026-08-04.** The user's decision was: *"we will make it on a different database"* — not yet chosen. Nothing was ripped out UI-side; instead the whole data layer was **stubbed**:

- **`backend/src/db.js`** — exports a single `notImplemented()` function returning `{ data: null, error: new Error('Database not connected yet...') }`, matching the old Supabase client's response shape. Every route calls this instead of a real query.
- **`backend/src/middleware/requireAdmin.js`** — fails closed, always returns `501 Admin authentication is not connected to a database yet.`
- **`frontend/js/db-client.js`** (`window.EemmicDB`) — browser-side equivalent stub. Exposes `getSession`, `getProfile`, `signInWithPassword`, `signUp`, `signOut`, `fetchOwnSubmissions` — all stubbed to fail/return null with the same method names the old Supabase-backed version used, so `auth.js`/`login.js`/`signup.js`/`my-dashboard.js` didn't need to change.
- All 15 HTML pages were updated to load one script (`js/db-client.js`) instead of the old two Supabase `<script>` tags (CDN + `supabase-client.js`).
- `@supabase/supabase-js` was uninstalled from both `package.json` files.
- `backend/.env`'s `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` were removed from the codebase. **Note: the actual Supabase project itself was not deleted** — its key is unused in code now but may still be worth revoking manually if desired.
- **`supabase/schema.sql` was deliberately kept** (not deleted) purely as a reference for the data model the next database should replicate: `eemmic_submissions`, `eemmic_newsletter_subscribers`, `eemmic_profiles` (roles: buyer/supplier/investor/admin), RLS policies, an admin-check helper function, and a signup trigger.

### Practical effect right now
- **Contact form, stage-specific requirement forms (evaluation/management/marketplace/investment pages), and newsletter signup** all POST correctly to `/api/submissions` / `/api/newsletter`, pass validation, but then hit the stub and return a 500 ("Could not save your message" / "Could not subscribe"). The forms are fully wired end-to-end except for actual storage.
- **Login, signup, both dashboards (`dashboard.html` admin, `my-dashboard.html` per-user) render but cannot authenticate or load real data.**
- **When a new DB is chosen, the integration surface is exactly two files** — `backend/src/db.js` (server-side) and `frontend/js/db-client.js` (browser-side) — plus swapping the `notImplemented()` call sites in `submissions.js`/`newsletter.js`/`requireAdmin.js` for real queries. No route, page, or form structure needs to change.

### Data model (from `supabase/schema.sql`, still the intended shape)
**`eemmic_submissions`**: `id, sector (default 'EEMMIC'), service (evaluation|management|marketplace|investment), name, email, phone, organisation, message, detail, status (new|contacted|qualified|closed), user_id (nullable, links to an account), created_at`

**`eemmic_newsletter_subscribers`**: `id, email (unique), created_at`

**`eemmic_profiles`**: `id (= auth user id), role (buyer|supplier|investor|admin), name, organisation, email, created_at` — role defaults to non-admin on signup; admin can only be granted by hand in the DB, never self-served.

### Backend API surface
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/api/submissions` | public | validates input, then fails at the DB stub |
| GET | `/api/submissions` | admin (currently 501 always) | unreachable until DB + admin auth exist |
| PATCH | `/api/submissions/:id/status` | admin (currently 501 always) | unreachable until DB + admin auth exist |
| POST | `/api/newsletter` | public | validates input, then fails at the DB stub |

### Known gaps even once a DB is wired back up
- No email/Slack notification on new submissions (someone would have to check the dashboard manually).
- No spam/bot protection (no CAPTCHA, no rate limiting) on the two public POST endpoints.
- No password-reset UI.
- No automated migrations — schema changes are applied by hand in whatever DB's console/editor.
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
| `login.html` / `signup.html` | Account auth pages (buyer/supplier/investor roles) |
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
- **Required env vars once a DB is chosen:** none currently set (Supabase's `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` were removed) — whatever the new DB needs will have to be added to Vercel's Project Settings → Environment Variables, and to `backend/.env` locally.
- No CI/CD pipeline file found (no `.github/workflows`) — deployment is presumably manual `vercel` CLI or Vercel's Git integration.

---

## 9. What's Working vs. Not Working (quick reference)

**Working:**
- Full static site — all 15 pages render, navigate, and are responsive.
- All animation layers (CSS + GSAP).
- Contact/requirement/newsletter forms — client-side validation, submit UX (loading state, success/error states), and correctly POST to the backend.
- Backend Express server — routing, CORS, JSON parsing, input validation, static file serving.
- Vercel deployment wiring (routes, serverless entrypoint).

**Not working (blocked entirely on "pick a database"):**
- Any form actually persisting data (contact leads, newsletter emails).
- Login / signup / session management.
- Both dashboards (`my-dashboard.html`, `dashboard.html`) — render shell only, no real data.
- Admin role gating (`requireAdmin` hardcoded to reject everything).

---

## 10. Future Improvements / Roadmap

### Immediate — unblock the backend
1. **Choose the replacement database** (this is the single blocking decision — everything below depends on it). Candidates worth weighing: another Postgres host (Neon, Railway Postgres, Vercel Postgres) to stay close to the existing `schema.sql` shape with minimal rework, vs. a different DB entirely if requirements have changed.
2. Re-implement `backend/src/db.js` (server-side queries) and `frontend/js/db-client.js` (browser auth/session calls) against the chosen DB — these are the only two files that need to change per the stub design.
3. Re-implement `requireAdmin.js` to actually verify a session + admin role.
4. Re-run/port the schema in `supabase/schema.sql` (submissions, newsletter_subscribers, profiles, RLS-equivalent access control, admin-promotion path) to the new DB.

### Before this is safe to put in front of real users
5. **Spam/bot protection** on `POST /api/submissions` and `POST /api/newsletter` — honeypot field and/or rate limiting (e.g. `express-rate-limit`) per IP; both are currently open, unauthenticated, write endpoints.
6. **Email/Slack notification on new submission** — a transactional email service (Resend/SendGrid/Postmark) fired after a successful insert, so leads aren't only visible by manually checking the dashboard.
7. **Tighten CORS** to the production domain once the API is public — currently wide open.
8. Password-reset flow (UI + backend), and decide on email-verification enforcement.

### Content / positioning
9. Continue auditing every page (not just the homepage hero) for any remaining unsourced operating-fact claims, now that the hero/process pages have been cleaned up — confirm `about.html`, `sustainability.html`, `innovation.html` etc. are fully consistent with the Pakistan-first, pre-entity/pipeline positioning.
10. Keep `EEMMIC-Research-Briefing.txt`'s named companies (Reon Energy, Nizam Energy, etc.) clearly framed as *"how EEMMIC's process would work with them,"* never as existing partners/clients — the file already says this explicitly; make sure site copy doesn't drift from it.

### Design / animation (Active Theory push)
11. Decide, page-by-page, how much WebGL is actually wanted — a full Active Theory-level implementation (Three.js/GLSL shader scenes, canvas-wipe transitions, Lenis smooth-scroll) is a major scope and performance/accessibility tradeoff for a B2B marketing site; GSAP + ScrollTrigger (already added) may be sufficient for most pages, with WebGL reserved for the homepage hero only.
12. If pursuing WebGL: add Three.js via CDN (no build step currently exists, so this stays consistent with the rest of the stack), scope it to hero/showcase moments, and keep `prefers-reduced-motion` and low-end-device fallbacks (the current GSAP layer already respects `prefers-reduced-motion` — extend that convention).
13. Revisit whether a build step (Vite, esbuild) is worth introducing once the animation stack grows — currently everything is CDN `<script>` tags with no bundling/minification/tree-shaking.

### Product scope (Level 2, per `BACKEND-PLAN.md` — explicitly on hold)
14. Only pursue once there's a confirmed decision to actually operate EEMMIC as a business (it is currently AmanorX pipeline/pre-entity): real user accounts across buyer/supplier/investor/admin roles with distinct permissions, a real projects/bids/deals data model (today only "leads" exist), an admin panel for managing suppliers/projects without touching code, file storage for bid documents and compliance paperwork, and notification flows for suppliers (new project posted) and admins (new bid received).

### Housekeeping
15. No git repository exists yet for this project — consider initializing one (`git init`) once ready, since there's currently no version history or rollback safety net for any of this work.
16. Decide the fate of the still-live-but-unused Supabase project — its keys were removed from code but the project itself was never deleted/revoked.
17. Clarify whether `dist/` + `dist.zip` (currently an exact mirror of `frontend/`) should be kept as a deploy artifact or removed, since there's no build step generating it and it risks drifting out of sync with `frontend/` if only one copy gets edited going forward.

---

## 11. Key Reference Docs (already in the repo)
- `BACKEND-PLAN.md` — the original Level 1 (contact form) vs. Level 2 (full marketplace product) scoping decision.
- `BACKEND-STATUS.md` — detailed backend build log, Supabase-era, with a banner at the top flagging the removal.
- `supabase/schema.sql` — kept as the data-model reference for the next database.
- `EEMMIC-Research-Briefing.txt` — real Pakistani energy-sector companies/regulators, used to ground how EEMMIC's process would work without claiming any existing partnership.
