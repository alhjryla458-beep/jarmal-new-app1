create or replace function public.settle_driver_order_earning(p_order_id uuid)
returns public.driver_order_earnings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_settings public.driver_earning_settings;
  v_wallet public.driver_wallets;
  v_earning numeric(12,2);
  v_inserted public.driver_order_earnings;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if v_order is null then raise exception 'الطلب غير موجود'; end if;
  if v_order.driver_id is null then raise exception 'الطلب لا يحتوي على مندوب'; end if;
  if v_order.status <> 'delivered' then raise exception 'لا يمكن احتساب الأجرة قبل تسليم الطلب'; end if;

  select * into v_inserted from public.driver_order_earnings where order_id=p_order_id;
  if v_inserted is not null then return v_inserted; end if;

  select * into v_settings from public.driver_earning_settings where id=true;
  if v_settings is null or not v_settings.is_active then
    return null;
  end if;

  v_earning := case v_settings.calculation_mode
    when 'fixed' then v_settings.fixed_amount
    when 'percentage' then coalesce(v_order.delivery_fee,0) * v_settings.percentage / 100
    when 'hybrid' then v_settings.fixed_amount + (coalesce(v_order.delivery_fee,0) * v_settings.percentage / 100)
  end;

  v_earning := greatest(v_earning, v_settings.minimum_amount);
  if v_settings.maximum_amount is not null then
    v_earning := least(v_earning, v_settings.maximum_amount);
  end if;
  v_earning := greatest(v_earning,0);

  insert into public.driver_order_earnings(order_id,driver_id,delivery_fee,earning_amount,calculation_mode)
  values(p_order_id,v_order.driver_id,coalesce(v_order.delivery_fee,0),v_earning,v_settings.calculation_mode)
  on conflict (order_id) do nothing
  returning * into v_inserted;

  if v_inserted is null then
    select * into v_inserted from public.driver_order_earnings where order_id=p_order_id;
    return v_inserted;
  end if;

  perform public.ensure_driver_wallet(v_order.driver_id);
  select * into v_wallet from public.driver_wallets where user_id=v_order.driver_id for update;
  update public.driver_wallets set balance=balance+v_earning where id=v_wallet.id;

  insert into public.wallet_transactions(user_id,transaction_type,amount,payment_method,transaction_status)
  values(v_order.driver_id,'earning',v_earning,'driver_delivery','completed');

  return v_inserted;
end;
$$;

revoke execute on function public.settle_driver_order_earning(uuid) from public, anon, authenticated;
grant execute on function public.settle_driver_order_earning(uuid) to service_role;
