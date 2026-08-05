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
-- Roles: buyer | supplier | investor | admin. Public signup (signup.html)
-- can only ever create buyer/supplier/investor rows — the insert/update
-- policies below and the eemmic_handle_new_user() trigger both reject a
-- self-declared role of 'admin'. Admin accounts must be promoted manually:
-- sign up normally, then in the Supabase SQL Editor run
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

create policy "eemmic_profiles: read own" on public.eemmic_profiles
  for select using (auth.uid() = id);

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
