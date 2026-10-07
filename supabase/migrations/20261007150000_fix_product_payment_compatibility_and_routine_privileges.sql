create or replace function public.create_order_with_payment(
  p_store_id uuid,
  p_items jsonb,
  p_delivery_fee numeric,
  p_delivery_address text,
  p_delivery_latitude double precision,
  p_delivery_longitude double precision,
  p_fulfillment_type text,
  p_notes text,
  p_payment_method_code text
)
returns public.orders
language plpgsql
security definer
set search_path to public
as $function$
declare
  v_order public.orders;
  v_item jsonb;
  v_items_total numeric := 0;
  v_unit_price numeric;
  v_final_delivery_fee numeric := coalesce(p_delivery_fee, 0);
  v_branch public.branches;
  v_prior_orders integer;
  v_is_first boolean := false;
  v_store_open boolean;
  v_product_id uuid;
  v_customer_branch_id uuid;
  v_store_branch_id uuid;
  v_payment_options text;
  v_cash_allowed boolean := true;
  v_electronic_allowed boolean := true;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول لإنشاء طلب'; end if;
  if p_store_id is null then raise exception 'المتجر غير محدد'; end if;

  select is_open, branch_id into v_store_open, v_store_branch_id
  from public.stores where id = p_store_id;
  if v_store_open is null then raise exception 'المتجر غير موجود'; end if;
  if v_store_open is distinct from true then raise exception 'المتجر مغلق حالياً'; end if;

  if p_fulfillment_type not in ('delivery', 'pickup') then raise exception 'نوع الاستلام غير صالح'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'السلة فارغة'; end if;
  if v_final_delivery_fee < 0 then raise exception 'رسوم التوصيل غير صالحة'; end if;

  if p_payment_method_code is null or p_payment_method_code = 'cash' then
    p_payment_method_code := 'cash';
  else
    if not exists (
      select 1 from public.payment_methods
      where code = p_payment_method_code and is_active = true and code <> 'cash'
    ) then
      raise exception 'طريقة الدفع الإلكتروني غير متاحة';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'quantity')::integer, 0) <= 0 then
      raise exception 'كمية المنتج يجب أن تكون أكبر من صفر';
    end if;

    v_payment_options := 'both';

    if v_item ? 'variant_id' and nullif(v_item->>'variant_id', '') is not null then
      select pv.price, p.id, coalesce(p.payment_options, 'both')
        into v_unit_price, v_product_id, v_payment_options
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = (v_item->>'variant_id')::uuid
        and pv.is_available = true
        and p.is_available = true
        and p.store_id = p_store_id;

      if v_unit_price is null then raise exception 'أحد خيارات المنتج غير متاح في هذا المتجر'; end if;
      if v_item ? 'product_id' and nullif(v_item->>'product_id', '') is not null
         and (v_item->>'product_id')::uuid <> v_product_id then
        raise exception 'بيانات المنتج والخيار غير متطابقة';
      end if;
    elsif v_item ? 'product_id' and nullif(v_item->>'product_id', '') is not null then
      select price, coalesce(payment_options, 'both')
        into v_unit_price, v_payment_options
      from public.products
      where id = (v_item->>'product_id')::uuid
        and is_available = true
        and store_id = p_store_id;

      if v_unit_price is null then raise exception 'أحد المنتجات غير متاح في هذا المتجر'; end if;
    elsif v_item ? 'custom_name' then
      v_unit_price := (v_item->>'custom_price')::numeric;
      if nullif(trim(v_item->>'custom_name'), '') is null or v_unit_price is null or v_unit_price <= 0 then
        raise exception 'بيانات المنتج المخصص غير صالحة';
      end if;
      v_payment_options := 'electronic_only';
    else
      raise exception 'عنصر غير صالح في السلة';
    end if;

    if v_payment_options not in ('cash_only','both') then
      v_cash_allowed := false;
    end if;
    if v_payment_options not in ('electronic_only','both') then
      v_electronic_allowed := false;
    end if;

    v_items_total := v_items_total + v_unit_price * (v_item->>'quantity')::integer;
  end loop;

  if p_payment_method_code = 'cash' and not v_cash_allowed then
    raise exception 'هذا الطلب يحتوي منتجات لا تسمح بالدفع عند الاستلام';
  end if;

  if p_payment_method_code <> 'cash' and not v_electronic_allowed then
    raise exception 'هذا الطلب يحتوي منتجات لا تسمح بالدفع الإلكتروني';
  end if;

  if p_fulfillment_type = 'pickup' then
    v_final_delivery_fee := 0;
  else
    select branch_id into v_customer_branch_id
    from public.profiles where id = auth.uid();

    if p_payment_method_code = 'cash' then
      if v_customer_branch_id is null or v_store_branch_id is null or v_customer_branch_id <> v_store_branch_id then
        raise exception 'الدفع عند الاستلام متاح فقط للطلبات داخل نفس المحافظة';
      end if;
    end if;

    select b.* into v_branch from public.branches b where b.id = v_customer_branch_id;

    if v_branch is null then
      select * into v_branch from public.branches where is_active = true order by name limit 1;
    end if;

    if v_branch is not null and v_items_total >= v_branch.free_delivery_min_amount then
      v_final_delivery_fee := greatest(0, v_final_delivery_fee - v_branch.free_delivery_discount);
    end if;

    select count(*) into v_prior_orders
    from public.orders where customer_id = auth.uid() and payment_status = 'paid';

    if v_prior_orders = 0 then
      v_is_first := true;
      v_final_delivery_fee := 0;
    end if;
  end if;

  insert into public.orders (
    customer_id, store_id, status, total_amount, delivery_fee,
    delivery_address, delivery_latitude, delivery_longitude,
    payment_method, payment_status, fulfillment_type,
    is_free_first_delivery, notes
  )
  values (
    auth.uid(), p_store_id, 'pending', v_items_total + v_final_delivery_fee,
    v_final_delivery_fee, p_delivery_address, p_delivery_latitude,
    p_delivery_longitude, p_payment_method_code, 'pending',
    p_fulfillment_type, v_is_first, p_notes
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_item ? 'variant_id' and nullif(v_item->>'variant_id', '') is not null then
      select pv.price, pv.product_id into v_unit_price, v_product_id
      from public.product_variants pv join public.products p on p.id = pv.product_id
      where pv.id = (v_item->>'variant_id')::uuid and p.store_id = p_store_id;
      insert into public.order_items (order_id, product_id, variant_id, unit_price, quantity)
      values (v_order.id, v_product_id, (v_item->>'variant_id')::uuid, v_unit_price, (v_item->>'quantity')::integer);
    elsif v_item ? 'product_id' and nullif(v_item->>'product_id', '') is not null then
      select price into v_unit_price from public.products where id = (v_item->>'product_id')::uuid and store_id = p_store_id;
      insert into public.order_items (order_id, product_id, unit_price, quantity)
      values (v_order.id, (v_item->>'product_id')::uuid, v_unit_price, (v_item->>'quantity')::integer);
    else
      insert into public.order_items (order_id, custom_name, unit_price, quantity)
      values (v_order.id, trim(v_item->>'custom_name'), (v_item->>'custom_price')::numeric, (v_item->>'quantity')::integer);
    end if;
  end loop;

  perform public.reserve_order_inventory(v_order.id);
  return v_order;
end;
$function$;

revoke execute on function public.merchant_create_product(uuid, text, text, numeric, text, text) from public, anon;
grant execute on function public.merchant_create_product(uuid, text, text, numeric, text, text) to authenticated, service_role;

revoke execute on function public.request_wallet_topup(numeric, text, text, text) from public, anon;
grant execute on function public.request_wallet_topup(numeric, text, text, text) to authenticated, service_role;

revoke execute on function public.get_customer_payment_status(uuid) from public, anon;
grant execute on function public.get_customer_payment_status(uuid) to authenticated, service_role;
