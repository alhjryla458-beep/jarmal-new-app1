-- Restrict inventory fulfillment to delivered orders and trusted actors.
-- This migration intentionally changes database code only when applied through the reviewed migration process.
CREATE OR REPLACE FUNCTION public.fulfill_order_inventory(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_order public.orders;
  v_res record;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select *
    into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'الطلب غير موجود';
  end if;

  if v_order.status is distinct from 'delivered' then
    raise exception 'لا يمكن إتمام المخزون قبل تسليم الطلب';
  end if;

  if not (v_order.driver_id = auth.uid() or public.is_admin()) then
    raise exception 'غير مخوّل لإتمام مخزون هذا الطلب';
  end if;

  for v_res in
    select ir.*, pi.store_id, pi.product_id, pi.variant_id,
           pi.quantity_on_hand, pi.quantity_reserved
    from public.inventory_reservations ir
    join public.product_inventory pi on pi.id = ir.inventory_id
    where ir.order_id = p_order_id and ir.status = 'reserved'
    for update of ir, pi
  loop
    if v_res.quantity_reserved < v_res.quantity
       or v_res.quantity_on_hand < v_res.quantity then
      raise exception 'بيانات المخزون غير كافية لإتمام الطلب';
    end if;

    update public.product_inventory
    set quantity_on_hand = quantity_on_hand - v_res.quantity,
        quantity_reserved = quantity_reserved - v_res.quantity,
        updated_at = now()
    where id = v_res.inventory_id;

    update public.inventory_reservations
    set status = 'fulfilled', fulfilled_at = now()
    where id = v_res.id;

    insert into public.inventory_movements (
      store_id, inventory_id, product_id, variant_id, movement_type,
      quantity, quantity_before, quantity_after, reason, reference_type,
      reference_id, actor_user_id
    ) values (
      v_res.store_id, v_res.inventory_id, v_res.product_id, v_res.variant_id,
      'sale_out', v_res.quantity, v_res.quantity_on_hand,
      v_res.quantity_on_hand - v_res.quantity, 'إتمام طلب',
      'order', p_order_id, auth.uid()
    );
  end loop;

  return true;
end;
$function$;

-- The app calls this only through driver_update_order_status (a SECURITY DEFINER
-- workflow). Prevent direct RPC calls by customers, merchants, and drivers.
REVOKE EXECUTE ON FUNCTION public.fulfill_order_inventory(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_order_inventory(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_order_inventory(uuid) FROM authenticated;
