-- Run after schema.sql. Latest successful claim owns this account across all maps/devices.
begin;
create table if not exists public.game_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  instance_id uuid not null,
  auth_session_id text not null,
  claimed_at timestamptz not null default clock_timestamp()
);
alter table public.game_sessions enable row level security;
revoke all on public.game_sessions from anon, authenticated;
grant select on public.game_sessions to authenticated;
drop policy if exists "read own active session" on public.game_sessions;
create policy "read own active session" on public.game_sessions
  for select to authenticated using (user_id=auth.uid());

create or replace function public.claim_game_session(p_instance_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid := auth.uid(); v_auth text := auth.jwt()->>'session_id';
begin
  if v_user is null or v_auth is null or p_instance_id is null then
    raise exception 'Unauthenticated game session';
  end if;
  insert into public.game_sessions(user_id,instance_id,auth_session_id)
    values(v_user,p_instance_id,v_auth)
    on conflict(user_id) do update set instance_id=excluded.instance_id,
      auth_session_id=excluded.auth_session_id,claimed_at=clock_timestamp();
  return true;
end $$;

create or replace function public.check_game_session(p_instance_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.game_sessions where user_id=auth.uid()
    and instance_id=p_instance_id and auth_session_id=auth.jwt()->>'session_id');
$$;

-- Lock the same row as claim: an old in-flight save must finish BEFORE the new
-- claim, or be rejected AFTER it. It cannot overwrite the new player's progress.
create or replace function public.save_game_snapshot(p_instance_id uuid,p_snapshot jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_session public.game_sessions%rowtype;
begin
  select * into v_session from public.game_sessions where user_id=auth.uid() for update;
  if not found or v_session.instance_id is distinct from p_instance_id
    or v_session.auth_session_id is distinct from (auth.jwt()->>'session_id') then
    raise exception 'SESSION_REPLACED';
  end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'Invalid save'; end if;
  insert into public.saves(user_id,data,updated_at) values(auth.uid(),p_snapshot,clock_timestamp())
    on conflict(user_id) do update set data=excluded.data,updated_at=excluded.updated_at;
  return true;
end $$;

create or replace function public.delete_game_snapshot(p_instance_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_session public.game_sessions%rowtype;
begin
  select * into v_session from public.game_sessions where user_id=auth.uid() for update;
  if not found or v_session.instance_id is distinct from p_instance_id
    or v_session.auth_session_id is distinct from (auth.jwt()->>'session_id') then
    raise exception 'SESSION_REPLACED';
  end if;
  delete from public.saves where user_id=auth.uid();
  return true;
end $$;

-- Client writes go through the guarded RPCs. Existing owner-only reads remain.
revoke insert,update,delete on public.saves from anon,authenticated;
revoke all on function public.claim_game_session(uuid),public.check_game_session(uuid),
  public.save_game_snapshot(uuid,jsonb),public.delete_game_snapshot(uuid) from public,anon;
grant execute on function public.claim_game_session(uuid),public.check_game_session(uuid),
  public.save_game_snapshot(uuid,jsonb),public.delete_game_snapshot(uuid) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename='game_sessions') then
    alter publication supabase_realtime add table public.game_sessions;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
