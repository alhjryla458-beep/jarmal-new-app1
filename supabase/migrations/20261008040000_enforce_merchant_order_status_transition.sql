-- Enforce the merchant order lifecycle at the database boundary.
-- accepted -> preparing -> ready_for_pickup only.
create or replace function public.merchant_update_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if p_status not in ('preparing', 'ready_for_pickup') then
    raise exception 'حالة غير صالحة لهذا الإجراء';
  end if;

  update public.orders o
  set status = p_status
  from public.stores s
  where o.id = p_order_id
    and s.id = o.store_id
    and (
      s.merchant_id = auth.uid()
      or public.is_active_store_member(
        s.id,
        array['owner','manager','orders_employee','warehouse_employee']::text[]
      )
    )
    and (
      (o.status = 'accepted' and p_status = 'preparing')
      or
      (o.status = 'preparing' and p_status = 'ready_for_pickup')
    )
  returning o.* into v_order;

  if v_order is null then
    raise exception 'لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية أو الطلب غير موجود';
  end if;

  return v_order;
end;
$function$;
