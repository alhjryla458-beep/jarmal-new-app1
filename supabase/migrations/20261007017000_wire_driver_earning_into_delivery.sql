create or replace function public.driver_update_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_status not in ('on_the_way','delivered') then raise exception 'حالة غير صالحة لهذا الإجراء'; end if;

  if p_status = 'on_the_way' then
    update public.orders
    set status = 'on_the_way'
    where id = p_order_id
      and driver_id = auth.uid()
      and status = 'picked_up'
    returning * into v_order;
  else
    update public.orders
    set status = 'delivered'
    where id = p_order_id
      and driver_id = auth.uid()
      and status = 'on_the_way'
    returning * into v_order;

    if v_order is not null then
      perform public.fulfill_order_inventory(p_order_id);

      if v_order.payment_method <> 'cash'
         and v_order.payment_status = 'paid' then
        perform public.settle_order_to_merchant(p_order_id);
      end if;

      perform public.settle_driver_order_earning(p_order_id);
    end if;
  end if;

  if v_order is null then
    raise exception 'لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية أو الطلب غير موجود';
  end if;

  return v_order;
end;
$$;
