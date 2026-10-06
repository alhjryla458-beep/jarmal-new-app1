alter table public.products
  add column if not exists catalog_type text not null default 'general',
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_variant text,
  add column if not exists year_from smallint,
  add column if not exists year_to smallint,
  add column if not exists part_number text,
  add column if not exists brand text,
  add column if not exists quality_type text,
  add column if not exists package_quantity numeric,
  add column if not exists availability_status text not null default 'available';

alter table public.products drop constraint if exists products_catalog_type_check;
alter table public.products add constraint products_catalog_type_check check (catalog_type in ('general','auto_part','accessory'));
alter table public.products drop constraint if exists products_quality_type_check;
alter table public.products add constraint products_quality_type_check check (quality_type is null or quality_type in ('original','agency','aftermarket','commercial'));
alter table public.products drop constraint if exists products_availability_status_check;
alter table public.products add constraint products_availability_status_check check (availability_status in ('available','limited','unavailable'));

create index if not exists products_part_number_idx on public.products (part_number);
create index if not exists products_vehicle_make_model_idx on public.products (vehicle_make, vehicle_model);

create or replace function public.merchant_create_auto_part(
  p_store_id uuid,p_name text,p_description text default null,p_price numeric default 0,p_image_url text default null,
  p_vehicle_make text default null,p_vehicle_model text default null,p_vehicle_variant text default null,
  p_year_from smallint default null,p_year_to smallint default null,p_part_number text default null,
  p_brand text default null,p_quality_type text default 'aftermarket',p_package_quantity numeric default 1,
  p_availability_status text default 'available'
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_product_id uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'يجب تسجيل الدخول بحساب حقيقي'; end if;
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'اسم القطعة غير صالح'; end if;
  if p_price is null or p_price < 0 then raise exception 'سعر القطعة غير صالح'; end if;
  if p_availability_status not in ('available','limited','unavailable') then raise exception 'حالة التوفر غير صالحة'; end if;
  if p_quality_type not in ('original','agency','aftermarket','commercial') then raise exception 'نوع القطعة غير صالح'; end if;
  if p_year_from is not null and (p_year_from < 1900 or p_year_from > 2200) then raise exception 'سنة البداية غير صالحة'; end if;
  if p_year_to is not null and (p_year_to < 1900 or p_year_to > 2200) then raise exception 'سنة النهاية غير صالحة'; end if;
  if p_year_from is not null and p_year_to is not null and p_year_to < p_year_from then raise exception 'نطاق السنوات غير صالح'; end if;
  if p_package_quantity is null or p_package_quantity <= 0 then raise exception 'كمية العبوة غير صالحة'; end if;
  if not (
    exists (select 1 from public.stores s where s.id=p_store_id and s.merchant_id=auth.uid())
    or exists (select 1 from public.store_members sm where sm.store_id=p_store_id and sm.user_id=auth.uid() and sm.is_active=true and sm.member_role in ('owner','manager'))
  ) then raise exception 'لا تملك صلاحية إدارة منتجات هذا المتجر'; end if;
  insert into public.products (
    store_id,name,description,price,image_url,is_available,catalog_type,vehicle_make,vehicle_model,vehicle_variant,
    year_from,year_to,part_number,brand,quality_type,package_quantity,availability_status
  ) values (
    p_store_id,trim(p_name),nullif(trim(p_description),''),p_price,nullif(trim(p_image_url),''),
    p_availability_status <> 'unavailable','auto_part',nullif(trim(p_vehicle_make),''),nullif(trim(p_vehicle_model),''),
    nullif(trim(p_vehicle_variant),''),p_year_from,p_year_to,nullif(trim(p_part_number),''),nullif(trim(p_brand),''),
    p_quality_type,p_package_quantity,p_availability_status
  ) returning id into v_product_id;
  perform public.write_store_audit_log(p_store_id,'product_created','product',v_product_id,
    jsonb_build_object('catalog_type','auto_part','name',trim(p_name),'part_number',p_part_number,'price',p_price));
  return v_product_id;
end; $$;

revoke execute on function public.merchant_create_auto_part(uuid,text,text,numeric,text,text,text,text,smallint,smallint,text,text,text,numeric,text) from public,anon;
grant execute on function public.merchant_create_auto_part(uuid,text,text,numeric,text,text,text,text,smallint,smallint,text,text,text,numeric,text) to authenticated;