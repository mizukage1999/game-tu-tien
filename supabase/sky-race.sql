-- Ngự Kiếm Vượt Thiên Quan v1. Requires the existing online sessions and leaderboard migrations.
begin;
create schema if not exists game_competitive;
revoke all on schema game_competitive from public,anon,authenticated;
create table if not exists game_competitive.sky_runs(
 user_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null unique default gen_random_uuid(),instance uuid not null,
 week text not null,seed bigint not null,started_at timestamptz not null default now(),result jsonb);
create table if not exists game_competitive.sky_best(
 week text not null,user_id uuid not null references auth.users(id) on delete cascade,
 score integer not null,energy integer not null,hits integer not null,achieved_at timestamptz not null default now(),
 primary key(week,user_id));
create index if not exists sky_best_week on game_competitive.sky_best(week,score,achieved_at,user_id);
alter table game_competitive.sky_runs enable row level security;
alter table game_competitive.sky_best enable row level security;
revoke all on game_competitive.sky_runs,game_competitive.sky_best from public,anon,authenticated;

-- Replay the actual steering/boost inputs. A client never supplies its score.
create or replace function game_competitive.sky_replay(seed bigint,inputs jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare
 rng bigint:=greatest(1,seed%2147483647); gx double precision[]:='{}'; hx double precision[]:='{}';
 seen boolean[]:=array_fill(false,array[9]); picked boolean[]:=array_fill(false,array[9]);
 x double precision:=0; distance double precision:=0; previous double precision;
 elapsed integer:=0; penalty integer:=0; energy integer:=0; hits integer:=0; gates integer:=0;
 charges integer:=3; shield integer:=0; boost_until integer:=0; cooldown integer:=0; slow_until integer:=0;
 total integer:=0; axis integer; boost integer; ticks integer; i integer; n integer; y integer; entry jsonb; finished boolean:=false;
begin
 if jsonb_typeof(inputs) is distinct from 'array' or jsonb_array_length(inputs) not between 1 and 3600 then raise exception 'REPLAY_INVALID';end if;
 for i in 1..9 loop
  rng:=(rng*16807)%2147483647;gx:=array_append(gx,((rng%5)-2)*.3::double precision);
  rng:=(rng*16807)%2147483647;hx:=array_append(hx,((rng%7)-3)*.25::double precision);
  rng:=(rng*16807)%2147483647;
 end loop;
 for entry in select value from jsonb_array_elements(inputs) loop
  if jsonb_typeof(entry) is distinct from 'array' or jsonb_array_length(entry)<>3 then raise exception 'REPLAY_INVALID';end if;
  if exists(select 1 from jsonb_array_elements(entry) v where jsonb_typeof(v)<>'number' or v::text !~ '^-?[0-9]+$') then raise exception 'REPLAY_INVALID';end if;
  axis:=(entry->>0)::integer;boost:=(entry->>1)::integer;ticks:=(entry->>2)::integer;
  total:=total+ticks;
  if abs(axis)>1000 or boost not in(0,1) or ticks not between 1 and 120 or total>3600 then raise exception 'REPLAY_INVALID';end if;
  for n in 1..ticks loop
   if finished or elapsed>=180000 then raise exception 'REPLAY_TRAILING';end if;
   elapsed:=elapsed+50;x:=greatest(-1,least(1,x+axis/1000::double precision*.022::double precision));
   if boost=1 and charges>0 and elapsed>=cooldown then charges:=charges-1;boost_until:=elapsed+1500;cooldown:=elapsed+5000;end if;
   previous:=distance;
   distance:=distance+5*(case when elapsed<boost_until then 1.65::double precision else 1 end)*(case when elapsed<slow_until then .55::double precision else 1 end);
   for i in 1..9 loop
    y:=i*500;
    if not seen[i] and previous<y-220 and distance>=y-220 then
     seen[i]:=true;
     if abs(x-hx[i])<.16::double precision then
      if shield>0 then shield:=shield-1;else hits:=hits+1;penalty:=penalty+2000;slow_until:=elapsed+700;end if;
     end if;
    end if;
    if not picked[i] and previous<y-110 and distance>=y-110 and abs(x-gx[i])<.2::double precision then
     picked[i]:=true;energy:=energy+1;if (i-1)%4=3 then shield:=1;end if;
    end if;
   end loop;
   if gates<9 and distance>=(gates+1)*500 then
    if abs(x-gx[gates+1])<=.23::double precision then gates:=gates+1;
    else distance:=(gates+1)*500-90;penalty:=penalty+2000;end if;
   end if;
   finished:=distance>=4800 and gates=9;
  end loop;
 end loop;
 if not finished then raise exception 'REPLAY_INCOMPLETE';end if;
 return jsonb_build_object('score',greatest(1000,elapsed+penalty-energy*250),'elapsed',elapsed,'energy',energy,'hits',hits,'penalty',penalty);
end $$;

create or replace function public.game_sky_race(p_instance_id uuid,p_action text default 'status',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); start_week timestamptz:=date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
 current_week text:=to_char(start_week at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD');
 current_seed bigint:=extract(epoch from start_week);run game_competitive.sky_runs; computed jsonb; rows jsonb; own_row jsonb; p jsonb;
begin
 if u is null or not public.check_game_session(p_instance_id) or not game_rank_private.visible(u) then raise exception 'SESSION_REPLACED';end if;
 if p_action not in('status','start','finish','cancel') then raise exception 'INVALID_ACTION';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':sky-race',0));
 if p_action='start' then
  select data->'player' into p from public.saves where user_id=u;
  if p is null or p->>'admitted' is distinct from 'true' then raise exception 'RUN_ADMISSION_REQUIRED';end if;
  insert into game_competitive.sky_runs(user_id,instance,week,seed) values(u,p_instance_id,current_week,current_seed)
  on conflict(user_id) do update set id=gen_random_uuid(),instance=excluded.instance,week=excluded.week,seed=excluded.seed,started_at=now(),result=null
  returning * into run;
 elsif p_action='finish' then
  select * into run from game_competitive.sky_runs where user_id=u for update;
  if not found or run.id::text is distinct from p_payload->>'id' or run.instance<>p_instance_id or run.week<>current_week or now()>run.started_at+interval '5 minutes' then raise exception 'RUN_EXPIRED';end if;
  if run.result is null then
   computed:=game_competitive.sky_replay(run.seed,p_payload->'inputs');
   if extract(epoch from now()-run.started_at)*1000<(computed->>'elapsed')::integer-1000 then raise exception 'RUN_TOO_FAST';end if;
   update game_competitive.sky_runs set result=computed where user_id=u returning * into run;
   insert into game_competitive.sky_best(week,user_id,score,energy,hits) values(current_week,u,(computed->>'score')::integer,(computed->>'energy')::integer,(computed->>'hits')::integer)
   on conflict(week,user_id) do update set score=excluded.score,energy=excluded.energy,hits=excluded.hits,achieved_at=now()
   where excluded.score<game_competitive.sky_best.score;
  end if;
 elsif p_action='cancel' then
  delete from game_competitive.sky_runs where user_id=u and id::text=p_payload->>'id' and result is null;
 end if;
 select coalesce(jsonb_agg(v order by score,achieved_at,user_id),'[]') into rows from (
  select b.score,b.achieved_at,b.user_id,jsonb_build_object('userId',b.user_id,'name',left(coalesce(s.data#>>'{player,name}','Đạo hữu'),24),'score',b.score,'energy',b.energy,'hits',b.hits) v
  from game_competitive.sky_best b join public.saves s on s.user_id=b.user_id where b.week=current_week and game_rank_private.visible(b.user_id)
  order by b.score,b.achieved_at,b.user_id limit 50) t;
 select jsonb_build_object('userId',u,'name',left(coalesce(s.data#>>'{player,name}','Đạo hữu'),24),'score',b.score,'energy',b.energy,'hits',b.hits)
 into own_row from game_competitive.sky_best b join public.saves s on s.user_id=b.user_id where b.week=current_week and b.user_id=u;
 return jsonb_build_object('week',current_week,'seed',current_seed,'rows',rows,'self',own_row,
  'run',case when p_action='start' then jsonb_build_object('id',run.id,'week',run.week,'seed',run.seed) else null end,
  'result',case when p_action='finish' then run.result else null end);
end $$;
revoke all on function game_competitive.sky_replay(bigint,jsonb) from public,anon,authenticated;
revoke all on function public.game_sky_race(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.game_sky_race(uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
