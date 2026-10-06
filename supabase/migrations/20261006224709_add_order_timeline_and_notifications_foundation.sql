create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

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

create index if not exists order_status_history_order_created_idx
  on public.order_status_history(order_id, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, is_read, created_at desc);

alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "order history visible to participants" on public.order_status_history;
create policy "order history visible to participants"
on public.order_status_history for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_status_history.order_id
      and (o.customer_id = (select auth.uid()) or o.driver_id = (select auth.uid())
           or exists (
             select 1 from public.store_members sm
             where sm.store_id = o.store_id
               and sm.user_id = (select auth.uid())
               and sm.status = 'active'
           )
           or public.is_admin()
      )
  )
);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "admin create notifications" on public.notifications;
create policy "admin create notifications"
on public.notifications for insert to authenticated
with check (public.is_admin());