create or replace function public.protect_driver_verification_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    if old.verification_status is distinct from new.verification_status
       or old.verification_note is distinct from new.verification_note
       or old.verified_at is distinct from new.verified_at
       or old.verified_by is distinct from new.verified_by then
      raise exception 'غير مصرح: حقول اعتماد المندوب تعدل من الإدارة فقط';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_driver_verification_fields on public.driver_profiles;

create trigger protect_driver_verification_fields
before update on public.driver_profiles
for each row
execute function public.protect_driver_verification_fields();