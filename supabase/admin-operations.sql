-- Run after admin-dashboard.sql, single-session.sql and alphatest-mail.sql.
begin;
create table if not exists public.game_server_control (
 id boolean primary key default true check(id), maintenance boolean not null default false,
 message text not null default '', version integer not null default 0
);
insert into public.game_server_control(id) values(true) on conflict do nothing;
alter table public.game_server_control add column if not exists maintenance_at timestamptz;
create table if not exists public.game_account_blocks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null, created_at timestamptz not null default now()
);
create table if not exists public.game_admin_catalog (
 kind text not null, id text not null, data jsonb not null, primary key(kind,id)
);
create table if not exists public.admin_commands (
 id uuid primary key, actor uuid references auth.users(id) on delete set null,
 kind text not null, target uuid, payload jsonb not null, reason text not null,
 status text not null default 'done' check(status in ('pending','done')),
 result jsonb, created_at timestamptz not null default now()
);
create unique index if not exists admin_auth_pending_target on public.admin_commands(target)
 where status='pending' and kind like 'auth_%';
create table if not exists public.admin_save_backups (
 command_id uuid not null references public.admin_commands(id), user_id uuid not null,
 data jsonb not null, created_at timestamptz not null default now(), primary key(command_id,user_id)
);
create table if not exists public.game_boss_resets (
 map_id text not null, monster_id text not null, revision integer not null default 1,
 primary key(map_id,monster_id)
);
alter table public.game_server_control enable row level security;
alter table public.game_account_blocks enable row level security;
alter table public.game_admin_catalog enable row level security;
alter table public.admin_commands enable row level security;
alter table public.admin_save_backups enable row level security;
alter table public.game_boss_resets enable row level security;
revoke all on public.game_server_control,public.game_account_blocks,public.game_admin_catalog,public.admin_commands,public.admin_save_backups,public.game_boss_resets from public,anon,authenticated;

-- Keep audit/financial records when Auth removes an account.
alter table public.premium_ledger alter column user_id drop not null;
alter table public.premium_ledger drop constraint if exists premium_ledger_user_id_fkey;
alter table public.premium_ledger add constraint premium_ledger_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null;
alter table public.premium_ledger drop constraint if exists premium_ledger_actor_fkey;
alter table public.premium_ledger add constraint premium_ledger_actor_fkey foreign key(actor) references auth.users(id) on delete set null;
alter table public.admin_audit_logs alter column actor drop not null;
alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_actor_fkey;
alter table public.admin_audit_logs add constraint admin_audit_logs_actor_fkey foreign key(actor) references auth.users(id) on delete set null;
alter table public.admin_event_plans alter column updated_by drop not null;
alter table public.admin_event_plans drop constraint if exists admin_event_plans_updated_by_fkey;
alter table public.admin_event_plans add constraint admin_event_plans_updated_by_fkey foreign key(updated_by) references auth.users(id) on delete set null;
alter table public.game_mail_campaigns drop constraint if exists game_mail_campaigns_updated_by_fkey;
alter table public.game_mail_campaigns add constraint game_mail_campaigns_updated_by_fkey foreign key(updated_by) references auth.users(id) on delete set null;

alter table public.saves add column if not exists admin_revision integer not null default 0;
create or replace function public.guard_admin_save_revision() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$ declare expected integer; raw text; begin
 if tg_op='INSERT' then
  select admin_revision into expected from public.saves where user_id=new.user_id;
  if found then new.admin_revision:=expected; else expected:=new.admin_revision; end if;
 else expected:=new.admin_revision; end if;
 raw:=coalesce(new.data#>>'{player,adminRevision}','0');
 if raw!~'^\d{1,9}$' or raw::integer<>expected then raise exception 'ADMIN_SAVE_STALE'; end if;
 return new;
end $$;
drop trigger if exists enforce_admin_save_revision on public.saves;
create trigger enforce_admin_save_revision before insert or update of data,admin_revision on public.saves for each row execute function public.guard_admin_save_revision();
revoke all on function public.guard_admin_save_revision() from public,anon,authenticated;

create or replace function public.game_access_allowed(p_user uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select p_user is not null and exists(select 1 from auth.users where id=p_user)
 and not exists(select 1 from public.game_account_blocks where user_id=p_user)
 and exists(select 1 from public.game_server_control where id and (not maintenance or maintenance_at>clock_timestamp()));
$$;
revoke all on function public.game_access_allowed(uuid) from public,anon,authenticated;
create or replace function public.claim_game_session(p_instance_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$ declare u uuid:=auth.uid(); a text:=auth.jwt()->>'session_id'; begin
 if u is null or a is null or p_instance_id is null then raise exception 'Unauthenticated game session'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,42));
 if not public.game_access_allowed(u) then raise exception 'GAME_ACCESS_BLOCKED'; end if;
 insert into public.game_sessions(user_id,instance_id,auth_session_id) values(u,p_instance_id,a)
 on conflict(user_id) do update set instance_id=excluded.instance_id,auth_session_id=excluded.auth_session_id,claimed_at=clock_timestamp();
 return true;
end $$;
create or replace function public.check_game_session(p_instance_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.game_access_allowed(auth.uid()) and exists(select 1 from public.game_sessions where user_id=auth.uid() and instance_id=p_instance_id and auth_session_id=auth.jwt()->>'session_id');
$$;
create or replace function public.save_game_snapshot(p_instance_id uuid,p_snapshot jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$ declare s public.game_sessions; begin
 if auth.uid() is null then raise exception 'SESSION_REPLACED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 select * into s from public.game_sessions where user_id=auth.uid() for update;
 if not found or s.instance_id is distinct from p_instance_id or s.auth_session_id is distinct from (auth.jwt()->>'session_id') or not public.game_access_allowed(auth.uid()) then raise exception 'SESSION_REPLACED'; end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'Invalid save'; end if;
 insert into public.saves(user_id,data,updated_at) values(auth.uid(),p_snapshot,clock_timestamp()) on conflict(user_id) do update set data=excluded.data,updated_at=excluded.updated_at;
 return true;
end $$;
create or replace function public.delete_game_snapshot(p_instance_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$ declare s public.game_sessions; begin
 if auth.uid() is null then raise exception 'SESSION_REPLACED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 select * into s from public.game_sessions where user_id=auth.uid() for update;
 if not found or s.instance_id is distinct from p_instance_id or s.auth_session_id is distinct from (auth.jwt()->>'session_id') or not public.game_access_allowed(auth.uid()) then raise exception 'SESSION_REPLACED'; end if;
 delete from public.saves where user_id=auth.uid(); return true;
end $$;

create or replace function public.game_control_status(p_map text default '') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 return (select to_jsonb(c)||jsonb_build_object('admin',public.is_game_admin(),'blocked',exists(select 1 from public.game_account_blocks where user_id=auth.uid()),
 'boss_resets',coalesce((select jsonb_agg(to_jsonb(r)) from public.game_boss_resets r where map_id=p_map),'[]'::jsonb)) from public.game_server_control c where id);
end $$;
create or replace function public.admin_operations_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 perform public.admin_dashboard_require_access();
 return (select to_jsonb(c)||jsonb_build_object('item_delivery',case when to_regprocedure('public.admin_queue_item_mail(uuid,uuid,jsonb,text)') is null then 'unavailable' else 'mail' end,'maintenance_notice_seconds',300,'bosses',coalesce((select jsonb_agg(data||jsonb_build_object('id',id)) from public.game_admin_catalog where kind='boss'),'[]'::jsonb),
 'pending_auth',coalesce((select jsonb_agg(to_jsonb(j)) from (select id,kind,target,payload,reason,created_at from public.admin_commands where actor=auth.uid() and status='pending' and kind like 'auth_%' order by created_at limit 50) j),'[]'::jsonb)) from public.game_server_control c where id);
end $$;
create or replace function public.admin_read_snapshot(p_user uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 perform public.admin_dashboard_require_access();
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 return jsonb_build_object('snapshot',(select data from public.saves where user_id=p_user),'token',(select md5(data::text) from public.saves where user_id=p_user),
 'blocked',exists(select 1 from public.game_account_blocks where user_id=p_user),'protected',exists(select 1 from public.game_admins where user_id=p_user),
 'backups',coalesce((select jsonb_agg(to_jsonb(b)) from (select command_id,created_at from public.admin_save_backups where user_id=p_user order by created_at desc limit 5) b),'[]'::jsonb));
end $$;
create or replace function public.admin_read_backup(p_id uuid,p_user uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare d jsonb; begin
 perform public.admin_dashboard_require_access();
 select data into d from public.admin_save_backups where command_id=p_id and user_id=p_user;
 if not found then raise exception 'BACKUP_NOT_FOUND'; end if; return d;
end $$;

create or replace function public.admin_validate_snapshot(p_data jsonb,p_old jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$ declare p jsonb:=p_data->'player'; k text; v jsonb; begin
 if p_data is null or octet_length(p_data::text)>524288 or (p_data->>'v') is distinct from '1' or jsonb_typeof(p) is distinct from 'object'
 or jsonb_typeof(p_data->'quests') is distinct from 'object' or jsonb_typeof(p->'inventory') is distinct from 'object' or jsonb_typeof(p->'equipment') is distinct from 'object'
 or p->>'name' is distinct from p_old#>>'{player,name}' then raise exception 'INVALID_ADMIN_SAVE'; end if;
 foreach k in array array['level','exp','realmIndex','hp','mp','linhKhi'] loop
  if coalesce(p->>k,'')!~'^\d{1,12}$' then raise exception 'INVALID_ADMIN_SAVE'; end if;
 end loop;
 if (p->>'level')::integer not between 1 and 120 or (p->>'realmIndex')::integer<>((p->>'level')::integer-1)/10
 or not exists(select 1 from public.game_admin_catalog where kind='map' and id=p_data->>'mapId') then raise exception 'INVALID_ADMIN_SAVE'; end if;
 if coalesce(p->>'sex','') not in ('male','female') or (p ? 'heroId' and not exists(select 1 from public.game_admin_catalog where kind='hero' and id=p->>'heroId'))
 or (p ? 'admitted' and jsonb_typeof(p->'admitted') is distinct from 'boolean') or (p->>'hp')::bigint>10000000 or (p->>'mp')::bigint>10000000 then raise exception 'INVALID_ADMIN_SAVE'; end if;
 for k,v in select * from jsonb_each(p->'inventory') loop
  if v::text!~'^\d{1,9}$' or not exists(select 1 from public.game_admin_catalog where kind='item' and id=split_part(k,'~',1)) then raise exception 'INVALID_ADMIN_INVENTORY'; end if;
 end loop;
 for k,v in select * from jsonb_each(p->'equipment') loop
  if v='null'::jsonb then continue; end if;
  if not exists(select 1 from public.game_admin_catalog where kind='item' and id=split_part(v#>>'{}','~',1) and data->>'slot'=k)
  or coalesce((p->'inventory'->>(v#>>'{}'))::integer,0)<1 then raise exception 'INVALID_ADMIN_EQUIPMENT'; end if;
 end loop;
 if (p_data#>>'{player,mailRevision}') is distinct from (p_old#>>'{player,mailRevision}') then raise exception 'INVALID_ADMIN_SAVE'; end if;
end $$;
revoke all on function public.admin_validate_snapshot(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.admin_apply_command(p_id uuid,p_kind text,p_user uuid,p_payload jsonb,p_reason text,p_confirm text,p_token text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare cmd public.admin_commands; s public.saves; d jsonb; p jsonb; inv jsonb; item text; base text; meta jsonb; qty integer; n bigint; key text; r record; affected integer:=0; v_result jsonb; begin
 perform public.admin_dashboard_require_access();
 if p_id is null or length(btrim(coalesce(p_reason,''))) not between 3 and 500 or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'INVALID_COMMAND'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,90));
 select * into cmd from public.admin_commands where id=p_id for update;
 if found then
  if cmd.actor is distinct from auth.uid() or cmd.kind<>p_kind or cmd.target is distinct from p_user or cmd.payload is distinct from p_payload or cmd.reason<>p_reason then raise exception 'REQUEST_CONFLICT'; end if;
  return cmd.result||jsonb_build_object('duplicate',true);
 end if;
 if p_kind not in ('item_grant','item_remove','save_edit','maintenance','boss_reset','dungeon_reset') then raise exception 'INVALID_COMMAND'; end if;
 if (p_user is null and p_confirm is distinct from 'TOAN SERVER') or (p_user is not null and p_confirm is distinct from p_user::text) then raise exception 'CONFIRMATION_REQUIRED'; end if;
 insert into public.admin_commands(id,actor,kind,target,payload,reason) values(p_id,auth.uid(),p_kind,p_user,p_payload,p_reason);
 if p_kind='maintenance' then
  if p_user is not null or jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' or length(coalesce(p_payload->>'message',''))>500 then raise exception 'INVALID_COMMAND'; end if;
  update public.game_server_control set maintenance=(p_payload->>'enabled')::boolean,message=coalesce(p_payload->>'message',''),
   maintenance_at=case when (p_payload->>'enabled')::boolean then clock_timestamp()+interval '5 minutes' else null end,version=version+1 where id;
 elsif p_kind='item_grant' then
  if to_regprocedure('public.admin_queue_item_mail(uuid,uuid,jsonb,text)') is null then raise exception 'MAIL_DELIVERY_NOT_INSTALLED'; end if;
  v_result:=public.admin_queue_item_mail(p_id,p_user,p_payload,p_reason);
  affected:=1;
 elsif p_kind='boss_reset' then
  if p_user is not null or not exists(select 1 from public.game_admin_catalog where kind='boss' and id=(p_payload->>'map')||':'||(p_payload->>'monster')) then raise exception 'INVALID_BOSS'; end if;
  insert into public.game_boss_resets(map_id,monster_id) values(p_payload->>'map',p_payload->>'monster') on conflict(map_id,monster_id) do update set revision=game_boss_resets.revision+1;
 else
  if p_kind in ('item_grant','item_remove','save_edit') and p_user is null then raise exception 'ACCOUNT_REQUIRED'; end if;
  if p_user is not null and not exists(select 1 from auth.users where id=p_user) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if p_kind='dungeon_reset' and coalesce(p_payload->>'dungeon','')<>'all' and not exists(select 1 from public.game_admin_catalog where kind='dungeon' and id=p_payload->>'dungeon') then raise exception 'INVALID_DUNGEON'; end if;
  for r in select user_id from public.saves where p_user is null or user_id=p_user order by user_id loop
   perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,42));
   perform 1 from public.game_sessions where user_id=r.user_id for update;
   select * into s from public.saves where user_id=r.user_id for update;
   if p_user is not null and (p_token is null or md5(s.data::text)<>p_token) then raise exception 'SAVE_CONFLICT'; end if;
   insert into public.admin_save_backups(command_id,user_id,data) values(p_id,r.user_id,s.data);
   d:=s.data; p:=d->'player'; inv:=coalesce(p->'inventory','{}'::jsonb);
   if p_kind='item_remove' then
    item:=p_payload->>'item'; base:=split_part(item,'~',1);
    select data into meta from public.game_admin_catalog where kind='item' and id=base;
    if meta is null or coalesce(p_payload->>'quantity','')!~'^\d{1,6}$' then raise exception 'INVALID_ITEM'; end if;
    qty:=(p_payload->>'quantity')::integer;
    if qty not between 1 and 100000 or (meta ? 'slot' and qty>100) then raise exception 'INVALID_QUANTITY'; end if;
    if base='tien_phap_bao' then
     if qty<>1 or item<>base then raise exception 'INVALID_QUANTITY'; end if;
     delete from public.premium_entitlements where user_id=r.user_id and item_id=base; inv:=inv-base;
    elsif base='linh_khi' then
     n:=coalesce((p->>'linhKhi')::bigint,0);
     if n<qty then raise exception 'INSUFFICIENT_ITEM'; end if;
     p:=p||jsonb_build_object('linhKhi',n-qty);
    else
     n:=coalesce((inv->>item)::bigint,0);
     if n<qty then raise exception 'INSUFFICIENT_ITEM'; end if;
     n:=n-qty;
     inv:=case when n=0 then inv-item else inv||jsonb_build_object(item,n) end;
    end if;
    if not inv ? item then
     p:=jsonb_set(p,'{equipment}',coalesce((select jsonb_object_agg(e.key,e.value) from jsonb_each(coalesce(p->'equipment','{}')) e where e.value#>>'{}'<>item),'{}'));
     if jsonb_typeof(p#>'{adventure,enhancements}')='object' then p:=jsonb_set(p,'{adventure,enhancements}',(p#>'{adventure,enhancements}')-item); end if;
    end if;
    p:=p||jsonb_build_object('inventory',inv);
   elsif p_kind='save_edit' then
    perform public.admin_validate_snapshot(p_payload->'snapshot',s.data);
    d:=p_payload->'snapshot'; p:=d->'player';
    if coalesce((p#>>'{inventory,tien_phap_bao}')::integer,0)>0 and not exists(select 1 from public.premium_entitlements where user_id=r.user_id and item_id='tien_phap_bao') then raise exception 'PREMIUM_ENTITLEMENT_REQUIRED'; end if;
   elsif p_kind='dungeon_reset' then
    if p ? 'dungeons' and jsonb_typeof(p->'dungeons')='object' then
     p:=jsonb_set(p,'{dungeons,runs}',case when p_payload->>'dungeon'='all' then '{}'::jsonb else coalesce(p#>'{dungeons,runs}','{}')-(p_payload->>'dungeon') end);
    end if;
   end if;
   p:=p||jsonb_build_object('adminRevision',s.admin_revision+1);
   d:=jsonb_set(d,'{player}',p)||jsonb_build_object('savedAt',floor(extract(epoch from clock_timestamp())*1000));
   update public.saves set data=d,admin_revision=s.admin_revision+1,updated_at=clock_timestamp() where user_id=r.user_id;
   delete from public.game_sessions where user_id=r.user_id;
   affected:=affected+1;
  end loop;
  if affected=0 and p_kind<>'dungeon_reset' then raise exception 'SAVE_NOT_FOUND'; end if;
 end if;
 v_result:=coalesce(v_result,'{}'::jsonb)||jsonb_build_object('ok',true,'affected',affected,'command',p_id);
 update public.admin_commands set result=v_result where id=p_id;
 insert into public.admin_audit_logs(actor,kind,message,details) values(auth.uid(),p_kind,p_reason,jsonb_build_object('command',p_id,'target',p_user,'affected',affected,'payload',case when p_kind='save_edit' then jsonb_build_object('backup',true) else p_payload end));
 return v_result;
end $$;

-- Auth is performed by the Edge Function with the service role. No password is stored.
create or replace function public.admin_prepare_auth(p_id uuid,p_kind text,p_user uuid,p_payload jsonb,p_reason text,p_confirm text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare c public.admin_commands; target_id uuid; begin
 perform public.admin_dashboard_require_access();
 if p_id is null or p_kind not in ('auth_create','auth_delete','auth_ban','auth_unban') or length(btrim(coalesce(p_reason,''))) not between 3 and 500
 or jsonb_typeof(p_payload) is distinct from 'object' or p_payload ? 'password' then raise exception 'INVALID_AUTH_COMMAND'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,90));
 select * into c from public.admin_commands where id=p_id for update;
 if found then
  if c.actor is distinct from auth.uid() or c.kind<>p_kind or c.payload is distinct from p_payload or c.reason<>p_reason or (p_kind<>'auth_create' and c.target is distinct from p_user) then raise exception 'REQUEST_CONFLICT'; end if;
  return to_jsonb(c);
 end if;
 target_id:=case when p_kind='auth_create' then p_id else p_user end;
 if target_id is null or (p_kind<>'auth_create' and p_confirm is distinct from target_id::text) then raise exception 'CONFIRMATION_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_id::text,42));
 if target_id=auth.uid() or exists(select 1 from public.game_admins where user_id=target_id) then raise exception 'PROTECTED_ADMIN'; end if;
 if p_kind<>'auth_create' and not exists(select 1 from auth.users where id=target_id) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 if p_kind='auth_create' and (coalesce(p_payload->>'username','')!~'^[[:alnum:]_.]{3,16}$' or coalesce(p_payload->>'email','')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or exists(select 1 from public.profiles where username_key=lower(p_payload->>'username'))) then raise exception 'USERNAME_UNAVAILABLE'; end if;
 insert into public.admin_commands(id,actor,kind,target,payload,reason,status) values(p_id,auth.uid(),p_kind,target_id,p_payload,p_reason,'pending') returning * into c;
 if p_kind in ('auth_ban','auth_delete') then
  insert into public.game_account_blocks(user_id,reason) values(target_id,p_reason) on conflict(user_id) do update set reason=excluded.reason;
  delete from public.game_sessions where user_id=target_id;
 end if;
 insert into public.admin_audit_logs(actor,kind,message,details) values(auth.uid(),'auth_pending',p_reason,jsonb_build_object('command',p_id,'kind',p_kind,'target',target_id));
 return to_jsonb(c);
end $$;
create or replace function public.admin_finish_auth(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare c public.admin_commands; begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'SERVICE_REQUIRED'; end if;
 select * into c from public.admin_commands where id=p_id for update;
 if not found or c.kind not like 'auth_%' then raise exception 'COMMAND_NOT_FOUND'; end if;
 if c.status='done' then return c.result; end if;
 if c.kind='auth_unban' then delete from public.game_account_blocks where user_id=c.target; end if;
 if c.kind='auth_create' and not exists(select 1 from public.profiles where id=c.target and username_key=lower(c.payload->>'username')) then raise exception 'USERNAME_UNAVAILABLE'; end if;
 update public.admin_commands set status='done',result=jsonb_build_object('ok',true,'target',c.target,'command',p_id) where id=p_id returning * into c;
 insert into public.admin_audit_logs(actor,kind,message,details) values(c.actor,c.kind,c.reason,jsonb_build_object('command',p_id,'target',c.target));
 return c.result;
end $$;
revoke all on function public.admin_finish_auth(uuid) from public,anon,authenticated;
grant execute on function public.admin_finish_auth(uuid) to service_role;
revoke all on function public.game_control_status(text),public.admin_operations_status(),public.admin_read_snapshot(uuid),public.admin_read_backup(uuid,uuid),public.admin_apply_command(uuid,text,uuid,jsonb,text,text,text),public.admin_prepare_auth(uuid,text,uuid,jsonb,text,text) from public,anon;
grant execute on function public.game_control_status(text),public.admin_operations_status(),public.admin_read_snapshot(uuid),public.admin_read_backup(uuid,uuid),public.admin_apply_command(uuid,text,uuid,jsonb,text,text,text),public.admin_prepare_auth(uuid,text,uuid,jsonb,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
