-- Tu Tiên Demo — Supabase schema.
-- Run once in Dashboard → SQL Editor → New query, then press Run.
--
-- Two tables:
--   profiles : the public game name of an account (unique, case-insensitive)
--   saves    : one JSONB snapshot per player, written by the client every ~5s
--
-- Every row is private to its owner through Row Level Security, so the anon key
-- that ships in the browser can only ever touch the signed-in player's data.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

-- ---- profiles -------------------------------------------------------------

drop policy if exists "profiles are private" on public.profiles;
create policy "profiles are private" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- saves ----------------------------------------------------------------

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own save" on public.saves;
create policy "delete own save" on public.saves
  for delete using (auth.uid() = user_id);

-- ---- auto-create a profile when an account is registered ------------------
-- Anonymous guests have no username yet, so they get their row when they upgrade.

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
begin
  if v_name is null then
    return new;
  end if;
  insert into public.profiles (id, username, username_key)
  values (new.id, v_name, lower(v_name))
  on conflict (id) do update
    set username = excluded.username,
        username_key = excluded.username_key;
  return new;
exception
  -- Losing a username race must not block the account itself; the client shows
  -- the conflict and the player can pick another name from Settings.
  when unique_violation then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- ---- username availability ------------------------------------------------
-- Returns a boolean only, so the browser can check a name without reading others' rows.

create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username_key = lower(btrim(coalesce(candidate, '')))
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
