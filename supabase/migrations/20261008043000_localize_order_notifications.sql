create or replace function public.record_order_event_and_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  store_owner uuid;
  actor uuid;
  status_label text;
begin
  actor := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, actor);

    if new.customer_id is not null then
      insert into public.notifications(user_id, type, title, body, order_id)
      values (new.customer_id, 'order', 'تم إنشاء طلبك', 'تم استلام طلبك بنجاح.', new.id);
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    status_label := case new.status
      when 'pending' then 'قيد المراجعة'
      when 'accepted' then 'تم قبول الطلب'
      when 'preparing' then 'جاري تجهيز الطلب'
      when 'ready_for_pickup' then 'جاهز للاستلام'
      when 'picked_up' then 'تم استلام الطلب من المتجر'
      when 'on_the_way' then 'الطلب في الطريق إليك'
      when 'delivered' then 'تم تسليم الطلب'
      when 'cancelled' then 'تم إلغاء الطلب'
      when 'rejected' then 'تم رفض الطلب'
      else new.status
    end;

    insert into public.order_status_history(order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, actor);

    if new.customer_id is not null then
      insert into public.notifications(user_id, type, title, body, order_id)
      values (new.customer_id, 'order', 'تحديث حالة طلبك', 'تم تحديث حالة طلبك إلى: ' || status_label, new.id);
    end if;

    if new.driver_id is not null then
      insert into public.notifications(user_id, type, title, body, order_id)
      values (new.driver_id, 'order', 'تحديث طلب التوصيل', 'حالة الطلب الآن: ' || status_label, new.id);
    end if;

    select s.merchant_id into store_owner
    from public.stores s
    where s.id = new.store_id;

    if store_owner is not null then
      insert into public.notifications(user_id, type, title, body, order_id)
      values (store_owner, 'order', 'تحديث طلب المتجر', 'حالة الطلب الآن: ' || status_label, new.id);
    end if;
  end if;

  return new;
end;
$function$;
