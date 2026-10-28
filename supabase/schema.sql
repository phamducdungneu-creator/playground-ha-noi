-- Playground VN · Supabase schema
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run again.
--
-- profiles     one row per account (auto-created on sign-up), carries the role
-- family_data  one JSON document per account: the children + their logs, as kept by memberStore

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  role          text not null default 'member' check (role in ('member', 'admin')),
  consent_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.family_data (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  data               jsonb not null default '{}'::jsonb,
  -- the writing device's clock (ms), used to decide which copy is newer
  client_updated_at  bigint not null default 0,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- new account → profile row (display name and consent come from the sign-up form metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, consent_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- members may edit their own profile but never their role / email
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.email is distinct from old.email)
     and not public.is_admin()
     and auth.uid() is not null then
    raise exception 'Không được tự thay đổi quyền hoặc email';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_family_data on public.family_data;
create trigger touch_family_data
  before update on public.family_data
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.family_data enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "family: read own or admin" on public.family_data;
create policy "family: read own or admin" on public.family_data
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "family: insert own" on public.family_data;
create policy "family: insert own" on public.family_data
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "family: update own" on public.family_data;
create policy "family: update own" on public.family_data
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "family: delete own" on public.family_data;
create policy "family: delete own" on public.family_data
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- backfill: accounts created before this script ran
-- ---------------------------------------------------------------------------

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- make yourself admin: sign up on the website first, then run (with your email):
--
--   update public.profiles set role = 'admin' where email = 'ban@example.com';
-- ---------------------------------------------------------------------------
