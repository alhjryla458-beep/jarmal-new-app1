-- Merchant withdrawal reservation and admin processing hardening
alter table public.merchant_wallets
  add column if not exists reserved_balance numeric not null default 0;

update public.merchant_wallets
set balance = coalesce(balance, 0),
    reserved_balance = greatest(coalesce(reserved_balance, 0), 0);

alter table public.merchant_wallets
  alter column balance set default 0,
  alter column balance set not null;

create or replace function public.request_merchant_withdrawal(p_amount numeric,p_payment_method_code text,p_account_number text,p_note text default null)
returns public.merchant_withdrawal_requests language plpgsql security definer set search_path=public
as $function$
declare v_user uuid:=auth.uid(); v_wallet public.merchant_wallets%rowtype; v_request public.merchant_withdrawal_requests%rowtype; v_method text:=lower(trim(coalesce(p_payment_method_code,'')));
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'invalid amount'; end if;
 if coalesce(trim(p_account_number),'')='' then raise exception 'account required'; end if;
 if v_method='onecash' then v_method='one_cash'; end if;
 if not exists(select 1 from public.payment_methods where code=v_method and is_active=true) then raise exception 'payment method unavailable'; end if;
 select * into v_wallet from public.merchant_wallets where merchant_id=v_user for update;
 if not found then raise exception 'wallet not found'; end if;
 if coalesce(v_wallet.balance,0)-coalesce(v_wallet.reserved_balance,0)<p_amount then raise exception 'available balance insufficient'; end if;
 if exists(select 1 from public.merchant_withdrawal_requests where merchant_id=v_user and status='pending') then raise exception 'pending withdrawal exists'; end if;
 update public.merchant_wallets set reserved_balance=coalesce(reserved_balance,0)+p_amount where id=v_wallet.id;
 insert into public.merchant_withdrawal_requests(merchant_id,amount,payment_method_code,account_number,note,status) values(v_user,p_amount,v_method,trim(p_account_number),nullif(trim(p_note),''),'pending') returning * into v_request;
 return v_request;
end; $function$;

create or replace function public.admin_approve_merchant_withdrawal(p_request_id uuid,p_admin_note text default null)
returns public.merchant_withdrawal_requests language plpgsql security definer set search_path=public
as $function$
declare v_admin uuid:=auth.uid(); v_request public.merchant_withdrawal_requests%rowtype; v_wallet public.merchant_wallets%rowtype;
begin
 if v_admin is null or not public.is_admin() then raise exception 'unauthorized'; end if;
 select * into v_request from public.merchant_withdrawal_requests where id=p_request_id for update;
 if not found then raise exception 'request not found'; end if;
 if v_request.status <> 'pending' then return v_request; end if;
 select * into v_wallet from public.merchant_wallets where merchant_id=v_request.merchant_id for update;
 if not found then raise exception 'wallet not found'; end if;
 if coalesce(v_wallet.reserved_balance,0)<v_request.amount then raise exception 'reserved balance insufficient'; end if;
 if coalesce(v_wallet.balance,0)<v_request.amount then raise exception 'balance insufficient'; end if;
 update public.merchant_wallets set balance=balance-v_request.amount,reserved_balance=reserved_balance-v_request.amount where id=v_wallet.id;
 update public.merchant_withdrawal_requests set status='approved',admin_note=nullif(trim(p_admin_note),''),processed_at=now() where id=v_request.id returning * into v_request;
 return v_request;
end; $function$;

create or replace function public.admin_process_merchant_withdrawal(p_request_id uuid,p_action text,p_admin_note text default null)
returns public.merchant_withdrawal_requests language plpgsql security definer set search_path=public
as $function$
declare v_admin uuid:=auth.uid(); v_request public.merchant_withdrawal_requests%rowtype; v_wallet public.merchant_wallets%rowtype; v_action text:=lower(trim(coalesce(p_action,'')));
begin
 if v_admin is null or not public.is_admin() then raise exception 'unauthorized'; end if;
 if v_action not in ('approve','reject') then raise exception 'invalid action'; end if;
 select * into v_request from public.merchant_withdrawal_requests where id=p_request_id for update;
 if not found then raise exception 'request not found'; end if;
 if v_request.status <> 'pending' then return v_request; end if;
 select * into v_wallet from public.merchant_wallets where merchant_id=v_request.merchant_id for update;
 if not found then raise exception 'wallet not found'; end if;
 if coalesce(v_wallet.reserved_balance,0)<v_request.amount then raise exception 'reserved balance insufficient'; end if;
 if v_action='approve' then
   if coalesce(v_wallet.balance,0)<v_request.amount then raise exception 'balance insufficient'; end if;
   update public.merchant_wallets set balance=balance-v_request.amount,reserved_balance=reserved_balance-v_request.amount where id=v_wallet.id;
   update public.merchant_withdrawal_requests set status='approved',admin_note=nullif(trim(p_admin_note),''),processed_at=now() where id=v_request.id;
 else
   update public.merchant_wallets set reserved_balance=reserved_balance-v_request.amount where id=v_wallet.id;
   update public.merchant_withdrawal_requests set status='rejected',admin_note=nullif(trim(p_admin_note),''),processed_at=now() where id=v_request.id;
 end if;
 select * into v_request from public.merchant_withdrawal_requests where id=p_request_id;
 return v_request;
end; $function$;

revoke all on function public.request_merchant_withdrawal(numeric,text,text,text) from public;
grant execute on function public.request_merchant_withdrawal(numeric,text,text,text) to authenticated;
revoke all on function public.admin_approve_merchant_withdrawal(uuid,text) from public;
grant execute on function public.admin_approve_merchant_withdrawal(uuid,text) to authenticated;
revoke all on function public.admin_process_merchant_withdrawal(uuid,text,text) from public;
grant execute on function public.admin_process_merchant_withdrawal(uuid,text,text) to authenticated;
revoke execute on function public.admin_approve_merchant_withdrawal(uuid,text) from anon;
revoke execute on function public.admin_process_merchant_withdrawal(uuid,text,text) from anon;
revoke execute on function public.request_merchant_withdrawal(numeric,text,text,text) from anon;
