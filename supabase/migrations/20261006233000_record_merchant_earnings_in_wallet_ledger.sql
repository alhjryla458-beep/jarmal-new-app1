-- Already applied directly to the connected Supabase project.
-- Source-control record for the merchant financial ledger fix.
-- Every new successful merchant settlement now records an earning entry
-- in wallet_transactions using the same merchant user and order payment method.
-- Existing balances and historical records are not modified.

create or replace function public.settle_order_to_merchant(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.orders;
  v_commission_rate numeric;
  v_commission_amount numeric;
  v_merchant_id uuid;
  v_net_amount numeric;
  v_product_value numeric;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id;

  if v_order is null or v_order.store_id is null then
    return;
  end if;

  if v_order.payment_status <> 'paid' or v_order.status <> 'delivered' then
    raise exception 'لا يمكن تسوية التاجر قبل تسليم الطلب وتأكيد الدفع';
  end if;

  if exists (
    select 1 from public.platform_revenue_log
    where order_id = p_order_id and entry_type = 'commission'
  ) then
    return;
  end if;

  select merchant_id, commission_rate
  into v_merchant_id, v_commission_rate
  from public.stores
  where id = v_order.store_id;

  if v_merchant_id is null then
    return;
  end if;

  select coalesce(
    sum(unit_price * quantity),
    v_order.total_amount - v_order.delivery_fee
  )
  into v_product_value
  from public.order_items
  where order_id = p_order_id;

  v_commission_amount := round(v_product_value * v_commission_rate, 2);
  v_net_amount := v_product_value - v_commission_amount;

  insert into public.merchant_wallets (merchant_id, balance)
  values (v_merchant_id, v_net_amount)
  on conflict (merchant_id) do update
  set balance = public.merchant_wallets.balance + v_net_amount;

  insert into public.wallet_transactions
    (user_id, transaction_type, amount, payment_method, transaction_status)
  values
    (v_merchant_id, 'earning', v_net_amount, v_order.payment_method, 'completed');

  insert into public.platform_revenue_log
    (order_id, store_id, order_amount, commission_rate, commission_amount, entry_type)
  values
    (p_order_id, v_order.store_id, v_product_value, v_commission_rate, v_commission_amount, 'commission');
end;
$function$;
