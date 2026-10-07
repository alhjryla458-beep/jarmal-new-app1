-- Prevent a driver from accepting multiple active orders concurrently.
-- The driver_profiles row is locked before checking for an existing active order.
create or replace function public.driver_accept_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.orders;
  v_available boolean;
  v_verification_status text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select is_available, verification_status
    into v_available, v_verification_status
  from public.driver_profiles
  where id = auth.uid()
  for update;

  if v_verification_status is distinct from 'approved' then
    raise exception 'حساب المندوب لم يُعتمد من الإدارة بعد';
  end if;

  if v_available is distinct from true then
    raise exception 'يجب تفعيل حالة "متاح" أولاً لاستلام الطلبات';
  end if;

  if exists (
    select 1
    from public.orders
    where driver_id = auth.uid()
      and status not in ('delivered','cancelled','rejected')
  ) then
    raise exception 'لديك طلب نشط بالفعل ويجب إكماله قبل استلام طلب آخر';
  end if;

  update public.orders
  set driver_id = auth.uid(),
      status = 'picked_up'
  where id = p_order_id
    and driver_id is null
    and status = 'ready_for_pickup'
  returning * into v_order;

  if v_order is null then
    raise exception 'الطلب لم يعد متاحاً (ربما استلمه مندوب آخر أو لم يجهّزه المتجر بعد)';
  end if;

  return v_order;
end;
$function$;

revoke all on function public.driver_accept_order(uuid) from public, anon, authenticated;
grant execute on function public.driver_accept_order(uuid) to authenticated, service_role;
