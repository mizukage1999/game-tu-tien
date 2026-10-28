-- Run after schema.sql and combat-expansion.sql. No service-role key in the browser.
begin;
create table if not exists public.admin_event_plans (
 id uuid primary key, title text not null check(length(title) between 3 and 120),
 description text not null default '' check(length(description)<=4000),
 starts_at timestamptz, ends_at timestamptz, map_id text,
 status text not null default 'draft' check(status in ('draft','archived')),
 version integer not null default 1, updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create table if not exists public.admin_audit_logs (
 id bigint generated always as identity primary key, actor uuid not null references auth.users(id),
 kind text not null, message text not null, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_event_plans enable row level security;
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_event_plans,public.admin_audit_logs from public,anon,authenticated;
create index if not exists admin_audit_created on public.admin_audit_logs(created_at desc);

create or replace function public.admin_dashboard_require_access() returns void
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if auth.uid() is null or not public.is_game_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
end $$;
revoke all on function public.admin_dashboard_require_access() from public,anon,authenticated;

-- Private directory: only checked SECURITY DEFINER functions can read this view.
create or replace view public.admin_account_directory as
select u.id, coalesce(nullif(p.username,''),nullif(u.raw_user_meta_data->>'username',''),'Khách '||left(u.id::text,6)) as username,
 case when u.email not like '%@players.tutien.invalid' then u.email else null end as email,
 coalesce(u.is_anonymous,false) as guest, u.created_at,
 nullif(s.data#>>'{player,name}','') as character_name, s.data#>>'{player,heroId}' as hero_id,
 case when (s.data#>>'{player,level}')~'^\d{1,6}$' then (s.data#>>'{player,level}')::integer else 1 end as level,
 case when (s.data#>>'{player,realmIndex}')~'^\d{1,2}$' then least(11,(s.data#>>'{player,realmIndex}')::integer) else 0 end as realm_index,
 s.data->>'mapId' as map_id, s.updated_at, coalesce(s.updated_at>now()-interval '90 seconds',false) as recent,
 coalesce(w.balance,0) as balance, exists(select 1 from public.game_admins g where g.user_id=u.id) as admin
from auth.users u left join public.profiles p on p.id=u.id
left join public.saves s on s.user_id=u.id left join public.premium_wallets w on w.user_id=u.id;
revoke all on public.admin_account_directory from public,anon,authenticated;

create or replace view public.admin_log_directory as
select 'jade:'||l.id as id, l.created_at,
 case when l.delta>0 then 'jade_grant' else 'jade_exchange' end as kind,
 l.reason as message, coalesce(a.username,'Hệ thống') as actor,
 coalesce(t.username,'Tài khoản đã xóa') as target, l.delta,
 jsonb_build_object('user_id',l.user_id,'request_id',l.request_id) as details
from public.premium_ledger l left join public.admin_account_directory a on a.id=l.actor
left join public.admin_account_directory t on t.id=l.user_id
union all
select 'audit:'||l.id,l.created_at,l.kind,l.message,coalesce(a.username,'Hệ thống'),
 '',null::bigint,l.details from public.admin_audit_logs l left join public.admin_account_directory a on a.id=l.actor;
revoke all on public.admin_log_directory from public,anon,authenticated;

create or replace function public.admin_dashboard_overview() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare r jsonb; begin
 perform public.admin_dashboard_require_access();
 select jsonb_build_object('accounts',count(*),'characters',count(character_name),
 'recent',count(*) filter(where recent),'jade',coalesce(sum(balance),0)) into r from public.admin_account_directory;
 return r||jsonb_build_object('logs_today',(select count(*) from public.admin_log_directory where created_at>=
 (date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')),
 'plans',(select count(*) from public.admin_event_plans where status='draft'),'server_time',now());
end $$;

create or replace function public.admin_dashboard_accounts(p_query text default '',p_activity text default 'all',p_offset integer default 0,p_limit integer default 8) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare r jsonb; begin
 perform public.admin_dashboard_require_access();
 if p_activity is null or p_activity not in ('all','recent','inactive') then raise exception 'INVALID_FILTER'; end if;
 with filtered as materialized (select * from public.admin_account_directory a
 where (coalesce(btrim(p_query),'')='' or strpos(lower(concat_ws(' ',a.id::text,a.username,a.email,a.character_name)),lower(left(btrim(p_query),100)))>0)
 and (p_activity='all' or (p_activity='recent' and a.recent) or (p_activity='inactive' and not a.recent))),
 paged as (select * from filtered order by created_at desc,id limit greatest(1,least(50,coalesce(p_limit,8))) offset greatest(0,coalesce(p_offset,0)))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from paged p),'[]'::jsonb)) into r;
 return r;
end $$;

create or replace function public.admin_dashboard_account(p_user uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare r jsonb; begin
 perform public.admin_dashboard_require_access();
 select jsonb_build_object('account',to_jsonb(a),
 'inventory',coalesce((select jsonb_object_agg(e.key,e.value) from (select * from jsonb_each(case when jsonb_typeof(s.data#>'{player,inventory}')='object' then s.data#>'{player,inventory}' else '{}'::jsonb end) limit 300) e),'{}'::jsonb),
 'equipment',case when jsonb_typeof(s.data#>'{player,equipment}')='object' then s.data#>'{player,equipment}' else '{}'::jsonb end,
 'quests',coalesce((select jsonb_object_agg(e.key,e.value) from (select * from jsonb_each(case when jsonb_typeof(s.data->'quests')='object' then s.data->'quests' else '{}'::jsonb end) limit 300) e),'{}'::jsonb)) into r
 from public.admin_account_directory a left join public.saves s on s.user_id=a.id where a.id=p_user;
 if r is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 return r;
end $$;

create or replace function public.admin_dashboard_logs(p_query text default '',p_kind text default 'all',p_offset integer default 0,p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare r jsonb; begin
 perform public.admin_dashboard_require_access();
 with filtered as materialized(select * from public.admin_log_directory l where
 (coalesce(btrim(p_query),'')='' or strpos(lower(concat_ws(' ',l.message,l.actor,l.target)),lower(left(btrim(p_query),100)))>0)
 and (p_kind='all' or l.kind=p_kind)),
 paged as(select * from filtered order by created_at desc,id desc limit greatest(1,least(100,coalesce(p_limit,20))) offset greatest(0,coalesce(p_offset,0)))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from paged p),'[]'::jsonb)) into r;
 return r;
end $$;

create or replace function public.admin_dashboard_plans() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 perform public.admin_dashboard_require_access();
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.updated_at desc,p.id) from (select * from public.admin_event_plans order by updated_at desc,id limit 100) p),'[]'::jsonb);
end $$;

create or replace function public.admin_save_event_plan(p_id uuid,p_version integer,p_title text,p_description text,p_starts_at timestamptz,p_ends_at timestamptz,p_map_id text,p_status text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare r public.admin_event_plans; begin
 perform public.admin_dashboard_require_access();
 if p_id is null or p_version is null or p_version<0 or p_title is null or length(btrim(p_title)) not between 3 and 120
 or p_description is null or length(p_description)>4000 or p_status is null or p_status not in ('draft','archived')
 or length(coalesce(p_map_id,''))>80 or (p_starts_at is not null and p_ends_at is not null and p_ends_at<=p_starts_at) then raise exception 'INVALID_EVENT_PLAN'; end if;
 select * into r from public.admin_event_plans where id=p_id for update;
 if found then
  if r.version<>p_version then raise exception 'PLAN_CONFLICT'; end if;
  update public.admin_event_plans set title=btrim(p_title),description=p_description,starts_at=p_starts_at,
  ends_at=p_ends_at,map_id=nullif(btrim(p_map_id),''),status=p_status,version=version+1,updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_id returning * into r;
 else
  if p_version<>0 then raise exception 'PLAN_CONFLICT'; end if;
  insert into public.admin_event_plans(id,title,description,starts_at,ends_at,map_id,status,updated_by)
  values(p_id,btrim(p_title),p_description,p_starts_at,p_ends_at,nullif(btrim(p_map_id),''),p_status,auth.uid()) returning * into r;
 end if;
 insert into public.admin_audit_logs(actor,kind,message,details)
 values(auth.uid(),'event_plan',case when p_status='archived' then 'Lưu trữ kế hoạch: ' else 'Lưu kế hoạch: ' end||r.title,jsonb_build_object('plan_id',r.id,'version',r.version,'status',r.status));
 return to_jsonb(r);
end $$;

revoke all on function public.admin_dashboard_overview(),public.admin_dashboard_accounts(text,text,integer,integer),
 public.admin_dashboard_account(uuid),public.admin_dashboard_logs(text,text,integer,integer),public.admin_dashboard_plans(),
 public.admin_save_event_plan(uuid,integer,text,text,timestamptz,timestamptz,text,text) from public,anon;
grant execute on function public.admin_dashboard_overview(),public.admin_dashboard_accounts(text,text,integer,integer),
 public.admin_dashboard_account(uuid),public.admin_dashboard_logs(text,text,integer,integer),public.admin_dashboard_plans(),
 public.admin_save_event_plan(uuid,integer,text,text,timestamptz,timestamptz,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
