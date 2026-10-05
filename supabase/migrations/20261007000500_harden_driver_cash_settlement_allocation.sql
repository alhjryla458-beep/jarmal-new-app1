-- Harden driver cash settlement allocation with row-by-row FIFO locking.

create or replace function public.admin_process_driver_cash_settlement(
  p_settlement_id uuid,
  p_action text,
  p_note text default null
)
returns public.driver_cash_settlements
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_settlement public.driver_cash_settlements;
  v_collection public.driver_cash_collections;
  v_remaining numeric;
  v_allocation numeric;
begin
  if not public.is_admin() then raise exception 'غير مصرح'; end if;
  if p_action not in ('confirm','reject') then raise exception 'إجراء غير صالح'; end if;

  select * into v_settlement
  from public.driver_cash_settlements
  where id = p_settlement_id
  for update;

  if v_settlement.id is null then raise exception 'طلب التسوية غير موجود'; end if;
  if v_settlement.status <> 'pending' then raise exception 'طلب التسوية تمت معالجته مسبقًا'; end if;

  if p_action = 'reject' then
    update public.driver_cash_settlements
    set status='rejected', processed_at=now(), processed_by=auth.uid(), note=coalesce(p_note,note)
    where id=p_settlement_id
    returning * into v_settlement;
    return v_settlement;
  end if;

  v_remaining := v_settlement.amount;

  for v_collection in
    select *
    from public.driver_cash_collections
    where driver_id=v_settlement.driver_id and status='open'
    order by collected_at, id
    for update
  loop
    exit when v_remaining <= 0;
    v_allocation := least(v_collection.amount - v_collection.settled_amount, v_remaining);

    if v_allocation > 0 then
      update public.driver_cash_collections
      set settled_amount = settled_amount + v_allocation,
          status = case when settled_amount + v_allocation >= amount then 'settled' else 'open' end,
          settled_at = case when settled_amount + v_allocation >= amount then now() else settled_at end,
          settled_by = case when settled_amount + v_allocation >= amount then auth.uid() else settled_by end,
          settlement_note = coalesce(p_note, settlement_note)
      where id = v_collection.id;
      v_remaining := v_remaining - v_allocation;
    end if;
  end loop;

  if v_remaining > 0 then
    raise exception 'النقد المستحق المتبقي لا يكفي لهذه التسوية';
  end if;

  update public.driver_cash_settlements
  set status='confirmed', processed_at=now(), processed_by=auth.uid(), note=coalesce(p_note,note)
  where id=p_settlement_id
  returning * into v_settlement;

  return v_settlement;
end;
$function$;

revoke execute on function public.admin_process_driver_cash_settlement(uuid,text,text) from public;
revoke execute on function public.admin_process_driver_cash_settlement(uuid,text,text) from anon;
grant execute on function public.admin_process_driver_cash_settlement(uuid,text,text) to authenticated;
grant execute on function public.admin_process_driver_cash_settlement(uuid,text,text) to service_role;
