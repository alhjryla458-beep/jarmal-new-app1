-- Applied migration: 20261005203058_add_admin_payment_method_settings
create or replace function public.admin_update_payment_method(p_payment_method_id uuid,p_account_number text,p_instructions text,p_is_active boolean)
returns public.payment_methods language plpgsql security definer set search_path=public
as $function$
declare v_method public.payment_methods;
begin
 if not public.is_admin() then raise exception 'غير مصرح'; end if;
 update public.payment_methods set account_number=nullif(btrim(p_account_number),''),instructions=nullif(btrim(p_instructions),''),is_active=coalesce(p_is_active,false)
 where id=p_payment_method_id returning * into v_method;
 if v_method.id is null then raise exception 'طريقة الدفع غير موجودة'; end if;
 return v_method;
end; $function$;
revoke all on function public.admin_update_payment_method(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.admin_update_payment_method(uuid,text,text,boolean) to authenticated,service_role;
insert into public.payment_methods(name,code,is_active)
select 'جوالك (Jawalak)','jawalak',false)
where not exists(select 1 from public.payment_methods where code='jawalak');