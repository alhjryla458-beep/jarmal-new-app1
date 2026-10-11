-- Restrict draft settings to active admins and expose only the published theme publicly.
create table if not exists public.app_design_public (
  id integer primary key default 1 check (id = 1),
  published jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.app_design_public enable row level security;
grant select on public.app_design_public to anon, authenticated;
grant insert, update on public.app_design_public to authenticated;
drop policy if exists "Public can read published app design" on public.app_design_public;
create policy "Public can read published app design"
on public.app_design_public for select to anon, authenticated using (true);
drop policy if exists "Admins can publish app design" on public.app_design_public;
create policy "Admins can publish app design"
on public.app_design_public for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)));
drop policy if exists "Admins can update published app design" on public.app_design_public;
create policy "Admins can update published app design"
on public.app_design_public for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)));

drop policy if exists "Public can read published app design" on public.app_design_settings;
drop policy if exists "Admins can read app design settings" on public.app_design_settings;
create policy "Admins can read app design settings"
on public.app_design_settings for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)));

insert into public.app_design_public (id, published, published_at, updated_at)
select id, published, published_at, now() from public.app_design_settings where id = 1
on conflict (id) do update set published = excluded.published, published_at = excluded.published_at, updated_at = now();
