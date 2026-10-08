drop function if exists public.get_customer_home_popular_products(integer);

create function public.get_customer_home_popular_products(p_limit integer default 6)
returns table(
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  is_available boolean,
  store_id uuid
)
language sql
security definer
set search_path to 'public'
as $function$
  select p.id, p.name, p.description, p.price, p.image_url, p.is_available, p.store_id
  from public.products p
  join (
    select oi.product_id, sum(oi.quantity)::bigint as total_quantity
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status = 'delivered'
      and oi.product_id is not null
    group by oi.product_id
  ) popular on popular.product_id = p.id
  join public.stores s on s.id = p.store_id
  where p.is_available = true
    and s.approval_status = 'approved'
    and s.is_open = true
  order by popular.total_quantity desc, p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 6), 12));
$function$;

revoke all on function public.get_customer_home_popular_products(integer) from public, anon;
grant execute on function public.get_customer_home_popular_products(integer) to authenticated, service_role;
