-- Run after schema.sql, combat-expansion.sql and single-session.sql.
-- One account-bound Alphatest letter. Closing delivery does not revoke issued letters.
begin;
create table if not exists public.game_mail_campaigns (
 id text primary key, enabled boolean not null default true, version integer not null default 1,
 title text not null, body text not null, rewards jsonb not null,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists public.game_mail (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 campaign_id text not null references public.game_mail_campaigns(id), title text not null, body text not null,
 rewards jsonb not null, created_at timestamptz not null default now(), read_at timestamptz, claimed_at timestamptz,
 receipt jsonb, unique(user_id,campaign_id)
);
alter table public.game_mail_campaigns enable row level security;
alter table public.game_mail enable row level security;
revoke all on public.game_mail_campaigns,public.game_mail from public,anon,authenticated;
create index if not exists game_mail_owner_created on public.game_mail(user_id,created_at desc);
insert into public.game_mail_campaigns(id,title,body,rewards) values(
 'alphatest-v1','Quà chào mừng Alphatest',
 'Chào mừng đạo hữu đến với Alphatest Cửu Huyền! Hoàn thành nhập môn để nhận một lần bộ quà trải nghiệm. Nhân vật dưới cấp 99 được nâng lên cấp 99; nhân vật đã cao hơn giữ nguyên cấp và EXP. Tiên Ngọc, Linh Thạch và Linh Khí được cộng thêm vào tài khoản, không thay thế số đang có.',
 '{"targetLevel":99,"targetRealm":9,"jade":99999,"linhThach":99999,"linhKhi":999999}'::jsonb
) on conflict(id) do nothing;

alter table public.saves add column if not exists mail_reward_revision integer not null default 0 check(mail_reward_revision>=0);
-- A delayed autosave must not overwrite a committed mailbox reward.
create or replace function public.guard_game_mail_revision() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$ declare expected integer; actual integer; raw text; begin
 if tg_op='INSERT' then
  select mail_reward_revision into expected from public.saves where user_id=new.user_id;
  if found then new.mail_reward_revision:=expected; else expected:=new.mail_reward_revision; end if;
 else expected:=new.mail_reward_revision; end if;
 raw:=new.data#>>'{player,mailRevision}';
 if raw is null then actual:=0;
 elsif raw~'^\d{1,9}$' then actual:=raw::integer;
 else raise exception 'MAIL_REWARD_STALE'; end if;
 if actual<>expected then raise exception 'MAIL_REWARD_STALE'; end if;
 return new;
end $$;
drop trigger if exists enforce_mail_reward_revision on public.saves;
create trigger enforce_mail_reward_revision before insert or update of data,mail_reward_revision on public.saves
 for each row execute function public.guard_game_mail_revision();
revoke all on function public.guard_game_mail_revision() from public,anon,authenticated;

create or replace function public.game_mail_inbox(p_revision integer default 0) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); s public.saves; begin
 if u is null then raise exception 'Cần đăng nhập'; end if;
 insert into public.game_mail(user_id,campaign_id,title,body,rewards)
 select u,id,title,body,rewards from public.game_mail_campaigns where id='alphatest-v1' and enabled
 on conflict(user_id,campaign_id) do nothing;
 select * into s from public.saves where user_id=u;
 return jsonb_build_object('mails',coalesce((select jsonb_agg(to_jsonb(m)-'user_id'-'receipt' order by m.created_at desc,m.id) from (select * from public.game_mail where user_id=u order by created_at desc,id limit 50) m),'[]'::jsonb),
 'admitted',coalesce(s.data#>>'{player,admitted}'='true',false),
 'snapshot',case when s.mail_reward_revision>coalesce(p_revision,0) then s.data else null end,
 'premium',case when s.mail_reward_revision>coalesce(p_revision,0) then public.premium_status() else null end);
end $$;

create or replace function public.read_game_mail(p_mail uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if auth.uid() is null then raise exception 'Cần đăng nhập'; end if;
 update public.game_mail set read_at=coalesce(read_at,clock_timestamp()) where id=p_mail and user_id=auth.uid();
 return found;
end $$;

create or replace function public.claim_alphatest_mail(p_mail uuid,p_instance_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); session_row public.game_sessions; s public.saves; m public.game_mail;
 p jsonb; inv jsonb; next_data jsonb; lvl integer; exp_now bigint; needed bigint:=0; n integer; revision integer;
begin
 if u is null then raise exception 'Cần đăng nhập'; end if;
 -- Same lock order as normal save/claim-session: session, save, then letter/wallet.
 select * into session_row from public.game_sessions where user_id=u for update;
 if not found or session_row.instance_id is distinct from p_instance_id or session_row.auth_session_id is distinct from (auth.jwt()->>'session_id') then raise exception 'SESSION_REPLACED'; end if;
 select * into s from public.saves where user_id=u for update;
 select * into m from public.game_mail where id=p_mail and user_id=u and campaign_id='alphatest-v1' for update;
 if not found then raise exception 'MAIL_NOT_FOUND'; end if;
 if m.claimed_at is not null then
  return jsonb_build_object('already_claimed',true,'snapshot',s.data,'premium',public.premium_status(),'mail',to_jsonb(m)-'user_id'-'receipt');
 end if;
 if s.data is null or s.data#>>'{player,admitted}' is distinct from 'true' then raise exception 'ADMISSION_REQUIRED'; end if;
 p:=s.data->'player';
 if jsonb_typeof(p) is distinct from 'object' or coalesce(p->>'level','')!~'^\d{1,3}$'
 or coalesce(p->>'realmIndex','')!~'^\d{1,2}$' or coalesce(p->>'exp','')!~'^\d{1,15}$'
 or coalesce(p->>'linhKhi','')!~'^\d{1,15}$' then raise exception 'INVALID_REWARD_SAVE'; end if;
 lvl:=(p->>'level')::integer; exp_now:=(p->>'exp')::bigint;
 if lvl<1 or lvl>999 then raise exception 'INVALID_REWARD_SAVE'; end if;
 inv:=case when jsonb_typeof(p->'inventory')='object' then p->'inventory' else '{}'::jsonb end;
 if coalesce(inv->>'linh_thach','0')!~'^\d{1,15}$' then raise exception 'INVALID_REWARD_SAVE'; end if;
 if lvl<99 then
  for n in lvl..98 loop needed:=needed+round(300+120*power(n::double precision,1.65)+15*n*n)::bigint; end loop;
  needed:=greatest(0,needed-exp_now);
  p:=p||jsonb_build_object('level',99,'realmIndex',greatest(9,(p->>'realmIndex')::integer),'exp',0);
 end if;
 revision:=s.mail_reward_revision+1;
 inv:=inv||jsonb_build_object('linh_thach',coalesce((inv->>'linh_thach')::bigint,0)+99999);
 p:=p||jsonb_build_object('inventory',inv,'linhKhi',(p->>'linhKhi')::bigint+999999,'mailRevision',revision);
 next_data:=jsonb_set(s.data,'{player}',p)||jsonb_build_object('savedAt',floor(extract(epoch from clock_timestamp())*1000));
 update public.saves set data=next_data,mail_reward_revision=revision,updated_at=clock_timestamp() where user_id=u returning * into s;
 insert into public.premium_wallets(user_id) values(u) on conflict do nothing;
 perform 1 from public.premium_wallets where user_id=u for update;
 update public.premium_wallets set balance=balance+99999 where user_id=u;
 insert into public.premium_ledger(user_id,delta,reason,actor,request_id) values(u,99999,'Quà Alphatest qua thư',null,m.id);
 update public.game_mail set claimed_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp()),
 receipt=jsonb_build_object('revision',revision,'exp_applied',needed,'target_level',99,'jade',99999,'linh_thach',99999,'linh_khi',999999)
 where id=m.id returning * into m;
 return jsonb_build_object('already_claimed',false,'snapshot',s.data,'premium',public.premium_status(),'mail',to_jsonb(m)-'user_id'-'receipt');
end $$;

create or replace function public.admin_alphatest_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if auth.uid() is null or not public.is_game_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 return (select to_jsonb(c)||jsonb_build_object('delivered',(select count(*) from public.game_mail where campaign_id=c.id),
 'claimed',(select count(*) from public.game_mail where campaign_id=c.id and claimed_at is not null)) from public.game_mail_campaigns c where id='alphatest-v1');
end $$;
create or replace function public.admin_set_alphatest_delivery(p_enabled boolean,p_version integer) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ declare c public.game_mail_campaigns; begin
 if auth.uid() is null or not public.is_game_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 select * into c from public.game_mail_campaigns where id='alphatest-v1' for update;
 if p_enabled is null or c.version is distinct from p_version then raise exception 'CAMPAIGN_CONFLICT'; end if;
 update public.game_mail_campaigns set enabled=p_enabled,version=version+1,updated_at=clock_timestamp(),updated_by=auth.uid() where id=c.id;
 if to_regclass('public.admin_audit_logs') is not null then
  insert into public.admin_audit_logs(actor,kind,message,details) values(auth.uid(),'alphatest',case when p_enabled then 'Mở phát thư Alphatest' else 'Dừng phát thư Alphatest' end,jsonb_build_object('campaign',c.id,'enabled',p_enabled));
 end if;
 return public.admin_alphatest_status();
end $$;
revoke all on function public.game_mail_inbox(integer),public.read_game_mail(uuid),public.claim_alphatest_mail(uuid,uuid),public.admin_alphatest_status(),public.admin_set_alphatest_delivery(boolean,integer) from public,anon;
grant execute on function public.game_mail_inbox(integer),public.read_game_mail(uuid),public.claim_alphatest_mail(uuid,uuid),public.admin_alphatest_status(),public.admin_set_alphatest_delivery(boolean,integer) to authenticated;
notify pgrst,'reload schema';
commit;
