drop function if exists public.merchant_create_auto_part(uuid,text,text,numeric,text,text,text,text,smallint,smallint,text,text,text,numeric,text);
drop index if exists public.products_part_number_idx;
drop index if exists public.products_vehicle_make_model_idx;

alter table public.products
  drop constraint if exists products_catalog_type_check,
  drop constraint if exists products_quality_type_check,
  drop constraint if exists products_availability_status_check,
  drop column if exists catalog_type,
  drop column if exists vehicle_make,
  drop column if exists vehicle_model,
  drop column if exists vehicle_variant,
  drop column if exists year_from,
  drop column if exists year_to,
  drop column if exists part_number,
  drop column if exists brand,
  drop column if exists quality_type,
  drop column if exists package_quantity,
  drop column if exists availability_status;