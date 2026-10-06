create table if not exists public.driver_earning_settings (
  id boolean primary key default true,
  calculation_mode text not null default 'percentage'
    check (calculation_mode in ('fixed','percentage','hybrid')),
  fixed_amount numeric(12,2) not null default 0
    check (fixed_amount >= 0),
  percentage numeric(5,2) not null default 0
    check (percentage >= 0 and percentage <= 100),
  minimum_amount numeric(12,2) not null default 0
    check (minimum_amount >= 0),
  maximum_amount numeric(12,2)
    check (maximum_amount is null or maximum_amount >= minimum_amount),
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.driver_earning_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.driver_earning_settings enable row level security;
revoke all on table public.driver_earning_settings from anon, authenticated;
grant select on table public.driver_earning_settings to authenticated;

drop policy if exists "Admins can view driver earning settings" on public.driver_earning_settings;
create policy "Admins can view driver earning settings"
on public.driver_earning_settings
for select to authenticated
using (public.is_admin());

revoke execute on function public.ensure_driver_wallet(uuid) from public, anon, authenticated;
grant execute on function public.ensure_driver_wallet(uuid) to service_role;
