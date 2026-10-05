alter table public.driver_wallets
  add column if not exists reserved_balance numeric(12,2) not null default 0;

alter table public.driver_wallets
  drop constraint if exists driver_wallets_reserved_balance_check;

alter table public.driver_wallets
  add constraint driver_wallets_reserved_balance_check
  check (reserved_balance >= 0 and reserved_balance <= coalesce(balance,0));

create table if not exists public.driver_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method_code text not null,
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null
);

create index if not exists driver_withdrawal_requests_driver_status_idx
  on public.driver_withdrawal_requests(driver_id, status, created_at desc);

alter table public.driver_withdrawal_requests enable row level security;

revoke all on table public.driver_withdrawal_requests from anon, authenticated;
grant select on table public.driver_withdrawal_requests to authenticated;

drop policy if exists driver_withdrawals_select_own_or_admin on public.driver_withdrawal_requests;
create policy driver_withdrawals_select_own_or_admin
on public.driver_withdrawal_requests
for select
to authenticated
using ((select auth.uid()) = driver_id or public.is_admin());

revoke insert, update, delete on table public.driver_wallets from anon, authenticated;
revoke insert, update, delete on table public.wallet_transactions from anon, authenticated;

create or replace function public.request_driver_wallet_withdrawal(
  p_amount numeric,
  p_payment_method_code text,
  p_account_number text,
  p_note text default null
)
returns public.driver_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_driver_id uuid := auth.uid();
  v_wallet public.driver_wallets;
  v_available numeric;
  v_request public.driver_withdrawal_requests;
begin
  if v_driver_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;
  if not exists (select 1 from public.profiles where id = v_driver_id and role = 'driver' and is_active = true) then
    raise exception 'الحساب ليس حساب مندوب نشط';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'المبلغ غير صالح';
  end if;
  if p_account_number is null or btrim(p_account_number) = '' then
    raise exception 'رقم الحساب مطلوب';
  end if;
  if not exists (
    select 1 from public.payment_methods
    where code = p_payment_method_code and is_active = true and code <> 'cash'
  ) then
    raise exception 'طريقة السحب غير متاحة';
  end if;

  select * into v_wallet
  from public.driver_wallets
  where user_id = v_driver_id
  for update;

  if not found then
    raise exception 'محفظة المندوب غير موجودة';
  end if;

  v_available := coalesce(v_wallet.balance,0) - coalesce(v_wallet.reserved_balance,0);
  if p_amount > v_available then
    raise exception 'المبلغ يتجاوز الرصيد المتاح للسحب';
  end if;

  if exists (
    select 1 from public.driver_withdrawal_requests
    where driver_id = v_driver_id and status = 'pending'
  ) then
    raise exception 'لديك طلب سحب قيد المراجعة بالفعل';
  end if;

  update public.driver_wallets
  set reserved_balance = coalesce(reserved_balance,0) + p_amount
  where user_id = v_driver_id;

  insert into public.driver_withdrawal_requests
    (driver_id, amount, payment_method_code, account_number, note)
  values
    (v_driver_id, p_amount, p_payment_method_code, btrim(p_account_number), nullif(btrim(coalesce(p_note,'')), ''))
  returning * into v_request;

  return v_request;
end;
$function$;

create or replace function public.admin_process_driver_wallet_withdrawal(
  p_request_id uuid,
  p_action text,
  p_admin_note text default null
)
returns public.driver_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_request public.driver_withdrawal_requests;
  v_wallet public.driver_wallets;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح: هذه العملية للإدارة فقط';
  end if;

  select * into v_request
  from public.driver_withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'طلب السحب غير موجود';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'تمت معالجة طلب السحب مسبقاً';
  end if;

  if p_action = 'reject' then
    update public.driver_wallets
    set reserved_balance = greatest(0, coalesce(reserved_balance,0) - v_request.amount)
    where user_id = v_request.driver_id
    returning * into v_wallet;

    if not found then
      raise exception 'محفظة المندوب غير موجودة';
    end if;

    update public.driver_withdrawal_requests
    set status = 'rejected',
        admin_note = p_admin_note,
        processed_at = now(),
        processed_by = auth.uid()
    where id = p_request_id
    returning * into v_request;

    return v_request;
  end if;

  if p_action <> 'approve' then
    raise exception 'إجراء غير معروف';
  end if;

  update public.driver_wallets
  set balance = coalesce(balance,0) - v_request.amount,
      reserved_balance = coalesce(reserved_balance,0) - v_request.amount
  where user_id = v_request.driver_id
    and coalesce(balance,0) >= v_request.amount
    and coalesce(reserved_balance,0) >= v_request.amount
  returning * into v_wallet;

  if not found then
    raise exception 'الرصيد المحجوز للمندوب غير كافٍ';
  end if;

  insert into public.wallet_transactions
    (user_id, transaction_type, amount, payment_method, transaction_status)
  values
    (v_request.driver_id, 'withdrawal', v_request.amount, v_request.payment_method_code, 'completed');

  update public.driver_withdrawal_requests
  set status = 'approved',
      admin_note = p_admin_note,
      processed_at = now(),
      processed_by = auth.uid()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$function$;

revoke execute on function public.request_driver_wallet_withdrawal(numeric,text,text,text) from public, anon;
grant execute on function public.request_driver_wallet_withdrawal(numeric,text,text,text) to authenticated;

revoke execute on function public.admin_process_driver_wallet_withdrawal(uuid,text,text) from public, anon;
grant execute on function public.admin_process_driver_wallet_withdrawal(uuid,text,text) to authenticated, service_role;
