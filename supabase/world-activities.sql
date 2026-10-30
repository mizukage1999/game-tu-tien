-- After competitive-play.sql, alphatest-mail.sql, admin-delivery.sql and admin-catalog.sql.
begin;
-- Upgrade the existing revision-safe item-mail claim function without weakening its locks.
do $upgrade$ declare body text; begin
 body:=pg_get_functiondef('public.claim_game_mail(uuid,uuid)'::regprocedure);
 if position('activity:%' in body)=0 then
  if position('if m.campaign_id not like ''admin-grant:%'' then' in body)=0 then raise exception 'Unsupported claim_game_mail version';end if;
  execute replace(body,'if m.campaign_id not like ''admin-grant:%'' then','if m.campaign_id not like ''admin-grant:%'' and m.campaign_id not like ''activity:%'' then');
 end if;
end $upgrade$;
create table if not exists game_competitive.activity_entries(
 user_id uuid not null references auth.users(id) on delete cascade,kind text not null,seed bigint not null,
 started_at timestamptz not null default now(),initial_bosses bigint not null,capture_at timestamptz,
 primary key(user_id,kind,seed),check(kind in('treasure','ruins')));
create table if not exists game_competitive.treasure_winners(
 seed bigint primary key,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table game_competitive.activity_entries enable row level security;
alter table game_competitive.treasure_winners enable row level security;
create or replace function public.game_activity(p_instance_id uuid,p_kind text default 'treasure',p_action text default 'status',p_seed bigint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); epoch bigint:=floor(extract(epoch from now())); start_at bigint; duration integer; e game_competitive.activity_entries;
 bosses bigint; p jsonb; campaign text; loot jsonb; victor uuid; letter uuid;
begin
 if u is null or not public.check_game_session(p_instance_id) then raise exception 'SESSION_REPLACED';end if;
 if p_kind not in('treasure','ruins') or p_action not in('status','start','capture','cancel','claim','cache0','cache1') then raise exception 'INVALID_ACTION';end if;
 start_at:=floor((epoch+25200-case when p_kind='ruins' then 3600 else 0 end)::numeric/10800)*10800-25200+case when p_kind='ruins' then 3600 else 0 end;
 duration:=case when p_kind='ruins' then 2400 else 1500 end;
 if p_action='status' then return jsonb_build_object('now',epoch*1000,'winner',(select user_id from game_competitive.treasure_winners where seed=start_at));end if;
 if p_seed<>start_at or epoch>=start_at+duration then raise exception 'ACTIVITY_CLOSED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_kind||p_seed::text,815));
 select data->'player' into p from public.saves where user_id=u;
 if p is null or coalesce(p->>'admitted','false')<>'true' then raise exception 'ADMISSION_REQUIRED';end if;
 bosses:=game_rank_private.num(p#>'{achievements,bossKills}',0,10000000);
 if p_action='start' then
  insert into game_competitive.activity_entries(user_id,kind,seed,initial_bosses) values(u,p_kind,p_seed,bosses) on conflict do nothing;
 end if;
 select * into e from game_competitive.activity_entries where user_id=u and kind=p_kind and seed=p_seed for update;
 if not found then raise exception 'ENTRY_REQUIRED';end if;
 if p_action='cancel' then update game_competitive.activity_entries set capture_at=null where user_id=u and kind=p_kind and seed=p_seed;end if;
 if p_action in('capture','claim') then
  if bosses<=e.initial_bosses or not coalesce(p->'activityVictories' ? (p_kind||':'||p_seed::text),false) or now()<e.started_at+interval '10 seconds' then raise exception 'GUARDIAN_REQUIRED';end if;
  if p_kind='treasure' and p_action='capture' then
   update game_competitive.activity_entries set capture_at=now() where user_id=u and kind=p_kind and seed=p_seed;
  end if;
 end if;
 if p_action in('claim','cache0','cache1') then
  if p_action like 'cache%' and p_kind<>'ruins' then raise exception 'INVALID_ACTION';end if;
  if p_action like 'cache%' and now()<e.started_at+interval '10 seconds' then raise exception 'EXPLORATION_REQUIRED';end if;
  if p_kind='treasure' then
   select user_id into victor from game_competitive.treasure_winners where seed=p_seed;
   if victor is not null and victor<>u then raise exception 'TREASURE_TAKEN';end if;
   if victor is null then
    if e.capture_at is null or now()<e.capture_at+interval '5 seconds' then raise exception 'CAPTURE_REQUIRED';end if;
    insert into game_competitive.treasure_winners(seed,user_id) values(p_seed,u);
   end if;
  end if;
  campaign:='activity:'||p_kind||':'||p_seed::text||':'||p_action||':'||u::text;
  if p_action like 'cache%' then loot:='{"linh_thach":20,"tinh_luyen_thach":1}'::jsonb;
  else
   loot:='{"linh_thach":150,"tinh_luyen_thach":3,"yeu_dan":2}'::jsonb;
   if random()<.015 then loot:=loot||'{"phap_bao_ngoc":1}'::jsonb;end if;
  end if;
  insert into public.game_mail_campaigns(id,enabled,title,body,rewards)
   values(campaign,false,case when p_kind='treasure' then 'Thiên Giáng Dị Bảo' else 'Kho báu Động Phủ Viễn Cổ' end,
    'Phần thưởng hoạt động đã được lưu. Đạo hữu hãy nhận tại đây.',jsonb_build_object('items',loot,'requiresAdmission',true)) on conflict do nothing;
  insert into public.game_mail(user_id,campaign_id,title,body,rewards)
   select u,id,title,body,rewards from public.game_mail_campaigns where id=campaign on conflict(user_id,campaign_id) do nothing;
  select id into letter from public.game_mail where user_id=u and campaign_id=campaign;
 end if;
 return jsonb_build_object('now',epoch*1000,'seed',p_seed,'mail',letter,'winner',(select user_id from game_competitive.treasure_winners where seed=p_seed));
end $$;
revoke all on game_competitive.activity_entries,game_competitive.treasure_winners from public,anon,authenticated;
revoke all on function public.game_activity(uuid,text,text,bigint) from public,anon;
grant execute on function public.game_activity(uuid,text,text,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
