-- EEMMIC website backend — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).
-- Covers: contact form (contact.html) + newsletter signup (footer, all pages).
--
-- This Supabase project is shared with at least one other site. Tables are
-- prefixed eemmic_ so another site's submissions/newsletter tables (e.g.
-- othersite_submissions) can coexist in the same public schema without
-- colliding. Keep this prefix on any future EEMMIC table added here.
--
-- The backend/ Node server is the only thing that talks to these tables, using
-- the Supabase "service_role" key, which bypasses Row Level Security entirely.
-- RLS is still enabled below with no policies, so if the anon/public key were
-- ever used directly (e.g. from a browser) it would be refused by default —
-- belt and braces even though the browser never touches Supabase directly.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Submissions (contact form, contact.html) — read/updated by the dashboard
-- (dashboard.html) for lead follow-up.
-- ---------------------------------------------------------------------------
create table if not exists public.eemmic_submissions (
  id uuid primary key default gen_random_uuid(),
  sector text not null default 'EEMMIC',
  service text not null check (service in ('evaluation', 'management', 'marketplace', 'investment')),
  name text not null,
  email text not null,
  phone text,
  organisation text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.eemmic_submissions enable row level security;
-- No policies defined: the anon/authenticated roles have zero access.
-- Only the backend's service_role key (or the Supabase dashboard) can touch this table.
-- NOTE: the /api/submissions GET and PATCH routes (used by dashboard.html) have no
-- auth check of their own — they rely entirely on this RLS lockout plus the
-- service_role key staying server-side. Do not expose the backend publicly
-- without adding an auth check in front of those routes.

-- ---------------------------------------------------------------------------
-- Newsletter subscribers
-- ---------------------------------------------------------------------------
create table if not exists public.eemmic_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique
);

alter table public.eemmic_newsletter_subscribers enable row level security;
-- No policies defined: the anon/authenticated roles have zero access.
-- Only the backend's service_role key (or the Supabase dashboard) can touch this table.

-- ---------------------------------------------------------------------------
-- Accounts (login/signup, per-user dashboard, admin dashboard)
--
-- NOTE: Supabase Auth (auth.users) is project-wide, not namespaced per site.
-- Since this project is shared with another site, anyone who signs up here
-- and anyone who signs up on the other site are the SAME pool of accounts
-- (same email = same auth.users row) unless the other site uses a different
-- Supabase project for auth. eemmic_profiles below is EEMMIC-specific data
-- attached to that shared account — it doesn't change who "auth.users" is.
--
-- Roles: buyer | supplier | investor | admin. There is no public signup —
-- every buyer/supplier/investor account is created by an admin from
-- dashboard.html ("Invite a client"), which calls
-- supabase.auth.admin.inviteUserByEmail() with name/organisation/role as
-- signup metadata (see backend/src/routes/users.js). The invitee gets an
-- email with a link to accept-invite.html to set their own password.
-- eemmic_handle_new_user() below reads that metadata to create the profile
-- row, and rejects a self-declared role of 'admin' regardless of who calls
-- it. Admin accounts must be promoted manually: invite the person normally
-- (as buyer/supplier/investor), then in the Supabase SQL Editor run
--   update public.eemmic_profiles set role = 'admin' where email = '...';
-- ---------------------------------------------------------------------------
create table if not exists public.eemmic_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('buyer', 'supplier', 'investor', 'admin')),
  name text not null default '',
  organisation text,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.eemmic_profiles enable row level security;

-- Security-definer helper so policies can check "is this caller an admin"
-- without RLS recursing into eemmic_profiles' own select policy.
create or replace function public.eemmic_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.eemmic_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "eemmic_profiles: read own" on public.eemmic_profiles;
create policy "eemmic_profiles: read own" on public.eemmic_profiles
  for select using (auth.uid() = id);

drop policy if exists "eemmic_profiles: admin reads all" on public.eemmic_profiles;
create policy "eemmic_profiles: admin reads all" on public.eemmic_profiles
  for select using (public.eemmic_is_admin());

create policy "eemmic_profiles: insert own, non-admin role only" on public.eemmic_profiles
  for insert with check (auth.uid() = id and role in ('buyer', 'supplier', 'investor'));

create policy "eemmic_profiles: update own, non-admin role only" on public.eemmic_profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role in ('buyer', 'supplier', 'investor'));

-- Auto-creates a profile row whenever someone signs up through Supabase Auth
-- with role/name/organisation passed as signup metadata (see signup.html /
-- js/signup.js). security definer so it can write regardless of RLS —
-- required because this runs before the new user necessarily has a session
-- (e.g. if email confirmation is turned on for this Supabase project).
-- The role is re-validated here too (not just trusted from metadata) since
-- signUp()'s metadata can be set by anyone calling the Supabase API directly,
-- not only through signup.html — this is what actually blocks a crafted
-- signUp({ options: { data: { role: 'admin' } } }) call from self-granting admin.
create or replace function public.eemmic_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.eemmic_profiles (id, role, name, organisation, email)
  values (
    new.id,
    case
      when new.raw_user_meta_data->>'role' in ('buyer', 'supplier', 'investor')
        then new.raw_user_meta_data->>'role'
      else 'buyer'
    end,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'organisation',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists eemmic_on_auth_user_created on auth.users;
create trigger eemmic_on_auth_user_created
  after insert on auth.users
  for each row execute function public.eemmic_handle_new_user();

-- ---------------------------------------------------------------------------
-- Link submissions to the account that made them, if any. Nullable — the
-- public contact form (contact.html) still works while logged out; the
-- backend attaches user_id only when the request carries a valid session
-- (see backend/src/routes/submissions.js).
-- ---------------------------------------------------------------------------
alter table public.eemmic_submissions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Second, page-specific dropdown on the four stage forms (evaluation.html,
-- management.html, marketplace.html, investment.html) — each page has its
-- own distinct option set (e.g. Evaluation: load profile / track record /
-- regulatory fit; Marketplace: post a requirement / bid / compare bids),
-- so this is intentionally one loosely-typed column rather than four
-- separate ones. Nullable + unconstrained: the <select> in the HTML is
-- what actually controls the value space per page, same as `service` was
-- before it got its own check constraint.
alter table public.eemmic_submissions
  add column if not exists detail text;

create policy "eemmic_submissions: read own" on public.eemmic_submissions
  for select using (auth.uid() = user_id);

create policy "eemmic_submissions: admin reads all" on public.eemmic_submissions
  for select using (public.eemmic_is_admin());

create policy "eemmic_submissions: admin updates all" on public.eemmic_submissions
  for update using (public.eemmic_is_admin());
-- No insert policy for eemmic_submissions: all inserts (contact form and
-- the my-dashboard "new requirement" form) go through the backend's
-- service_role key, which bypasses RLS. Direct client-side inserts stay
-- blocked by default, same as before.

-- ---------------------------------------------------------------------------
-- Investments — an admin-recorded record of what an account has invested in,
-- plus periodic profit/loss entries against it (dashboard.html "Investments"
-- panel). There is no live trading/accounting system behind this: an admin
-- logs each investment and each P&L update by hand, and the account holder
-- reads their own rows directly from Supabase under RLS, same pattern as
-- eemmic_submissions.
-- ---------------------------------------------------------------------------
create table if not exists public.eemmic_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  amount numeric not null,
  currency text not null default 'PKR',
  status text not null default 'active' check (status in ('active', 'exited')),
  invested_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.eemmic_investments enable row level security;

create policy "eemmic_investments: read own" on public.eemmic_investments
  for select using (auth.uid() = user_id);

create policy "eemmic_investments: admin reads all" on public.eemmic_investments
  for select using (public.eemmic_is_admin());
-- No insert/update policy: all writes go through the backend's service_role
-- key (admin-only /api/investments routes), same as eemmic_submissions.

create table if not exists public.eemmic_investment_entries (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.eemmic_investments(id) on delete cascade,
  amount numeric not null,
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.eemmic_investment_entries enable row level security;

create policy "eemmic_investment_entries: read own" on public.eemmic_investment_entries
  for select using (
    exists (
      select 1 from public.eemmic_investments i
      where i.id = investment_id and i.user_id = auth.uid()
    )
  );

create policy "eemmic_investment_entries: admin reads all" on public.eemmic_investment_entries
  for select using (public.eemmic_is_admin());

-- ---------------------------------------------------------------------------
-- Admin panel + client/investor/manager portal extensions.
-- Adds an enquiry-approval workflow (eemmic_submissions.portal_access) and a
-- per-framework "client portal" data model: which portals a client has
-- (eemmic_portal_services), each portal's live dashboard state
-- (eemmic_portal_dashboards/_alerts/_messages/_actions), plus a small
-- eemmic_manager_tasks table for the new manager role. This whole file is
-- idempotent — re-run it in the Supabase SQL Editor to apply.
--
-- 'manager' is a new role alongside the existing buyer/supplier/investor/
-- admin. Like admin, there is no self-service path to it: invite the person
-- normally (as buyer/supplier/investor) via "Invite a client", then promote
-- manually in the SQL Editor:
--   update public.eemmic_profiles set role = 'manager' where email = '...';
-- ---------------------------------------------------------------------------

alter table public.eemmic_profiles drop constraint if exists eemmic_profiles_role_check;
alter table public.eemmic_profiles add constraint eemmic_profiles_role_check
  check (role in ('buyer', 'supplier', 'investor', 'manager', 'admin'));

-- Broaden the original "update own" policy (defined earlier in this file)
-- to include 'manager', so a manager can update their own name from
-- manager-settings.html the same self-service way a buyer/supplier/investor
-- can — still blocks anyone self-granting 'admin' via a direct table write.
drop policy if exists "eemmic_profiles: update own, non-admin role only" on public.eemmic_profiles;
create policy "eemmic_profiles: update own, non-admin role only" on public.eemmic_profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role in ('buyer', 'supplier', 'investor', 'manager'));

alter table public.eemmic_profiles
  add column if not exists is_active boolean not null default true;

-- Enquiry -> portal-access workflow, separate from the existing sales-pipeline
-- `status` column. `status` still tracks new/contacted/qualified/closed for
-- CRM follow-up; `portal_access` tracks whether this enquiry has been turned
-- into (or refused) a client portal account, via the new
-- POST /api/submissions/:id/approve|reject routes.
alter table public.eemmic_submissions
  add column if not exists portal_access text not null default 'none'
    check (portal_access in ('none', 'pending', 'approved', 'rejected'));
alter table public.eemmic_submissions add column if not exists approved_at timestamptz;
alter table public.eemmic_submissions
  add column if not exists approved_by uuid references auth.users(id);
alter table public.eemmic_submissions add column if not exists rejection_reason text;

-- Categories clients pick from when applying for a framework (managed on
-- admin-categories.html).
create table if not exists public.eemmic_enquiry_categories (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('evaluation', 'management', 'marketplace', 'investment')),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.eemmic_enquiry_categories enable row level security;

drop policy if exists "eemmic_enquiry_categories: public reads active" on public.eemmic_enquiry_categories;
create policy "eemmic_enquiry_categories: public reads active" on public.eemmic_enquiry_categories
  for select using (is_active);

drop policy if exists "eemmic_enquiry_categories: admin reads all" on public.eemmic_enquiry_categories;
create policy "eemmic_enquiry_categories: admin reads all" on public.eemmic_enquiry_categories
  for select using (public.eemmic_is_admin());
-- Writes go through the backend's service_role key (admin-only routes).

-- Which framework portal(s) a client account has been granted access to.
-- Created by the admin "approve enquiry" action.
create table if not exists public.eemmic_portal_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.eemmic_submissions(id) on delete set null,
  portal_type text not null check (portal_type in ('evaluation', 'management', 'marketplace', 'investment')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, portal_type)
);

alter table public.eemmic_portal_services enable row level security;

drop policy if exists "eemmic_portal_services: read own" on public.eemmic_portal_services;
create policy "eemmic_portal_services: read own" on public.eemmic_portal_services
  for select using (auth.uid() = user_id);

drop policy if exists "eemmic_portal_services: admin reads all" on public.eemmic_portal_services;
create policy "eemmic_portal_services: admin reads all" on public.eemmic_portal_services
  for select using (public.eemmic_is_admin());
-- Writes go through the backend's service_role key.

-- One row per (account, framework) — the live state behind a framework
-- portal dashboard. `data` holds framework-specific widgets (valuations/risk
-- metrics for evaluation, KPIs/advisory notes for management, listings/
-- traffic/pipeline for marketplace). The investment portal instead reads
-- live from eemmic_investments/eemmic_investment_entries, so its `data` stays '{}'.
create table if not exists public.eemmic_portal_dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portal_type text not null check (portal_type in ('evaluation', 'management', 'marketplace', 'investment')),
  health_score int not null default 0,
  health_components jsonb not null default '{}',
  timeline jsonb not null default '[]',
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, portal_type)
);

alter table public.eemmic_portal_dashboards enable row level security;

drop policy if exists "eemmic_portal_dashboards: read own" on public.eemmic_portal_dashboards;
create policy "eemmic_portal_dashboards: read own" on public.eemmic_portal_dashboards
  for select using (auth.uid() = user_id);

drop policy if exists "eemmic_portal_dashboards: admin reads all" on public.eemmic_portal_dashboards;
create policy "eemmic_portal_dashboards: admin reads all" on public.eemmic_portal_dashboards
  for select using (public.eemmic_is_admin());
-- Writes go through the backend's service_role key: admin edits health/
-- timeline directly, and the client-facing alert-read/action-move/message-
-- post routes are also service_role-mediated so business rules (e.g. "you
-- can only move your own cards") stay server-side rather than in RLS.

create table if not exists public.eemmic_portal_alerts (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.eemmic_portal_dashboards(id) on delete cascade,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.eemmic_portal_alerts enable row level security;

drop policy if exists "eemmic_portal_alerts: read own" on public.eemmic_portal_alerts;
create policy "eemmic_portal_alerts: read own" on public.eemmic_portal_alerts
  for select using (
    exists (
      select 1 from public.eemmic_portal_dashboards d
      where d.id = dashboard_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "eemmic_portal_alerts: admin reads all" on public.eemmic_portal_alerts;
create policy "eemmic_portal_alerts: admin reads all" on public.eemmic_portal_alerts
  for select using (public.eemmic_is_admin());

-- Messages between a client and the EEMMIC team on one portal dashboard.
create table if not exists public.eemmic_portal_messages (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.eemmic_portal_dashboards(id) on delete cascade,
  sender text not null check (sender in ('client', 'firm')),
  subject text,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.eemmic_portal_messages enable row level security;

drop policy if exists "eemmic_portal_messages: read own" on public.eemmic_portal_messages;
create policy "eemmic_portal_messages: read own" on public.eemmic_portal_messages
  for select using (
    exists (
      select 1 from public.eemmic_portal_dashboards d
      where d.id = dashboard_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "eemmic_portal_messages: admin reads all" on public.eemmic_portal_messages;
create policy "eemmic_portal_messages: admin reads all" on public.eemmic_portal_messages
  for select using (public.eemmic_is_admin());
-- Writes (both client and firm sides) go through the backend's service_role
-- key, same as everything else in this section — kept consistent with the
-- alerts/actions tables rather than giving this one table alone a direct
-- client-side insert path.

create table if not exists public.eemmic_portal_actions (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.eemmic_portal_dashboards(id) on delete cascade,
  title text not null,
  assignee text,
  status_column text not null default 'todo' check (status_column in ('todo', 'in_progress', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.eemmic_portal_actions enable row level security;

drop policy if exists "eemmic_portal_actions: read own" on public.eemmic_portal_actions;
create policy "eemmic_portal_actions: read own" on public.eemmic_portal_actions
  for select using (
    exists (
      select 1 from public.eemmic_portal_dashboards d
      where d.id = dashboard_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "eemmic_portal_actions: admin reads all" on public.eemmic_portal_actions;
create policy "eemmic_portal_actions: admin reads all" on public.eemmic_portal_actions
  for select using (public.eemmic_is_admin());

-- Small internal task list for the manager role (manager-tasks.html).
create table if not exists public.eemmic_manager_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.eemmic_manager_tasks enable row level security;
-- No policies: admin + manager access goes entirely through the backend's
-- service_role key (requireRole('admin','manager')-gated routes), same
-- lockout pattern as eemmic_submissions/eemmic_newsletter_subscribers.
