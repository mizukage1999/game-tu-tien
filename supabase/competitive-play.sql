-- Requires schema.sql, player-access.sql and leaderboard.sql. Safe to rerun.
begin;
create schema if not exists game_competitive;
revoke all on schema game_competitive from public,anon,authenticated;
create table if not exists game_competitive.ratings(
 season text not null,user_id uuid not null references auth.users(id) on delete cascade,
 rating integer not null default 1000,wins integer not null default 0,losses integer not null default 0,draws integer not null default 0,
 primary key(season,user_id));
create table if not exists game_competitive.queue(
 user_id uuid primary key references auth.users(id) on delete cascade,instance uuid not null,
 touched timestamptz not null default now(),realm integer not null,fighter jsonb not null);
create table if not exists game_competitive.matches(
 id uuid primary key default gen_random_uuid(),season text not null,a uuid not null references auth.users(id) on delete cascade,
 b uuid not null references auth.users(id) on delete cascade,fighters jsonb not null,created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '3 minutes',reports jsonb not null default '{}',
 state text not null default 'playing',winner uuid,scored boolean not null default false,check(a<>b));
create index if not exists competitive_matches_a on game_competitive.matches(a,created_at desc);
alter table game_competitive.matches add column if not exists ready jsonb not null default '{}';
create index if not exists competitive_matches_b on game_competitive.matches(b,created_at desc);
alter table game_competitive.ratings enable row level security;
alter table game_competitive.queue enable row level security;
alter table game_competitive.matches enable row level security;

create or replace function game_competitive.settle(mid uuid) returns void language plpgsql security definer set search_path='' as $$
declare m game_competitive.matches; w uuid; eligible boolean;
begin
 select * into m from game_competitive.matches where id=mid for update;
 if not found or m.state<>'playing' or not(m.reports ? m.a::text and m.reports ? m.b::text) then return;end if;
 if m.reports->m.a::text<>m.reports->m.b::text then
  update game_competitive.matches set state='disputed' where id=mid;return;
 end if;
 w:=(m.reports->>m.a::text)::uuid;
 if w is not null and w not in(m.a,m.b) then raise exception 'INVALID_WINNER';end if;
 -- Two scored meetings per pair/day and 20 scored games per account/day.
 eligible:=(select count(*)<2 from game_competitive.matches where scored and created_at>=date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' and ((a=m.a and b=m.b) or (a=m.b and b=m.a)));
 eligible:=eligible and (select count(*)<20 from game_competitive.matches where scored and created_at>=now()-interval '24 hours' and (a=m.a or b=m.a));
 eligible:=eligible and (select count(*)<20 from game_competitive.matches where scored and created_at>=now()-interval '24 hours' and (a=m.b or b=m.b));
 insert into game_competitive.ratings(season,user_id) values(m.season,m.a),(m.season,m.b) on conflict do nothing;
 if eligible then
  -- Stable lock order prevents cross-match deadlocks.
  perform 1 from game_competitive.ratings where season=m.season and user_id in(m.a,m.b) order by user_id for update;
  update game_competitive.ratings set rating=greatest(0,rating+case when w is null then 0 when w=user_id then 20 else -20 end),
   wins=wins+case when w=user_id then 1 else 0 end,losses=losses+case when w is not null and w<>user_id then 1 else 0 end,
   draws=draws+case when w is null then 1 else 0 end where season=m.season and user_id in(m.a,m.b);
 end if;
 update game_competitive.matches set state='finished',winner=w,scored=eligible where id=mid;
end $$;

create or replace function public.game_ranked(p_instance_id uuid,p_action text default 'status',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); ss text:=to_char(date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh'),'YYYY-MM-DD');
 m game_competitive.matches; peer game_competitive.queue; p jsonb; i jsonb; f jsonb; r game_competitive.ratings; rows jsonb; chosen uuid;
begin
 if u is null or not public.check_game_session(p_instance_id) then raise exception 'SESSION_REPLACED';end if;
 if p_action not in('status','join','poll','leave','report','ready') then raise exception 'INVALID_ACTION';end if;
 perform pg_advisory_xact_lock(738421911);
 delete from game_competitive.queue where touched<now()-interval '30 seconds';
 update game_competitive.matches set state='expired' where state='playing' and expires_at<now();
 select * into m from game_competitive.matches where state='playing' and (a=u or b=u) order by created_at desc limit 1 for update;
 if p_action='ready' then
  if m.id is not null and m.id::text=p_payload->>'id' then
   update game_competitive.matches set ready=ready||jsonb_build_object(u::text,extract(epoch from now())) where id=m.id;
  end if;
 elsif p_action='leave' then
  delete from game_competitive.queue where user_id=u;
  if m.id is not null then
   if not(m.ready ? m.a::text and m.ready ? m.b::text) then
    update game_competitive.matches set state='cancelled' where id=m.id;
   else
   chosen:=case when m.a=u then m.b else m.a end;
   update game_competitive.matches set reports=jsonb_build_object(m.a::text,chosen,m.b::text,chosen) where id=m.id;
   perform game_competitive.settle(m.id);
   end if;m:=null;
  end if;
 elsif p_action='report' then
  if m.id is not null and m.id::text=p_payload->>'id' then
   if not(m.ready ? m.a::text and m.ready ? m.b::text) then raise exception 'MATCH_NOT_STARTED';end if;
   if p_payload->>'winner' is not null and p_payload->>'winner' not in(m.a::text,m.b::text) then raise exception 'INVALID_WINNER';end if;
   if not(m.reports ? u::text) then update game_competitive.matches set reports=reports||jsonb_build_object(u::text,p_payload->'winner') where id=m.id;end if;
   perform game_competitive.settle(m.id);
  end if;
 elsif p_action='join' and m.id is null then
  select data into p from public.saves where user_id=u;
  i:=game_rank_private.project(u,p,now())->'inspection';
  if i is null or coalesce((i->>'child')::boolean,true) then raise exception 'ADMISSION_REQUIRED';end if;
  f:=jsonb_build_object('userId',u,'name',p#>>'{player,name}','heroId',i->'heroId','sex',i->'sex','level',i->'level','realm',i->'realm',
   'hp',i#>'{stats,maxHp}','maxHp',i#>'{stats,maxHp}','maxMp',i#>'{stats,maxMp}','atk',i#>'{stats,atk}','def',i#>'{stats,def}',
   'critRate',.15,'critMul',1.8,'speed',190,
   'loadout',(select jsonb_agg(value->'id') from jsonb_array_elements(i->'skills') where (value->>'equipped')::boolean and value->>'id'<>'than_phap'),
   'skillLevels',coalesce(p#>'{player,skills}','{}'::jsonb));
  insert into game_competitive.queue(user_id,instance,realm,fighter) values(u,p_instance_id,(i->>'realmIndex')::integer,f)
   on conflict(user_id) do update set instance=excluded.instance,touched=now(),realm=excluded.realm,fighter=excluded.fighter;
 end if;
 if p_action='poll' and m.id is not null and m.state='playing' and m.ready ? m.a::text and m.ready ? m.b::text then
  chosen:=case when m.a=u then m.b else m.a end;
  update game_competitive.matches set ready=ready||jsonb_build_object(u::text,extract(epoch from now())) where id=m.id;
  if extract(epoch from now())-(m.ready->>chosen::text)::numeric>30 then
   update game_competitive.matches set reports=jsonb_build_object(m.a::text,u,m.b::text,u) where id=m.id;
   perform game_competitive.settle(m.id);
  end if;
 end if;
 if p_action in('poll','join') and m.id is null then
  update game_competitive.queue set touched=now() where user_id=u and instance=p_instance_id;
  select q.* into peer from game_competitive.queue q join game_competitive.queue mine on mine.user_id=u
   where q.user_id<>u and abs(q.realm-mine.realm)<=1 and abs((q.fighter->>'level')::integer-(mine.fighter->>'level')::integer)<=15
   and exists(select 1 from public.game_sessions s where s.user_id=q.user_id and s.instance_id=q.instance)
   and game_rank_private.visible(q.user_id) and public.game_access_allowed(q.user_id)
   order by abs(q.realm-mine.realm),q.touched,q.user_id limit 1 for update of q;
  if peer.user_id is not null then
   select fighter into f from game_competitive.queue where user_id=u;
   insert into game_competitive.matches(season,a,b,fighters) values(ss,peer.user_id,u,jsonb_build_array(peer.fighter,f)) returning * into m;
   delete from game_competitive.queue where user_id in(u,peer.user_id);
  end if;
 end if;
 insert into game_competitive.ratings(season,user_id) values(ss,u) on conflict do nothing;
 select * into r from game_competitive.ratings where season=ss and user_id=u;
 select coalesce(jsonb_agg(x),'[]') into rows from(select t.user_id as "userId",coalesce(s.data#>>'{player,name}','Đạo hữu') name,t.rating,t.wins,t.losses,t.draws
  from game_competitive.ratings t join public.saves s on s.user_id=t.user_id where t.season=ss and game_rank_private.visible(t.user_id)
  order by t.rating desc,t.wins desc,t.user_id limit 50)x;
 select * into m from game_competitive.matches where (a=u or b=u) order by created_at desc limit 1;
 return jsonb_build_object('season',ss,'rating',r.rating,'wins',r.wins,'losses',r.losses,'draws',r.draws,'queue',exists(select 1 from game_competitive.queue where user_id=u),
  'match',case when m.state='playing' then jsonb_build_object('id',m.id,'a',m.fighters->0,'b',m.fighters->1,'expiresAt',m.expires_at) else null end,
  'status',coalesce(m.state,'idle'),'rows',rows,
  'result',case when m.id is not null and m.state<>'playing' then jsonb_build_object('id',m.id,'status',m.state,'winner',m.winner,'scored',m.scored) else null end);
end $$;
revoke all on all tables in schema game_competitive from public,anon,authenticated;
revoke all on all functions in schema game_competitive from public,anon,authenticated;
revoke all on function public.game_ranked(uuid,text,jsonb) from public,anon;
grant execute on function public.game_ranked(uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
