-- ---------------------------------------------------------------------------
-- Remaining portal-system migration (not yet run against the live project).
-- This is an exact copy of supabase/schema.sql lines 239-456 — the block the
-- user confirmed on 2026-08-08 they had NOT run yet (they'd only run the
-- earlier eemmic_investments/eemmic_investment_entries tables).
--
-- Adds an enquiry-approval workflow (eemmic_submissions.portal_access) and a
-- per-framework "client portal" data model: which portals a client has
-- (eemmic_portal_services), each portal's live dashboard state
-- (eemmic_portal_dashboards/_alerts/_messages/_actions), plus a small
-- eemmic_manager_tasks table for the new manager role. This whole file is
-- idempotent — paste it into the Supabase SQL Editor and run it.
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

-- Broaden the original "update own" policy (defined earlier in schema.sql)
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
