-- Run after schema.sql and single-session.sql. One transaction; existing saves are never modified.
begin;
do $$ begin
 if to_regprocedure('public.check_game_session(uuid)') is null then raise exception 'Install single-session.sql before leaderboard.sql'; end if;
end $$;
create schema if not exists game_rank_private;
revoke all on schema game_rank_private from public,anon,authenticated;
create table if not exists game_rank_private.balance (
 id boolean primary key default true check(id), version text not null, data jsonb not null
);
create table if not exists game_rank_private.entries (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name_search text not null, level integer not null,
 power bigint not null, realm_score bigint not null, contribution bigint not null,
 dungeon_clears bigint not null, pets_score bigint not null, boss_kills bigint not null,
 entry jsonb not null, updated_at timestamptz not null
);
alter table game_rank_private.balance enable row level security;
alter table game_rank_private.entries enable row level security;
revoke all on game_rank_private.balance,game_rank_private.entries from public,anon,authenticated;
-- @BALANCE_CATALOG@
-- @FOLD_FUNCTION@

create or replace function game_rank_private.obj(v jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when jsonb_typeof(v)='object' then v else '{}'::jsonb end
$$;
create or replace function game_rank_private.arr(v jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when jsonb_typeof(v)='array' then v else '[]'::jsonb end
$$;
create or replace function game_rank_private.num(v jsonb,lo numeric,hi numeric, fallback numeric default 0)
returns numeric language sql immutable set search_path='' as $$
 select case when jsonb_typeof(v)='number' then greatest(lo,least(hi,(v#>>'{}')::numeric)) else fallback end
$$;
create or replace function game_rank_private.total(v jsonb) returns bigint language sql immutable set search_path='' as $$
 select least(10000000,coalesce(sum(floor(game_rank_private.num(value,0,1000000))),0))::bigint
 from jsonb_each(game_rank_private.obj(v))
$$;
create or replace function game_rank_private.entitled(u uuid,item text) returns boolean
language plpgsql stable set search_path='' as $$
declare allowed boolean := false;
begin
 if to_regclass('public.premium_entitlements') is not null then
  execute 'select exists(select 1 from public.premium_entitlements where user_id=$1 and item_id=$2)' into allowed using u,item;
 end if;
 return allowed;
end $$;
create or replace function game_rank_private.visible(u uuid) returns boolean
language plpgsql stable set search_path='' as $$
declare allowed boolean := true;
begin
 if not exists(select 1 from auth.users where id=u and (banned_until is null or banned_until<=current_timestamp)) then return false; end if;
 if to_regclass('public.game_account_blocks') is not null then
  execute 'select not exists(select 1 from public.game_account_blocks where user_id=$1)' into allowed using u;
 end if;
 return allowed;
end $$;

-- Projection whitelist: neither the bag, wallet, email, account login nor the raw save is public.
create or replace function game_rank_private.project(u uuid,snapshot jsonb,changed timestamptz) returns jsonb
language plpgsql stable set search_path='' as $$
declare
 p jsonb := game_rank_private.obj(snapshot->'player');
 a jsonb := game_rank_private.obj(p->'adventure');
 life jsonb := game_rank_private.obj(p->'life');
 catalog jsonb; base jsonb; hero jsonb; definition jsonb; bonus jsonb; enhanced jsonb;
 hero_id text; sex text; name text; sect text; title text; realm text;
 lvl integer; realm_idx integer; child boolean; reputation bigint; contribution bigint; sect_rank integer;
 hp bigint; mp bigint; atk bigint; def bigint; power bigint;
 equipment jsonb := '[]'; companions jsonb := '[]'; skills jsonb := '[]'; mounts jsonb := '[]';
 slot text; raw_id text; item_id text; item jsonb; pet_id text; pet jsonb; pet_rank integer; evolution integer; active boolean;
 upgrade integer; pets_score bigint := 0; clears bigint := 0; boss_kills bigint := 0;
 selected jsonb := '[]'; defaults jsonb; sk text; skill jsonb; valid boolean;
 known_equipped boolean; q jsonb := game_rank_private.obj(snapshot->'quests');
begin
 select data into catalog from game_rank_private.balance where id;
 if catalog is null then raise exception 'LEADERBOARD_BALANCE_MISSING'; end if;
 if jsonb_typeof(p->'name') is distinct from 'string' or jsonb_typeof(p->'level') is distinct from 'number' then return null; end if;
 name := left(btrim(p->>'name'),24); if name='' then return null; end if;
 lvl := floor(game_rank_private.num(p->'level',1,(catalog->>'maxLevel')::numeric,1));
 base := catalog->'levels'->lvl::text; realm_idx := (base->>'realmIndex')::integer;
 child := p->>'origin'='vuong_gia_thon' and (p->'admitted') is distinct from 'true'::jsonb;
 child := coalesce(child,false);
 hero_id := p->>'heroId';
 if not (catalog->'heroes' ? coalesce(hero_id,'')) then hero_id := case when p->>'sex'='male' then 'wang_lam' else 'ly_mo_uyen' end; end if;
 hero := catalog->'heroes'->hero_id; sex := hero->>'sex';
 realm := case when child then 'Phàm Nhân' else base->>'realm' end;
 sect := case when a->>'boundSect'='linh_son_tong' then 'linh_son_tong' else 'dai_thua_vien' end;
 reputation := floor(game_rank_private.num(a->'reputation',0,10000000));
 contribution := floor(game_rank_private.num(a->'contribution',0,10000000));
 select coalesce(max(ord-1),0) into sect_rank from jsonb_array_elements(catalog->'sectRanks') with ordinality t(r,ord) where (r->>'reputation')::numeric<=reputation;
 if child then sect_rank:=0;end if;
 title := case when child then 'Thiếu niên Vương Gia Thôn' else (catalog->'sectRanks'->sect_rank->>'name') || ' · ' || (hero->>'school') end;
 hp := (base#>>'{stats,maxHp}')::bigint; mp := (base#>>'{stats,maxMp}')::bigint;
 atk := (base#>>'{stats,atk}')::bigint; def := (base#>>'{stats,def}')::bigint;
 for slot in select jsonb_array_elements_text(catalog->'slots') loop
  raw_id := game_rank_private.obj(p->'equipment')->>slot; item_id := split_part(coalesce(raw_id,''),'~',1);
  definition := catalog->'items'->item_id;
  if definition is null or definition->>'slot'<>slot then continue; end if;
  if item_id='tien_phap_bao' and (raw_id<>item_id or not game_rank_private.entitled(u,item_id)) then continue; end if;
  upgrade := floor(game_rank_private.num(game_rank_private.obj(a->'enhancements')->raw_id,0,12));
  bonus := definition->'bonus'; enhanced := definition->'enhanced'->upgrade;
  hp := hp+coalesce((bonus->>'hp')::bigint,0)+(enhanced->>'hp')::bigint;
  atk := atk+coalesce((bonus->>'atk')::bigint,0)+(enhanced->>'atk')::bigint;
  def := def+coalesce((bonus->>'def')::bigint,0)+(enhanced->>'def')::bigint;
  equipment := equipment || jsonb_build_array(jsonb_build_object('slot',slot,'id',item_id,'enhancement',upgrade));
 end loop;
 for pet_id,pet in select key,value from jsonb_each(game_rank_private.obj(life->'companions')) loop
  definition := catalog->'companions'->pet_id;
  if definition is null or jsonb_typeof(pet->'rank') is distinct from 'number' then continue; end if;
  pet_rank := floor(game_rank_private.num(pet->'rank',1,5,1));
  evolution := floor(game_rank_private.num(game_rank_private.obj(a->'evolution')->pet_id,0,2));
  active := coalesce(life->>'companion'=pet_id,false);
  pets_score := pets_score+pet_rank+evolution*3;
  if active then
   hp := hp+round((definition->>'hp')::numeric*pet_rank*(1+0.5*evolution));
   atk := atk+round((definition->>'atk')::numeric*pet_rank*(1+0.5*evolution));
   def := def+round((definition->>'def')::numeric*pet_rank*(1+0.5*evolution));
  end if;
  if not child then companions := companions || jsonb_build_array(jsonb_build_object('id',pet_id,'rank',pet_rank,'evolution',evolution,'active',active)); end if;
 end loop;
 if life->>'artifact'='phap_bao_ngoc' then hp:=hp+100;def:=def+12;end if;
 power := floor(hp*0.2::double precision+mp*0.1::double precision+atk*5+def*4+0.15*500+0.5);
 for item_id,item in select key,value from jsonb_each(game_rank_private.obj(p#>'{dungeons,clears}')) loop
  if catalog->'dungeons' ? item_id then clears := least(10000000,clears+floor(game_rank_private.num(item,0,1000000))); end if;
 end loop;
 boss_kills := floor(game_rank_private.num(p#>'{achievements,bossKills}',0,10000000));
 -- A bounded, validated loadout and public skill levels; secret books themselves stay private.
 defaults := hero->'loadout';
 if not (p ? 'heroId') then defaults := '["basic","bang_tam_tram","phi_kiem","han_bang_tran"]'::jsonb || defaults; end if;
 if not child then
  selected := '["basic"]';
  for sk in select jsonb_array_elements_text(game_rank_private.arr(coalesce(p->'skillLoadout',defaults)) || defaults || '["than_phap"]'::jsonb) loop
   skill := catalog->'skills'->sk;
   valid := skill is not null and (skill->>'hero' is null or skill->>'hero'=hero_id)
    and (skill->>'character' is null or ((skill->>'character'=sex) and (skill->>'character'<>'male' or hero_id='wang_lam')))
    and lvl>=coalesce((skill->>'unlockLevel')::integer,1)
    and (skill->>'secret'<>'true' or game_rank_private.arr(a->'learnedSecrets') ? sk);
   if not valid then continue; end if;
   if sk<>'than_phap' and not(selected ? sk) and jsonb_array_length(selected)<7 then selected := selected || jsonb_build_array(sk); end if;
  end loop;
  for sk,skill in select key,value from jsonb_each(catalog->'skills') loop
   valid := (skill->>'hero' is null or skill->>'hero'=hero_id)
    and (skill->>'character' is null or (skill->>'character'=sex and (skill->>'character'<>'male' or hero_id='wang_lam')))
    and lvl>=coalesce((skill->>'unlockLevel')::integer,1)
    and (skill->>'secret'<>'true' or game_rank_private.arr(a->'learnedSecrets') ? sk);
   if not valid then continue; end if;
   known_equipped := selected ? sk or sk='than_phap';
   skills := skills || jsonb_build_array(jsonb_build_object('id',sk,'level',floor(game_rank_private.num(game_rank_private.obj(p->'skills')->sk,1,10,1)),'equipped',known_equipped));
  end loop;
  -- Keep loadout order in the overview and stay within the existing inspection parser cap.
  select coalesce(jsonb_agg(e order by case when selected ? (e->>'id') then (select ord from jsonb_array_elements_text(selected) with ordinality t(id,ord) where id=e->>'id') when e->>'id'='than_phap' then 8 else 100 end,e->>'id'),'[]'::jsonb)
   into skills from (select value e from jsonb_array_elements(skills) order by (value->>'equipped')::boolean desc,value->>'id' limit 60) s;
  if realm_idx>=1 or q#>>'{main_4,status}'='done' then mounts := mounts || jsonb_build_array(jsonb_build_object('id','sword','active',coalesce(p#>>'{immortal,mount}'='sword',false),'speed',1.45+realm_idx*0.01,'showMount',realm_idx<6));end if;
  if q#>>'{main_hac,status}'='done' then mounts := mounts || jsonb_build_array(jsonb_build_object('id','crane','active',coalesce(p#>>'{immortal,mount}'='crane',false),'speed',1.7+realm_idx*0.01,'showMount',true));end if;
 end if;
 return jsonb_build_object('id',u::text,'name',name,'contribution',contribution,'reputation',reputation,'title',title,'bossKills',boss_kills,'updatedAt',changed,
  'inspection',jsonb_build_object('userId',u::text,'heroId',hero_id,'sex',sex,'child',child,'level',lvl,'realm',realm,'realmIndex',realm_idx,'mapId',left(coalesce(snapshot->>'mapId','dai_thua_vien'),50),
   'rank',sect_rank,'pkMode',case when p->>'pkMode' in ('sect','all') then p->>'pkMode' else 'peace' end,
   'stats',jsonb_build_object('maxHp',hp,'maxMp',mp,'atk',atk,'def',def,'critRate',0.15,'critMul',1.8,'speed',190),
   'hp',floor(game_rank_private.num(p->'hp',0,hp)),'mp',floor(game_rank_private.num(p->'mp',0,mp)),'power',power,
   'equipment',equipment,'skills',skills,'mounts',mounts,'companions',companions,
   'friendCount',least(30,jsonb_array_length(game_rank_private.arr(p->'friends'))),
   'progress',jsonb_build_object('clears',clears,'explored',least(10000000,jsonb_array_length(game_rank_private.arr(p#>'{world,discovered}'))),
    'gathered',game_rank_private.total(p#>'{immortal,gathered}'),'crafted',game_rank_private.total(p#>'{immortal,crafted}'),
    'missions',case when game_rank_private.num(a->'missionDay',0,10000000) = floor(extract(epoch from changed+interval '7 hours')/86400) then jsonb_array_length(game_rank_private.arr(a->'completedMissions')) else 0 end))
  || case when child then '{}'::jsonb else jsonb_build_object('sect',sect) end);
end $$;

create or replace function game_rank_private.refresh_entry(u uuid,snapshot jsonb,changed timestamptz) returns void
language plpgsql set search_path='' as $$
declare projected jsonb;
begin
 projected := game_rank_private.project(u,snapshot,changed);
 if projected is null then delete from game_rank_private.entries where user_id=u;return;end if;
 insert into game_rank_private.entries(user_id,name_search,level,power,realm_score,contribution,dungeon_clears,pets_score,boss_kills,entry,updated_at)
 values(u,game_rank_private.fold(projected->>'name'),(projected#>>'{inspection,level}')::integer,(projected#>>'{inspection,power}')::bigint,
  case when (projected#>>'{inspection,child}')::boolean then 0 else ((projected#>>'{inspection,realmIndex}')::bigint+1)*1000+(projected#>>'{inspection,level}')::bigint end,
  (projected->>'contribution')::bigint,(projected#>>'{inspection,progress,clears}')::bigint,
  coalesce((select sum((v->>'rank')::bigint+(v->>'evolution')::bigint*3) from jsonb_array_elements(projected#>'{inspection,companions}') v),0),
  (projected->>'bossKills')::bigint,projected,changed)
 on conflict(user_id) do update set name_search=excluded.name_search,level=excluded.level,power=excluded.power,realm_score=excluded.realm_score,
  contribution=excluded.contribution,dungeon_clears=excluded.dungeon_clears,pets_score=excluded.pets_score,boss_kills=excluded.boss_kills,entry=excluded.entry,updated_at=excluded.updated_at;
end $$;
create or replace function game_rank_private.sync_save() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then delete from game_rank_private.entries where user_id=old.user_id;return old;end if;
 perform game_rank_private.refresh_entry(new.user_id,new.data,new.updated_at);
 return new;
end $$;
drop trigger if exists game_ranking_save on public.saves;
create trigger game_ranking_save after insert or update of data or delete on public.saves for each row execute function game_rank_private.sync_save();

-- Granting/revoking a premium item also refreshes an offline character's public stats.
create or replace function game_rank_private.sync_entitlement() returns trigger
language plpgsql security definer set search_path='' as $$
declare saved record; u uuid;
begin
 u:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 for saved in select data,updated_at from public.saves where user_id=u loop
  perform game_rank_private.refresh_entry(u,saved.data,saved.updated_at);
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
do $$ begin
 if to_regclass('public.premium_entitlements') is not null then
  execute 'drop trigger if exists game_ranking_entitlement on public.premium_entitlements';
  execute 'create trigger game_ranking_entitlement after insert or delete on public.premium_entitlements for each row execute function game_rank_private.sync_entitlement()';
 end if;
end $$;

create index if not exists ranking_power on game_rank_private.entries(power desc,level desc,user_id);
create index if not exists ranking_level on game_rank_private.entries(level desc,user_id);
create index if not exists ranking_realm on game_rank_private.entries(realm_score desc,level desc,user_id);
create index if not exists ranking_sect on game_rank_private.entries(contribution desc,level desc,user_id);
create index if not exists ranking_dungeons on game_rank_private.entries(dungeon_clears desc,level desc,user_id);
create index if not exists ranking_pets on game_rank_private.entries(pets_score desc,level desc,user_id);
create index if not exists ranking_boss on game_rank_private.entries(boss_kills desc,level desc,user_id);

create or replace function public.game_leaderboard(p_instance_id uuid,p_category text default 'power',p_query text default '',p_offset integer default 0,p_limit integer default 8)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare score_col text; block_clause text; result jsonb; own uuid:=auth.uid(); skip integer:=greatest(0,least(100000,coalesce(p_offset,0))); page_size integer:=greatest(1,least(20,coalesce(p_limit,8)));
begin
 if own is null or not public.check_game_session(p_instance_id) then raise exception 'SESSION_REPLACED'; end if;
 if not game_rank_private.visible(own) then raise exception 'GAME_ACCESS_BLOCKED';end if;
 score_col := case p_category when 'power' then 'power' when 'level' then 'level' when 'realm' then 'realm_score' when 'sect' then 'contribution' when 'dungeons' then 'dungeon_clears' when 'pets' then 'pets_score' when 'boss' then 'boss_kills' else null end;
 if p_category='elements' then return jsonb_build_object('category',p_category,'supported',false,'population',0,'total',0,'offset',0,'limit',page_size,'top','[]'::jsonb,'rows','[]'::jsonb,'self',null,'serverTime',current_timestamp); end if;
 if score_col is null then raise exception 'INVALID_RANKING_CATEGORY'; end if;
 block_clause:=case when to_regclass('public.game_account_blocks') is null then '' else 'and not exists(select 1 from public.game_account_blocks blocked where blocked.user_id=e.user_id)' end;
 execute format($query$
  with ranked as materialized (
   select user_id,name_search,entry,row_number() over(order by %1$I desc,level desc,user_id) as rank
   from game_rank_private.entries e join auth.users au on au.id=e.user_id
   where (au.banned_until is null or au.banned_until<=current_timestamp) %2$s and (%1$I>0 or $1 in ('power','level','realm'))
  ), filtered as (select * from ranked where strpos(name_search,game_rank_private.fold($2))>0),
  page as (select * from filtered order by rank offset $3 limit $4)
  select jsonb_build_object('category',$1,'supported',true,'population',(select count(*) from ranked),'total',(select count(*) from filtered),
   'offset',$3,'limit',$4,'serverTime',current_timestamp,
   'top',coalesce((select jsonb_agg(jsonb_build_object('rank',rank,'entry',entry) order by rank) from ranked where rank<=3),'[]'::jsonb),
   'rows',coalesce((select jsonb_agg(jsonb_build_object('rank',rank,'entry',entry) order by rank) from page),'[]'::jsonb),
   'self',(select jsonb_build_object('rank',(select rank from ranked where user_id=$5),'entry',entry) from game_rank_private.entries where user_id=$5))
 $query$,score_col,block_clause) into result using p_category,left(btrim(coalesce(p_query,'')),32),skip,page_size,own;
 return result;
end $$;
revoke all on all functions in schema game_rank_private from public,anon,authenticated;
revoke all on function public.game_leaderboard(uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.game_leaderboard(uuid,text,text,integer,integer) to authenticated;

-- Backfill offline characters without writing their private saves or changing timestamps.
do $$ declare saved record;begin
 for saved in select user_id,data,updated_at from public.saves loop
  perform game_rank_private.refresh_entry(saved.user_id,saved.data,saved.updated_at);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
