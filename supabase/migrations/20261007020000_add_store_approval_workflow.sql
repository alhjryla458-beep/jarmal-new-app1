-- Merchant/store approval workflow
alter table public.stores add column if not exists approval_status text not null default 'approved' check (approval_status in ('pending','approved','rejected','suspended'));
alter table public.stores add column if not exists admin_note text;
alter table public.stores add column if not exists reviewed_at timestamptz;
alter table public.stores add column if not exists reviewed_by uuid references public.profiles(id);

create or replace function public.admin_review_store(p_store_id uuid,p_status text,p_note text default null)
returns public.stores language plpgsql security definer set search_path to 'public' as $function$
declare v_store public.stores;
begin
  if not public.is_admin() then raise exception 'غير مصرح'; end if;
  if p_status not in ('approved','rejected','suspended') then raise exception 'حالة المراجعة غير صالحة'; end if;
  select * into v_store from public.stores where id=p_store_id for update;
  if not found then raise exception 'المتجر غير موجود'; end if;
  update public.stores set approval_status=p_status, admin_note=nullif(trim(coalesce(p_note,'')),''), reviewed_at=now(), reviewed_by=auth.uid(), is_open=case when p_status in ('rejected','suspended') then false else is_open end where id=p_store_id returning * into v_store;
  return v_store;
end;
$function$;

revoke execute on function public.admin_review_store(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_review_store(uuid,text,text) to authenticated,service_role;