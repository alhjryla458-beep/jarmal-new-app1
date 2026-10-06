alter table public.driver_profiles
  add column if not exists license_number text,
  add column if not exists verification_status text not null default 'approved',
  add column if not exists verification_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id);

alter table public.driver_profiles drop constraint if exists driver_profiles_verification_status_check;
alter table public.driver_profiles add constraint driver_profiles_verification_status_check check (verification_status in ('pending','approved','rejected','suspended'));

create or replace function public.admin_review_driver(p_driver_id uuid,p_status text,p_note text default null)
returns public.driver_profiles language plpgsql security definer set search_path=public as $$
declare v_driver public.driver_profiles;
begin
  if not public.is_admin() then raise exception 'غير مصرح: هذه العملية للإدارة فقط'; end if;
  if p_status not in ('pending','approved','rejected','suspended') then raise exception 'حالة اعتماد غير صالحة'; end if;
  update public.driver_profiles
  set verification_status=p_status,
      verification_note=nullif(btrim(coalesce(p_note,'')),''),
      verified_at=case when p_status in ('approved','rejected','suspended') then now() else null end,
      verified_by=case when p_status in ('approved','rejected','suspended') then auth.uid() else null end,
      is_available=case when p_status='approved' then is_available else false end
  where id=p_driver_id returning * into v_driver;
  if v_driver.id is null then raise exception 'ملف المندوب غير موجود'; end if;
  return v_driver;
end; $$;

revoke execute on function public.admin_review_driver(uuid,text,text) from public, anon;
grant execute on function public.admin_review_driver(uuid,text,text) to authenticated;

create or replace function public.register_user_profile(p_role text,p_full_name text,p_phone text,p_national_id text default null,p_email text default null,p_store_name text default null,p_store_category text default null,p_access_code text default null)
returns text language plpgsql security definer set search_path=public as $$
declare v_code record; v_existing_role text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_role not in ('customer','driver','merchant') then raise exception 'الدور غير صالح'; end if;
  select role into v_existing_role from public.profiles where id=auth.uid();
  if v_existing_role is null then raise exception 'ملف المستخدم غير موجود'; end if;
  if v_existing_role<>p_role then raise exception 'هذا الحساب مرتبط بدور مختلف ولا يمكن تغييره بهذه الطريقة'; end if;
  if p_role='driver' then
    select * into v_code from public.driver_access_codes where code=p_access_code and is_active=true and is_used=false for update;
    if v_code is null then raise exception 'Invalid or already used access code'; end if;
    update public.driver_access_codes set is_used=true,used_by=auth.uid(),assigned_to_phone=p_phone where id=v_code.id;
  end if;
  update public.profiles set full_name=coalesce(p_full_name,full_name),phone_number=coalesce(p_phone,phone_number),national_id=coalesce(p_national_id,national_id),access_code_used=case when p_role='driver' then p_access_code else access_code_used end,is_active=true where id=auth.uid();
  if p_role='driver' then
    insert into public.driver_profiles(id,identity_card_number,verification_status,is_available)
    values(auth.uid(),nullif(btrim(p_national_id),''),'pending',false)
    on conflict(id) do update set identity_card_number=coalesce(excluded.identity_card_number,public.driver_profiles.identity_card_number);
    perform public.ensure_driver_wallet(auth.uid());
  elsif p_role='merchant' then
    if exists(select 1 from public.stores where merchant_id=auth.uid()) then raise exception 'هذا الحساب لديه متجر بالفعل'; end if;
    insert into public.stores(merchant_id,name,phone,store_type,is_open,approval_status) values(auth.uid(),coalesce(p_store_name,'متجري'),p_phone,p_store_category,false,'pending');
  end if;
  return p_role;
end; $$;

create or replace function public.driver_accept_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_available boolean; v_verification_status text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  select is_available,verification_status into v_available,v_verification_status from public.driver_profiles where id=auth.uid();
  if v_verification_status is distinct from 'approved' then raise exception 'حساب المندوب لم يُعتمد من الإدارة بعد'; end if;
  if v_available is distinct from true then raise exception 'يجب تفعيل حالة "متاح" أولاً لاستلام الطلبات'; end if;
  update public.orders set driver_id=auth.uid(),status='picked_up' where id=p_order_id and driver_id is null and status='ready_for_pickup' returning * into v_order;
  if v_order is null then raise exception 'الطلب لم يعد متاحاً (ربما استلمه مندوب آخر أو لم يجهّزه المتجر بعد)'; end if;
  return v_order;
end; $$;