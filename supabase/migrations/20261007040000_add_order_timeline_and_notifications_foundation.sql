create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_created_idx on public.order_status_history(order_id, created_at desc);
alter table public.order_status_history enable row level security;
create policy "order history visible to participants" on public.order_status_history for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_status_history.order_id and (o.customer_id = auth.uid() or o.driver_id = auth.uid() or o.store_id in (select s.id from public.stores s where s.merchant_id = auth.uid()) or public.is_admin())));
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text,
  order_id uuid references public.orders(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, is_read, created_at desc);
alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "users mark own notifications read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create or replace function public.record_order_event_and_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare store_owner uuid; actor uuid;
begin
  actor := auth.uid();
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by) values (new.id, null, new.status, actor);
    if new.customer_id is not null then
      insert into public.notifications(user_id, type, title, body, order_id) values (new.customer_id, 'order', 'تم إنشاء طلبك', 'تم استلام طلبك بنجاح.', new.id);
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by) values (new.id, old.status, new.status, actor);
    if new.customer_id is not null then
      insert into public.notifications(user_id, type, title, body, order_id) values (new.customer_id, 'order', 'تحديث حالة طلبك', 'تم تحديث حالة طلبك إلى: ' || new.status, new.id);
    end if;
    if new.driver_id is not null then
      insert into public.notifications(user_id, type, title, body, order_id) values (new.driver_id, 'order', 'تحديث طلب التوصيل', 'تم تحديث حالة الطلب إلى: ' || new.status, new.id);
    end if;
    select s.merchant_id into store_owner from public.stores s where s.id = new.store_id;
    if store_owner is not null then
      insert into public.notifications(user_id, type, title, body, order_id) values (store_owner, 'order', 'تحديث طلب المتجر', 'تم تحديث حالة الطلب إلى: ' || new.status, new.id);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_event_notification_trigger on public.orders;
create trigger orders_event_notification_trigger after insert or update of status on public.orders for each row execute function public.record_order_event_and_notification();