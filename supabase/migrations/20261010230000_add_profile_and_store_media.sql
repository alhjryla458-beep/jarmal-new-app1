-- Jarmal delivery media: profile avatars, product images, and store branding.
alter table public.stores
  add column if not exists logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists cover_image_wide_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jarmal-media', 'jarmal-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Jarmal media public read') then
    create policy "Jarmal media public read" on storage.objects for select to public
      using (bucket_id = 'jarmal-media');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Jarmal profile media upload own folder') then
    create policy "Jarmal profile media upload own folder" on storage.objects for insert to authenticated
      with check (bucket_id = 'jarmal-media' and (storage.foldername(name))[1] = 'profiles'
        and (storage.foldername(name))[2] = (select auth.uid())::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Jarmal store media upload staff') then
    create policy "Jarmal store media upload staff" on storage.objects for insert to authenticated
      with check (
        bucket_id = 'jarmal-media' and (storage.foldername(name))[1] = 'stores'
        and exists (
          select 1 from public.stores s
          where s.id::text = (storage.foldername(name))[2]
            and (s.merchant_id = (select auth.uid()) or exists (
              select 1 from public.store_members sm
              where sm.store_id = s.id and sm.user_id = (select auth.uid())
                and sm.is_active = true and sm.member_role in ('owner','manager')
            ))
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Jarmal media update own folder') then
    create policy "Jarmal media update own folder" on storage.objects for update to authenticated
      using (
        bucket_id = 'jarmal-media' and (
          ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
          or ((storage.foldername(name))[1] = 'stores' and exists (
            select 1 from public.stores s
            where s.id::text = (storage.foldername(name))[2]
              and (s.merchant_id = (select auth.uid()) or exists (
                select 1 from public.store_members sm
                where sm.store_id = s.id and sm.user_id = (select auth.uid())
                  and sm.is_active = true and sm.member_role in ('owner','manager')
              ))
          ))
        )
      )
      with check (
        bucket_id = 'jarmal-media' and (
          ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
          or ((storage.foldername(name))[1] = 'stores' and exists (
            select 1 from public.stores s
            where s.id::text = (storage.foldername(name))[2]
              and (s.merchant_id = (select auth.uid()) or exists (
                select 1 from public.store_members sm
                where sm.store_id = s.id and sm.user_id = (select auth.uid())
                  and sm.is_active = true and sm.member_role in ('owner','manager')
              ))
          ))
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Jarmal media delete own folder') then
    create policy "Jarmal media delete own folder" on storage.objects for delete to authenticated
      using (
        bucket_id = 'jarmal-media' and (
          ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
          or ((storage.foldername(name))[1] = 'stores' and exists (
            select 1 from public.stores s
            where s.id::text = (storage.foldername(name))[2]
              and (s.merchant_id = (select auth.uid()) or exists (
                select 1 from public.store_members sm
                where sm.store_id = s.id and sm.user_id = (select auth.uid())
                  and sm.is_active = true and sm.member_role in ('owner','manager')
              ))
          ))
        )
      );
  end if;
end $$;
