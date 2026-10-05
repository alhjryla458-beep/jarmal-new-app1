create or replace function public.register_user_profile(
  p_role text,
  p_full_name text,
  p_phone text,
  p_national_id text default null,
  p_email text default null,
  p_store_name text default null,
  p_store_category text default null,
  p_access_code text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_code record;
  v_existing_role text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_role not in ('customer','driver','merchant') then raise exception 'الدور غير صالح'; end if;

  select role into v_existing_role from public.profiles where id = auth.uid();
  if v_existing_role is null then raise exception 'ملف المستخدم غير موجود'; end if;
  if v_existing_role <> p_role then raise exception 'هذا الحساب مرتبط بدور مختلف ولا يمكن تغييره بهذه الطريقة'; end if;

  if p_role = 'driver' then
    select * into v_code from public.driver_access_codes
    where code = p_access_code and is_active = true and is_used = false for update;
    if v_code is null then raise exception 'Invalid or already used access code'; end if;
    update public.driver_access_codes set is_used=true, used_by=auth.uid(), assigned_to_phone=p_phone where id=v_code.id;
  end if;

  update public.profiles
  set full_name=coalesce(p_full_name,full_name),
      phone_number=coalesce(p_phone,phone_number),
      national_id=coalesce(p_national_id,national_id),
      access_code_used=case when p_role='driver' then p_access_code else access_code_used end,
      is_active=true
  where id=auth.uid();

  if p_role='driver' then
    perform public.ensure_driver_wallet(auth.uid());
  elsif p_role='merchant' then
    if exists (select 1 from public.stores where merchant_id=auth.uid()) then raise exception 'هذا الحساب لديه متجر بالفعل'; end if;
    insert into public.stores (merchant_id,name,phone,store_type,is_open)
    values (auth.uid(),coalesce(p_store_name,'متجري'),p_phone,p_store_category,true);
  end if;

  return p_role;
end;
$function$;

revoke execute on function public.register_user_profile(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.register_user_profile(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.register_user_profile(text,text,text,text,text,text,text,text) to service_role;
