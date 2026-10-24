-- Run after schema.sql. The browser never receives a service-role key.
create table if not exists public.game_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.premium_wallets (user_id uuid primary key references auth.users(id) on delete cascade,balance bigint not null default 0 check(balance>=0));
create table if not exists public.premium_entitlements (user_id uuid references auth.users(id) on delete cascade,item_id text not null,created_at timestamptz not null default now(),primary key(user_id,item_id));
create table if not exists public.premium_ledger (id bigint generated always as identity primary key,user_id uuid not null references auth.users(id),delta bigint not null,reason text not null,actor uuid references auth.users(id),request_id uuid,created_at timestamptz not null default now(),unique(user_id,request_id));
alter table public.game_admins enable row level security;
alter table public.premium_wallets enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.premium_ledger enable row level security;
revoke all on public.game_admins,public.premium_wallets,public.premium_entitlements,public.premium_ledger from anon,authenticated;
grant select on public.premium_wallets,public.premium_entitlements,public.premium_ledger to authenticated;
drop policy if exists own_wallet on public.premium_wallets;
create policy own_wallet on public.premium_wallets for select using(auth.uid()=user_id);
drop policy if exists own_entitlements on public.premium_entitlements;
create policy own_entitlements on public.premium_entitlements for select using(auth.uid()=user_id);
drop policy if exists own_ledger on public.premium_ledger;
create policy own_ledger on public.premium_ledger for select using(auth.uid()=user_id);

create or replace function public.is_game_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.game_admins where user_id=auth.uid()); $$;
create or replace function public.premium_status() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); begin
 if u is null then raise exception 'Cần đăng nhập'; end if;
 return jsonb_build_object('balance',coalesce((select balance from public.premium_wallets where user_id=u),0),'admin',public.is_game_admin(),'items',coalesce((select jsonb_agg(item_id) from public.premium_entitlements where user_id=u),'[]'::jsonb));
end; $$;

create or replace function public.admin_grant_tien_ngoc(target_username text,amount integer,note text,request_key uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid; begin
 if not public.is_game_admin() then raise exception 'Chỉ admin có quyền cấp Tiên Ngọc'; end if;
 if amount<=0 or amount>1000000 or length(btrim(note))<3 or request_key is null then raise exception 'Số lượng hoặc lý do không hợp lệ'; end if;
 select id into target from public.profiles where username_key=lower(btrim(target_username));
 if target is null then raise exception 'Không tìm thấy username'; end if;
 insert into public.premium_wallets(user_id) values(target) on conflict do nothing;
 perform 1 from public.premium_wallets where user_id=target for update;
 if exists(select 1 from public.premium_ledger where user_id=target and request_id=request_key) then return jsonb_build_object('ok',true,'duplicate',true);end if;
 update public.premium_wallets set balance=balance+amount where user_id=target;
 insert into public.premium_ledger(user_id,delta,reason,actor,request_id) values(target,amount,note,auth.uid(),request_key);
 return jsonb_build_object('ok',true);
end; $$;

create or replace function public.exchange_tien_ngoc(offer text,request_key uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); available bigint; begin
 if u is null then raise exception 'Cần đăng nhập';end if;
 if offer<>'tien_phap_bao' or request_key is null then raise exception 'Vật phẩm không hợp lệ';end if;
 insert into public.premium_wallets(user_id) values(u) on conflict do nothing;
 select balance into available from public.premium_wallets where user_id=u for update;
 if exists(select 1 from public.premium_entitlements where user_id=u and item_id=offer) then return public.premium_status();end if;
 if available<200 then raise exception 'Cần 200 Tiên Ngọc';end if;
 update public.premium_wallets set balance=balance-200 where user_id=u;
 insert into public.premium_entitlements(user_id,item_id) values(u,offer);
 insert into public.premium_ledger(user_id,delta,reason,actor,request_id) values(u,-200,'Đổi Thiên Ngọc Tiên Ấn',u,request_key);
 return public.premium_status();
end; $$;
revoke all on function public.is_game_admin(),public.premium_status(),public.admin_grant_tien_ngoc(text,integer,text,uuid),public.exchange_tien_ngoc(text,uuid) from public;
grant execute on function public.is_game_admin(),public.premium_status(),public.admin_grant_tien_ngoc(text,integer,text,uuid),public.exchange_tien_ngoc(text,uuid) to authenticated;
-- Bootstrap admin ONLY in the SQL Editor with the exact registered username:
-- insert into public.game_admins(user_id) select id from public.profiles where username_key=lower('YOUR_ADMIN_USERNAME') on conflict do nothing;
