create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);