-- Fix column resolution inside store-media storage policies.
-- Qualify the outer storage.objects.name so it is not resolved as stores.name.
drop policy if exists "Jarmal store media upload staff" on storage.objects;
create policy "Jarmal store media upload staff"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'jarmal-media'
  and (storage.foldername(name))[1] = 'stores'
  and exists (
    select 1
    from public.stores s
    where s.id::text = (storage.foldername(objects.name))[2]
      and (
        s.merchant_id = (select auth.uid())
        or exists (
          select 1
          from public.store_members sm
          where sm.store_id = s.id
            and sm.user_id = (select auth.uid())
            and sm.is_active = true
            and sm.member_role in ('owner', 'manager')
        )
      )
  )
);

drop policy if exists "Jarmal media update own folder" on storage.objects;
create policy "Jarmal media update own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'jarmal-media'
  and (
    ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or (
      (storage.foldername(name))[1] = 'stores'
      and exists (
        select 1
        from public.stores s
        where s.id::text = (storage.foldername(objects.name))[2]
          and (
            s.merchant_id = (select auth.uid())
            or exists (
              select 1
              from public.store_members sm
              where sm.store_id = s.id
                and sm.user_id = (select auth.uid())
                and sm.is_active = true
                and sm.member_role in ('owner', 'manager')
            )
          )
      )
    )
  )
)
with check (
  bucket_id = 'jarmal-media'
  and (
    ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or (
      (storage.foldername(name))[1] = 'stores'
      and exists (
        select 1
        from public.stores s
        where s.id::text = (storage.foldername(objects.name))[2]
          and (
            s.merchant_id = (select auth.uid())
            or exists (
              select 1
              from public.store_members sm
              where sm.store_id = s.id
                and sm.user_id = (select auth.uid())
                and sm.is_active = true
                and sm.member_role in ('owner', 'manager')
            )
          )
      )
    )
  )
);

drop policy if exists "Jarmal media delete own folder" on storage.objects;
create policy "Jarmal media delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'jarmal-media'
  and (
    ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or (
      (storage.foldername(name))[1] = 'stores'
      and exists (
        select 1
        from public.stores s
        where s.id::text = (storage.foldername(objects.name))[2]
          and (
            s.merchant_id = (select auth.uid())
            or exists (
              select 1
              from public.store_members sm
              where sm.store_id = s.id
                and sm.user_id = (select auth.uid())
                and sm.is_active = true
                and sm.member_role in ('owner', 'manager')
            )
          )
      )
    )
  )
);