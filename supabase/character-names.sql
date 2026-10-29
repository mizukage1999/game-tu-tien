-- Run after schema.sql and single-session.sql. Names are unique across this server.
begin;

create or replace function public.character_name_clean(p_name text)
returns text language sql immutable set search_path=public,pg_temp as $$
  select normalize(btrim(regexp_replace(coalesce(p_name,''),
    U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+',' ','g')),NFC);
$$;

create table if not exists public.character_names (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  name_key text not null unique,
  created_at timestamptz not null default clock_timestamp(),
  -- Keep legacy names; the reservation RPC and save trigger enforce >=6 for new characters.
  check (char_length(name) between 1 and 16)
);
alter table public.character_names enable row level security;
revoke all on public.character_names from anon,authenticated;

-- Retain the oldest existing name. Resolve old duplicates deterministically,
-- preserving all other progress. Re-running this migration preserves reservations.
do $$
declare s record; v_name text; v_base text; v_attempt integer; v_taken boolean;
begin
  for s in select user_id,data from public.saves order by updated_at,user_id loop
    select name into v_name from public.character_names where user_id=s.user_id;
    if not found then
      v_base := public.character_name_clean(s.data#>>'{player,name}');
      if char_length(v_base) not between 1 and 16 then v_base := 'Đạo Hữu'; end if;
      v_name := v_base;
      v_attempt := 0;
      loop
        v_taken := false;
        begin
          insert into public.character_names(user_id,name,name_key)
            values(s.user_id,v_name,lower(v_name));
        exception when unique_violation then v_taken := true;
        end;
        exit when not v_taken;
        v_attempt := v_attempt+1;
        v_name := left(v_base,6)||'·'||left(replace(s.user_id::text,'-',''),6)||v_attempt::text;
      end loop;
    end if;
    if s.data#>>'{player,name}' is distinct from v_name then
      update public.saves set data=jsonb_set(data,'{player,name}',to_jsonb(v_name))
        where user_id=s.user_id;
    end if;
  end loop;
end $$;

create or replace function public.claim_character_name(p_name text,p_instance_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_session public.game_sessions%rowtype; v_name text;
begin
  select * into v_session from public.game_sessions where user_id=auth.uid() for update;
  if not found or v_session.instance_id is distinct from p_instance_id
    or v_session.auth_session_id is distinct from (auth.jwt()->>'session_id')
    or not public.check_game_session(p_instance_id) then
    raise exception 'SESSION_REPLACED';
  end if;
  v_name := public.character_name_clean(p_name);
  if char_length(v_name) not between 6 and 16
    or v_name ~ '[[:cntrl:]]' or v_name ~ U&'[\200B-\200F\202A-\202E\2060-\206F\FEFF]' then
    raise exception 'INVALID_CHARACTER_NAME';
  end if;
  if exists(select 1 from public.saves where user_id=auth.uid()) then
    raise exception 'CHARACTER_ALREADY_EXISTS';
  end if;
  begin
    insert into public.character_names(user_id,name,name_key) values(auth.uid(),v_name,lower(v_name))
      on conflict(user_id) do update set name=excluded.name,name_key=excluded.name_key;
  exception when unique_violation then
    raise exception 'CHARACTER_NAME_TAKEN';
  end;
  return v_name;
end $$;

-- Every snapshot write (including old clients) obeys the same unique registry.
create or replace function public.guard_character_save_name()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_name text; v_reserved text;
begin
  v_name := public.character_name_clean(new.data#>>'{player,name}');
  if char_length(v_name) not between 1 and 16
    or v_name ~ '[[:cntrl:]]' or v_name ~ U&'[\200B-\200F\202A-\202E\2060-\206F\FEFF]' then
    raise exception 'INVALID_CHARACTER_NAME';
  end if;
  select name into v_reserved from public.character_names where user_id=new.user_id for update;
  if not found then
    if char_length(v_name)<6 then raise exception 'INVALID_CHARACTER_NAME'; end if;
    begin
      insert into public.character_names(user_id,name,name_key) values(new.user_id,v_name,lower(v_name));
      v_reserved := v_name;
    exception when unique_violation then raise exception 'CHARACTER_NAME_TAKEN';
    end;
  end if;
  if char_length(v_name)<6 and not exists(select 1 from public.saves where user_id=new.user_id) then raise exception 'INVALID_CHARACTER_NAME';end if;
  if v_name is distinct from v_reserved then raise exception 'CHARACTER_NAME_MISMATCH'; end if;
  new.data := jsonb_set(new.data,'{player,name}',to_jsonb(v_reserved));
  return new;
end $$;
drop trigger if exists enforce_character_save_name on public.saves;
create trigger enforce_character_save_name before insert or update of data on public.saves
  for each row execute function public.guard_character_save_name();

create or replace function public.release_deleted_character_name()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.character_names where user_id=old.user_id;
  return old;
end $$;
drop trigger if exists release_character_name on public.saves;
create trigger release_character_name after delete on public.saves
  for each row execute function public.release_deleted_character_name();

revoke all on function public.claim_character_name(text,uuid) from public,anon;
grant execute on function public.claim_character_name(text,uuid) to authenticated;
revoke all on function public.guard_character_save_name(),public.release_deleted_character_name() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
