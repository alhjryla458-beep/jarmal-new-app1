-- Allow a store's directly assigned merchant owner to read that store's audit log.
-- Keep the authenticated/non-anonymous guard and existing active owner-membership/admin access.
drop policy if exists "store_audit_logs_select_owner_admin" on public.store_audit_logs;

create policy "store_audit_logs_select_owner_admin"
on public.store_audit_logs
for select
to authenticated
using (
  coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false) = false
  and (
    exists (
      select 1
      from public.stores s
      where s.id = store_audit_logs.store_id
        and s.merchant_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.store_members sm
      where sm.store_id = store_audit_logs.store_id
        and sm.user_id = (select auth.uid())
        and sm.is_active = true
        and sm.member_role = 'owner'
    )
    or public.is_admin()
  )
);
