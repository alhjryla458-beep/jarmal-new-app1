-- Applied directly to Supabase on 2026-10-06.
-- Source-control record for the production schema change.
-- Do not replay manually against the same database.

create or replace function public.merchant_respond_to_order(p_order_id uuid, p_accept boolean, p_reject_reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $function$
declare v_order public.orders;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;

  select o.* into v_order
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.id = p_order_id
    and (s.merchant_id = auth.uid()
         or public.is_active_store_member(s.id, array['owner','manager','orders_employee']::text[]));

  if v_order is null then raise exception 'الطلب غير موجود أو غير مخوّل للوصول إليه'; end if;
  if v_order.status <> 'pending' then raise exception 'تم الرد على هذا الطلب مسبقاً'; end if;

  if v_order.payment_method <> 'cash'
     and v_order.payment_status <> 'paid' then
    raise exception 'لا يمكن قبول الطلب الإلكتروني قبل تأكيد الدفع من الإدارة';
  end if;

  if not p_accept then
    perform public.release_order_inventory(p_order_id, coalesce(p_reject_reason, 'رفض الطلب من المتجر'));
  end if;

  update public.orders
  set status = case when p_accept then 'accepted' else 'rejected' end,
      notes = case when not p_accept and p_reject_reason is not null
                   then coalesce(notes || ' | ', '') || 'سبب الرفض: ' || p_reject_reason
                   else notes end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$function$;