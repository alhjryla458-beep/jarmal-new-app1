create or replace function public.admin_confirm_wallet_transaction(p_transaction_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_tx record;
  v_role text;
  v_signed_amount numeric;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح: هذه العملية للإدارة فقط';
  end if;

  select * into v_tx
  from public.wallet_transactions
  where id = p_transaction_id
  for update;

  if not found then raise exception 'العملية غير موجودة'; end if;
  if v_tx.transaction_status <> 'pending' then raise exception 'تمت معالجة هذه العملية مسبقاً'; end if;

  if p_action = 'reject' then
    update public.wallet_transactions set transaction_status = 'rejected' where id = p_transaction_id;
    return;
  end if;

  if p_action <> 'confirm' then raise exception 'إجراء غير معروف'; end if;

  select role into v_role from public.profiles where id = v_tx.user_id;

  if v_tx.transaction_type = 'topup' then
    v_signed_amount := v_tx.amount;
  elsif v_tx.transaction_type = 'withdrawal' then
    v_signed_amount := -v_tx.amount;
  else
    raise exception 'نوع حركة المحفظة لا يدعم التأكيد الإداري';
  end if;

  if v_role = 'driver' then
    update public.driver_wallets set balance = coalesce(balance, 0) + v_signed_amount where user_id = v_tx.user_id;
  elsif v_role = 'merchant' then
    update public.merchant_wallets set balance = coalesce(balance, 0) + v_signed_amount where merchant_id = v_tx.user_id;
  else
    update public.client_wallets set balance = coalesce(balance, 0) + v_signed_amount where user_id = v_tx.user_id;
  end if;

  update public.wallet_transactions set transaction_status = 'completed' where id = p_transaction_id;
end;
$function$;

revoke execute on function public.admin_confirm_wallet_transaction(uuid,text) from public, anon;
grant execute on function public.admin_confirm_wallet_transaction(uuid,text) to authenticated;
grant execute on function public.admin_confirm_wallet_transaction(uuid,text) to service_role;
