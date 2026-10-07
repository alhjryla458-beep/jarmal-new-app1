create or replace function public.protect_store_admin_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    if old.merchant_id is distinct from new.merchant_id
       or old.commission_rate is distinct from new.commission_rate
       or old.approval_status is distinct from new.approval_status
       or old.admin_note is distinct from new.admin_note
       or old.reviewed_at is distinct from new.reviewed_at
       or old.reviewed_by is distinct from new.reviewed_by then
      raise exception 'غير مصرح: الحقول الإدارية للمتجر تعدل من الإدارة فقط';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_store_admin_fields on public.stores;

create trigger protect_store_admin_fields
before update on public.stores
for each row
execute function public.protect_store_admin_fields();
