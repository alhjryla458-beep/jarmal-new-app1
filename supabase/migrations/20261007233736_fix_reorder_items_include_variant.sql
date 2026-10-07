create or replace function public.get_reorder_items(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = p_order_id
      and customer_id = auth.uid()
  ) then
    raise exception 'الطلب غير موجود';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'product_id', oi.product_id,
      'variant_id', oi.variant_id,
      'custom_name', oi.custom_name,
      'custom_price', case when oi.product_id is null then oi.unit_price end,
      'quantity', oi.quantity
    )
  )
  into v_result
  from public.order_items oi
  where oi.order_id = p_order_id;

  return coalesce(v_result, '[]'::jsonb);
end;
$function$;

revoke all on function public.get_reorder_items(uuid) from public, anon;
grant execute on function public.get_reorder_items(uuid) to authenticated, service_role;
