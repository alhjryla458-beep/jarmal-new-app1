create table if not exists public.driver_order_earnings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  driver_id uuid not null references auth.users(id) on delete restrict,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  earning_amount numeric(12,2) not null check (earning_amount >= 0),
  calculation_mode text not null check (calculation_mode in ('fixed','percentage','hybrid')),
  created_at timestamptz not null default now()
);

create unique index if not exists driver_order_earnings_order_unique on public.driver_order_earnings(order_id);
create index if not exists idx_driver_order_earnings_driver_created on public.driver_order_earnings(driver_id, created_at desc);

alter table public.driver_order_earnings enable row level security;
revoke all on table public.driver_order_earnings from anon, authenticated;
grant select on table public.driver_order_earnings to authenticated;

drop policy if exists "Drivers can view own order earnings" on public.driver_order_earnings;
create policy "Drivers can view own order earnings"
on public.driver_order_earnings for select to authenticated
using (driver_id = auth.uid() or public.is_admin());
