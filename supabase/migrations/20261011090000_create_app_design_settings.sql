create table if not exists public.app_design_settings (
  id integer primary key default 1 check (id = 1),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.app_design_settings enable row level security;

grant select on public.app_design_settings to anon, authenticated;
grant insert, update on public.app_design_settings to authenticated;

drop policy if exists "Public can read published app design" on public.app_design_settings;
create policy "Public can read published app design"
on public.app_design_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert app design settings" on public.app_design_settings;
create policy "Admins can insert app design settings"
on public.app_design_settings for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)
  )
);

drop policy if exists "Admins can update app design settings" on public.app_design_settings;
create policy "Admins can update app design settings"
on public.app_design_settings for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and coalesce(p.is_active, false)
  )
);

insert into public.app_design_settings (id, draft, published)
values (
  1,
  '{"brandName":"جَرْمَل","primaryColor":"#172b40","secondaryColor":"#122337","accentColor":"#dfff00","surfaceColor":"#ffffff","backgroundColor":"#f5f6f3","textColor":"#171a16","fontFamily":"Tajawal","borderRadius":"16","compactMode":false}'::jsonb,
  '{"brandName":"جَرْمَل","primaryColor":"#172b40","secondaryColor":"#122337","accentColor":"#dfff00","surfaceColor":"#ffffff","backgroundColor":"#f5f6f3","textColor":"#171a16","fontFamily":"Tajawal","borderRadius":"16","compactMode":false}'::jsonb
)
on conflict (id) do nothing;
