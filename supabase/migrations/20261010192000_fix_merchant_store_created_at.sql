-- Fix merchant registration: stores.created_at is NOT NULL and has no default.
-- Keep customer-to-merchant application scoped to an explicit store owner membership.
CREATE OR REPLACE FUNCTION public.register_user_profile(
  p_role text,
  p_full_name text,
  p_phone text,
  p_national_id text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_store_name text DEFAULT NULL::text,
  p_store_category text DEFAULT NULL::text,
  p_access_code text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_code record;
  v_existing_role text;
  v_store_id uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_role not in ('customer','driver','merchant') then raise exception 'الدور غير صالح'; end if;

  select role into v_existing_role from public.profiles where id=auth.uid();
  if v_existing_role is null then raise exception 'ملف المستخدم غير موجود'; end if;

  if v_existing_role <> p_role
     and not (v_existing_role = 'customer' and p_role = 'merchant') then
    raise exception 'هذا الحساب مرتبط بدور مختلف ولا يمكن تغييره بهذه الطريقة';
  end if;

  if p_role='driver' then
    select * into v_code
    from public.driver_access_codes
    where code=p_access_code and is_active=true and is_used=false
    for update;

    if v_code is null then raise exception 'Invalid or already used access code'; end if;

    update public.driver_access_codes
    set is_used=true,used_by=auth.uid(),assigned_to_phone=p_phone
    where id=v_code.id;
  end if;

  update public.profiles
  set full_name=coalesce(p_full_name,full_name),
      phone_number=coalesce(p_phone,phone_number),
      national_id=coalesce(p_national_id,national_id),
      access_code_used=case when p_role='driver' then p_access_code else access_code_used end,
      is_active=true
  where id=auth.uid();

  if p_role='driver' then
    insert into public.driver_profiles
      (id, identity_card_number, verification_status, is_available)
    values
      (auth.uid(), nullif(btrim(p_national_id), ''), 'pending', false)
    on conflict (id) do update
      set identity_card_number=coalesce(excluded.identity_card_number, public.driver_profiles.identity_card_number);
    perform public.ensure_driver_wallet(auth.uid());

  elsif p_role='merchant' then
    if exists(select 1 from public.stores where merchant_id=auth.uid()) then
      raise exception 'هذا الحساب لديه متجر بالفعل';
    end if;

    if nullif(btrim(p_store_name), '') is null then
      raise exception 'أدخل اسم المتجر';
    end if;
    if nullif(btrim(p_store_category), '') is null then
      raise exception 'اختر نوع النشاط التجاري';
    end if;

    insert into public.stores (created_at,merchant_id,name,phone,store_type,is_open,approval_status)
    values (now(),auth.uid(),btrim(p_store_name),p_phone,btrim(p_store_category),false,'pending')
    returning id into v_store_id;

    insert into public.store_members (store_id,user_id,member_role,is_active,created_by)
    values (v_store_id,auth.uid(),'owner',true,auth.uid())
    on conflict (store_id,user_id) do update
      set member_role='owner', is_active=true;
  end if;

  return p_role;
end;
$function$;
