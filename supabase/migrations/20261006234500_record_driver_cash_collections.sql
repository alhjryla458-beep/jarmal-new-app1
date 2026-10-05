-- Record COD cash collected by drivers as an outstanding liability.
create table if not exists public.driver_cash_collections (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  driver_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  settled_amount numeric(12,2) not null default 0 check (settled_amount >= 0 and settled_amount <= amount),
  status text not null default 'open' check (status in ('open','settled')),
  collected_at timestamptz not null default now(),
  settled_at timestamptz,
  settled_by uuid references auth.users(id) on delete set null,
  settlement_note text
);
create index if not exists driver_cash_collections_driver_status_idx on public.driver_cash_collections(driver_id, status, collected_at);
alter table public.driver_cash_collections enable row level security;
revoke all on public.driver_cash_collections from anon, authenticated;
grant select on public.driver_cash_collections to authenticated;
create policy "driver_cash_collections_select_own" on public.driver_cash_collections for select to authenticated using ((select auth.uid()) = driver_id);
create policy "driver_cash_collections_select_admin" on public.driver_cash_collections for select to authenticated using (public.is_admin());
create or replace function public.record_driver_cash_collection() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_method = 'cash' and new.payment_status = 'paid' and new.driver_id is not null and (old.payment_status is distinct from 'paid') then
    insert into public.driver_cash_collections (order_id, driver_id, amount) values (new.id, new.driver_id, new.total_amount) on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.record_driver_cash_collection() from public, anon, authenticated;
drop trigger if exists orders_record_driver_cash_collection on public.orders;
create trigger orders_record_driver_cash_collection after update of payment_status on public.orders for each row execute function public.record_driver_cash_collection();
