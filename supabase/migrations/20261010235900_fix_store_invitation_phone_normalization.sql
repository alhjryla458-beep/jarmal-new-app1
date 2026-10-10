-- Fix Yemen phone prefix normalization when accepting store-member invitations.
-- Use a character class for a literal plus sign; the previous pattern did not match +967.
CREATE OR REPLACE FUNCTION public.accept_store_member_invitation(p_invitation_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_user_phone text;
  v_invitation public.store_member_invitations%rowtype;
  v_normalized_user_phone text;
  v_normalized_invite_phone text;
  v_member_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'لا يمكن قبول الدعوة بحساب مجهول';
  end if;

  if p_invitation_code is null or length(trim(p_invitation_code)) < 6 then
    raise exception 'رمز الدعوة غير صالح';
  end if;

  select u.phone into v_user_phone
  from auth.users u
  where u.id = v_user_id;

  if v_user_phone is null or btrim(v_user_phone) = '' then
    raise exception 'رقم الهاتف غير موجود في الحساب';
  end if;

  v_normalized_user_phone := regexp_replace(v_user_phone, '[^0-9+]', '', 'g');
  v_normalized_user_phone := regexp_replace(v_normalized_user_phone, '^[+]967', '');
  v_normalized_user_phone := regexp_replace(v_normalized_user_phone, '^00967', '');
  v_normalized_user_phone := regexp_replace(v_normalized_user_phone, '^967', '');
  v_normalized_user_phone := regexp_replace(v_normalized_user_phone, '^0', '');

  select * into v_invitation
  from public.store_member_invitations i
  where i.status = 'pending'
    and i.expires_at > now()
    and upper(i.code_hash) = upper(encode(digest(upper(trim(p_invitation_code)), 'sha256'), 'hex'))
  order by i.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'رمز الدعوة غير صحيح أو منتهي أو لم يعد متاحاً';
  end if;

  v_normalized_invite_phone := regexp_replace(v_invitation.phone_number, '[^0-9+]', '', 'g');
  v_normalized_invite_phone := regexp_replace(v_normalized_invite_phone, '^[+]967', '');
  v_normalized_invite_phone := regexp_replace(v_normalized_invite_phone, '^00967', '');
  v_normalized_invite_phone := regexp_replace(v_normalized_invite_phone, '^967', '');
  v_normalized_invite_phone := regexp_replace(v_normalized_invite_phone, '^0', '');

  if v_normalized_user_phone <> v_normalized_invite_phone then
    raise exception 'رقم الهاتف لا يطابق رقم الهاتف المدعو';
  end if;

  if exists (
    select 1 from public.store_members sm
    where sm.user_id = v_user_id
      and sm.is_active = true
      and sm.store_id = v_invitation.store_id
  ) then
    raise exception 'هذا الحساب عضو بالفعل في هذا المتجر';
  end if;

  if exists (
    select 1 from public.store_members sm
    where sm.user_id = v_user_id
      and sm.is_active = true
      and sm.store_id <> v_invitation.store_id
  ) then
    raise exception 'هذا الحساب مرتبط حالياً بمتجر آخر؛ دعم تعدد المتاجر سيضاف لاحقاً';
  end if;

  insert into public.store_members (
    store_id, user_id, member_role, is_active, created_by
  )
  values (
    v_invitation.store_id,
    v_user_id,
    v_invitation.member_role,
    true,
    v_invitation.invited_by
  )
  returning id into v_member_id;

  update public.store_member_invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now()
  where id = v_invitation.id
    and status = 'pending';

  if not found then
    raise exception 'تعذر إكمال قبول الدعوة، يرجى المحاولة مرة أخرى';
  end if;

  perform public.write_store_audit_log(
    v_invitation.store_id,
    'staff_invitation_accepted',
    'store_member',
    v_member_id,
    jsonb_build_object(
      'member_role', v_invitation.member_role,
      'invitation_id', v_invitation.id
    )
  );

  return jsonb_build_object(
    'success', true,
    'store_id', v_invitation.store_id,
    'member_id', v_member_id,
    'member_role', v_invitation.member_role
  );
end;
$function$;
