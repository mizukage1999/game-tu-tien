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

create or replace function public.game_access_allowed(p_user uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select p_user is not null and exists(select 1 from auth.users where id=p_user)
 and not exists(select 1 from public.game_account_blocks where user_id=p_user)
 and (not (select maintenance from public.game_server_control where id) or (select maintenance_at>clock_timestamp() from public.game_server_control where id) or exists(select 1 from public.game_admins where user_id=p_user));
$$;

create or replace function public.game_control_status(p_map text default '') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 return (select to_jsonb(c)||jsonb_build_object('admin',public.is_game_admin(),'blocked',exists(select 1 from public.game_account_blocks where user_id=auth.uid()),
 'boss_resets',coalesce((select jsonb_agg(to_jsonb(r)) from public.game_boss_resets r where map_id=p_map),'[]'::jsonb)) from public.game_server_control c where id);
end $$;

create or replace function public.admin_operations_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 perform public.admin_dashboard_require_access();
 return (select to_jsonb(c)||jsonb_build_object('item_delivery',case when to_regprocedure('public.admin_queue_item_mail(uuid,uuid,jsonb,text)') is null then 'unavailable' else 'mail' end,'maintenance_notice_seconds',60,'bosses',coalesce((select jsonb_agg(data||jsonb_build_object('id',id)) from public.game_admin_catalog where kind='boss'),'[]'::jsonb),
 'pending_auth',coalesce((select jsonb_agg(to_jsonb(j)) from (select id,kind,target,payload,reason,created_at from public.admin_commands where actor=auth.uid() and status='pending' and kind like 'auth_%' order by created_at limit 50) j),'[]'::jsonb)) from public.game_server_control c where id);
end $$;

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
   maintenance_at=case when (p_payload->>'enabled')::boolean then clock_timestamp()+interval '60 seconds' else null end,version=version+1 where id;
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
notify pgrst,'reload schema';
commit;
