-- Secure live driver tracking: validated writes and customer-scoped reads.
create or replace function public.update_driver_location(p_latitude double precision, p_longitude double precision)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_is_available boolean;
  v_verification_status text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'إحداثيات الموقع غير صالحة';
  end if;
  select is_available, verification_status into v_is_available, v_verification_status
  from public.driver_profiles where id = auth.uid() for update;
  if not found then raise exception 'لا يوجد ملف مندوب مرتبط بحسابك'; end if;
  if v_verification_status is distinct from 'approved' then raise exception 'حساب المندوب لم يُعتمد من الإدارة بعد'; end if;
  if v_is_available is distinct from true and not exists (
    select 1 from public.orders where driver_id = auth.uid() and status in ('picked_up','on_the_way')
  ) then
    raise exception 'يجب أن يكون المندوب متاحاً أو في طلب نشط';
  end if;
  update public.driver_profiles
  set current_latitude = p_latitude, current_longitude = p_longitude
  where id = auth.uid();
end;
$function$;

create or replace function public.get_customer_order_driver_location(p_order_id uuid)
returns table(driver_latitude double precision, driver_longitude double precision)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  return query
  select dp.current_latitude, dp.current_longitude
  from public.orders o
  join public.driver_profiles dp on dp.id = o.driver_id
  where o.id = p_order_id
    and o.customer_id = auth.uid()
    and o.fulfillment_type <> 'pickup'
    and o.status in ('accepted','preparing','ready_for_pickup','picked_up','on_the_way')
    and o.driver_id is not null
    and dp.current_latitude is not null
    and dp.current_longitude is not null;
end;
$function$;

revoke all on function public.update_driver_location(double precision,double precision) from public, anon;
grant execute on function public.update_driver_location(double precision,double precision) to authenticated, service_role;
revoke all on function public.get_customer_order_driver_location(uuid) from public, anon;
grant execute on function public.get_customer_order_driver_location(uuid) to authenticated, service_role;