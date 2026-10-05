-- Driver cash settlement workflow.
create table if not exists public.driver_cash_settlements (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null
);
create index if not exists driver_cash_settlements_driver_status_idx on public.driver_cash_settlements(driver_id,status,requested_at);
alter table public.driver_cash_settlements enable row level security;
revoke all on public.driver_cash_settlements from anon, authenticated;
grant select on public.driver_cash_settlements to authenticated;
drop policy if exists "driver_cash_settlements_select_own" on public.driver_cash_settlements;
create policy "driver_cash_settlements_select_own" on public.driver_cash_settlements for select to authenticated using ((select auth.uid()) = driver_id or public.is_admin());

create or replace function public.request_driver_cash_settlement(p_amount numeric,p_note text default null) returns public.driver_cash_settlements language plpgsql security definer set search_path=public as $$
declare v_driver uuid:=auth.uid(); v_open numeric; v_pending numeric; v_row public.driver_cash_settlements;
begin
 if v_driver is null then raise exception 'يجب تسجيل الدخول'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'مبلغ التسوية غير صالح'; end if;
 select coalesce(sum(amount-settled_amount),0) into v_open from public.driver_cash_collections where driver_id=v_driver and status='open';
 select coalesce(sum(amount),0) into v_pending from public.driver_cash_settlements where driver_id=v_driver and status='pending';
 if p_amount>(v_open-v_pending) then raise exception 'مبلغ التسوية أكبر من النقد المستحق على السائق'; end if;
 insert into public.driver_cash_settlements(driver_id,amount,note) values(v_driver,p_amount,p_note) returning * into v_row;
 return v_row;
end; $$;
revoke execute on function public.request_driver_cash_settlement(numeric,text) from public,anon;
grant execute on function public.request_driver_cash_settlement(numeric,text) to authenticated;

create or replace function public.admin_process_driver_cash_settlement(p_settlement_id uuid,p_action text,p_note text default null) returns public.driver_cash_settlements language plpgsql security definer set search_path=public as $$
declare v_settlement public.driver_cash_settlements; v_remaining numeric;
begin
 if not public.is_admin() then raise exception 'غير مصرح'; end if;
 if p_action not in ('confirm','reject') then raise exception 'إجراء غير صالح'; end if;
 select * into v_settlement from public.driver_cash_settlements where id=p_settlement_id for update;
 if v_settlement.id is null then raise exception 'طلب التسوية غير موجود'; end if;
 if v_settlement.status<>'pending' then raise exception 'طلب التسوية تمت معالجته مسبقًا'; end if;
 if p_action='reject' then update public.driver_cash_settlements set status='rejected',processed_at=now(),processed_by=auth.uid(),note=coalesce(p_note,note) where id=p_settlement_id returning * into v_settlement; return v_settlement; end if;
 select coalesce(sum(amount-settled_amount),0) into v_remaining from public.driver_cash_collections where driver_id=v_settlement.driver_id and status='open';
 if v_settlement.amount>v_remaining then raise exception 'النقد المستحق المتبقي لا يكفي لهذه التسوية'; end if;
 with allocations as (select id,least(amount-settled_amount,greatest(0,v_settlement.amount-coalesce(sum(amount-settled_amount) over(order by collected_at,id rows between unbounded preceding and 1 preceding),0))) as alloc from public.driver_cash_collections where driver_id=v_settlement.driver_id and status='open' order by collected_at,id)
 update public.driver_cash_collections c set settled_amount=c.settled_amount+a.alloc,status=case when c.settled_amount+a.alloc=c.amount then 'settled' else 'open' end,settled_at=case when c.settled_amount+a.alloc=c.amount then now() else c.settled_at end,settled_by=case when c.settled_amount+a.alloc=c.amount then auth.uid() else c.settled_by end,settlement_note=case when a.alloc>0 then coalesce(p_note,c.settlement_note) else c.settlement_note end from allocations a where c.id=a.id and a.alloc>0;
 update public.driver_cash_settlements set status='confirmed',processed_at=now(),processed_by=auth.uid(),note=coalesce(p_note,note) where id=p_settlement_id returning * into v_settlement;
 return v_settlement;
end; $$;
revoke execute on function public.admin_process_driver_cash_settlement(uuid,text,text) from public,anon;
grant execute on function public.admin_process_driver_cash_settlement(uuid,text,text) to authenticated;
