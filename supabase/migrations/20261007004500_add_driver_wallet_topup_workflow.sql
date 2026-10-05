create or replace function public.request_driver_wallet_topup(
  p_amount numeric,
  p_payment_method_code text,
  p_reference_number text default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_driver_id uuid := auth.uid();
  v_tx public.wallet_transactions;
begin
  if v_driver_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_driver_id and role = 'driver' and is_active = true
  ) then
    raise exception 'الحساب ليس حساب مندوب نشط';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'المبلغ غير صالح';
  end if;
  if not exists (
    select 1 from public.payment_methods
    where code = p_payment_method_code and is_active = true and code <> 'cash'
  ) then
    raise exception 'طريقة الشحن غير متاحة';
  end if;
  if exists (
    select 1 from public.wallet_transactions
    where user_id = v_driver_id
      and transaction_type = 'topup'
      and transaction_status = 'pending'
  ) then
    raise exception 'لديك طلب شحن قيد المراجعة بالفعل';
  end if;

  insert into public.wallet_transactions
    (user_id, transaction_type, amount, payment_method, transaction_status)
  values
    (v_driver_id, 'topup', p_amount, p_payment_method_code, 'pending')
  returning * into v_tx;

  return v_tx;
end;
$function$;

revoke execute on function public.request_driver_wallet_topup(numeric,text,text) from public, anon;
grant execute on function public.request_driver_wallet_topup(numeric,text,text) to authenticated;
