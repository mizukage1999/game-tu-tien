-- Generated upgrade: admin items through mail, and a 60-second maintenance announcement.
-- Run after admin-operations.sql and alphatest-mail.sql. Existing saves are not rewritten.
begin;
alter table public.game_server_control add column if not exists maintenance_at timestamptz;

create or replace function public.admin_queue_item_mail(p_id uuid,p_user uuid,p_payload jsonb,p_reason text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare item text:=p_payload->>'item'; meta jsonb; qty integer; campaign text:='admin-grant:'||p_id::text; letter uuid;
begin
 perform public.admin_dashboard_require_access();
 if p_user is null then raise exception 'ACCOUNT_REQUIRED';end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'ACCOUNT_NOT_FOUND';end if;
 select data into meta from public.game_admin_catalog where kind='item' and id=item;
 if meta is null or coalesce(p_payload->>'quantity','')!~'^\d{1,6}$' then raise exception 'INVALID_ITEM';end if;
 qty:=(p_payload->>'quantity')::integer;
 if qty not between 1 and 100000 or (meta ? 'slot' and qty>100) or (item='tien_phap_bao' and qty<>1) then raise exception 'INVALID_QUANTITY';end if;
 insert into public.game_mail_campaigns(id,enabled,title,body,rewards,updated_by)
 values(campaign,false,'Vật phẩm từ Ban Điều Hành',p_reason,jsonb_build_object('items',jsonb_build_object(item,qty),'requiresAdmission',false),auth.uid());
 insert into public.game_mail(user_id,campaign_id,title,body,rewards)
 select p_user,id,title,body,rewards from public.game_mail_campaigns where id=campaign returning id into letter;
 return jsonb_build_object('delivery','mail','mail',letter);
end $$;
revoke all on function public.admin_queue_item_mail(uuid,uuid,jsonb,text) from public,anon,authenticated;

create or replace function public.claim_game_mail(p_mail uuid,p_instance_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); lease public.game_sessions; s public.saves; m public.game_mail;
 p jsonb; inv jsonb; next_data jsonb; item text; amount jsonb; meta jsonb; qty integer; n bigint; key text; revision integer;
begin
 if u is null then raise exception 'LOGIN_REQUIRED';end if;
 -- Match the normal save lock order; serialize admin edits, saves, and claims for this account.
 perform pg_advisory_xact_lock(hashtextextended(u::text,42));
 select * into lease from public.game_sessions where user_id=u for update;
 if not found or lease.instance_id is distinct from p_instance_id or lease.auth_session_id is distinct from (auth.jwt()->>'session_id') or not public.game_access_allowed(u) then raise exception 'SESSION_REPLACED';end if;
 select * into s from public.saves where user_id=u for update;
 if not found then raise exception 'SAVE_NOT_FOUND';end if;
 select * into m from public.game_mail where id=p_mail and user_id=u for update;
 if not found then raise exception 'MAIL_NOT_FOUND';end if;
 if m.campaign_id='alphatest-v1' then return public.claim_alphatest_mail(p_mail,p_instance_id);end if;
 if m.campaign_id not like 'admin-grant:%' then raise exception 'MAIL_NOT_CLAIMABLE';end if;
 if m.claimed_at is not null then return jsonb_build_object('already_claimed',true,'snapshot',s.data,'premium',public.premium_status(),'mail',to_jsonb(m)-'user_id'-'receipt');end if;
 if jsonb_typeof(m.rewards->'items') is distinct from 'object' then raise exception 'INVALID_MAIL_REWARDS';end if;
 p:=s.data->'player';
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'INVALID_REWARD_SAVE';end if;
 inv:=case when jsonb_typeof(p->'inventory')='object' then p->'inventory' else '{}'::jsonb end;
 for item,amount in select part.key,part.value from jsonb_each(m.rewards->'items') part loop
  select data into meta from public.game_admin_catalog where kind='item' and id=item;
  if meta is null or jsonb_typeof(amount) is distinct from 'number' or amount::text!~'^\d{1,6}$' then raise exception 'INVALID_MAIL_REWARDS';end if;
  qty:=amount::text::integer;
  if qty not between 1 and 100000 or (meta ? 'slot' and qty>100) then raise exception 'INVALID_MAIL_REWARDS';end if;
  if item='linh_khi' then
   if coalesce(p->>'linhKhi','0')!~'^\d{1,15}$' then raise exception 'INVALID_REWARD_SAVE';end if;
   p:=p||jsonb_build_object('linhKhi',coalesce((p->>'linhKhi')::bigint,0)+qty);
  elsif item='tien_phap_bao' then
   if qty<>1 then raise exception 'INVALID_MAIL_REWARDS';end if;
   insert into public.premium_entitlements(user_id,item_id) values(u,item) on conflict do nothing;
   inv:=inv||jsonb_build_object(item,1);
  elsif meta ? 'slot' then
   for n in 1..qty loop key:=item||'~'||replace(gen_random_uuid()::text,'-','');inv:=inv||jsonb_build_object(key,1);end loop;
  else
   if coalesce(inv->>item,'0')!~'^\d{1,9}$' then raise exception 'INVALID_REWARD_SAVE';end if;
   n:=coalesce((inv->>item)::bigint,0)+qty;
   if n>999999999 then raise exception 'INVALID_QUANTITY';end if;
   inv:=inv||jsonb_build_object(item,n);
  end if;
 end loop;
 revision:=s.mail_reward_revision+1;
 p:=p||jsonb_build_object('inventory',inv,'mailRevision',revision);
 next_data:=jsonb_set(s.data,'{player}',p)||jsonb_build_object('savedAt',floor(extract(epoch from clock_timestamp())*1000));
 update public.saves set data=next_data,mail_reward_revision=revision,updated_at=clock_timestamp() where user_id=u returning * into s;
 update public.game_mail set claimed_at=clock_timestamp(),read_at=coalesce(read_at,clock_timestamp()),receipt=jsonb_build_object('revision',revision,'items',m.rewards->'items') where id=m.id returning * into m;
 return jsonb_build_object('already_claimed',false,'snapshot',s.data,'premium',public.premium_status(),'mail',to_jsonb(m)-'user_id'-'receipt');
end $$;
revoke all on function public.claim_game_mail(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_game_mail(uuid,uuid) to authenticated;

-- @CONTROL_FUNCTIONS@
notify pgrst,'reload schema';
commit;
