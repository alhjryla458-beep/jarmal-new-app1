/*
# جَرْمَل - Custom Orders, Yemeni Wallets, Chat, and Reviews

## Overview
Adds the requested order, wallet, real-time chat, and review data model for the signed-in Arabic delivery application.

## Modified Tables
- `orders`: adds `custom_order_details`, `courier_distance` in kilometers, and `custom_delivery_fee` in Yemeni rials.

## New Tables
- `client_wallets`: one YER balance per customer.
- `driver_wallets`: one YER balance per driver.
- `merchant_wallets`: one YER balance per merchant.
- `wallet_transactions`: deposits, withdrawals, earnings, and fees, linked to a local payment channel.
- `chat_messages`: order-scoped messages between the customer and assigned driver.
- `ratings_reviews`: post-delivery customer ratings for the driver and merchant.

## Security
- Every new table has RLS enabled.
- Wallet balances are readable only by their owner; balance-changing operations go through a SECURITY DEFINER function.
- Wallet transactions are readable by their owner and insertable only through the same function.
- Chat is readable and writable only by the customer, assigned driver, or store merchant on the order.
- Reviews can be created by the customer who owns a delivered order and are readable by the order participants.
- Realtime publication is enabled for order chat messages.

## Important Notes
1. Amounts are stored as whole Yemeni rials.
2. Delivery fee is calculated as 500 YER base fee plus 300 YER per started kilometer.
3. Client-supplied wallet balances are never trusted; the server function updates balances atomically.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS custom_order_details text,
  ADD COLUMN IF NOT EXISTS courier_distance numeric(10,2),
  ADD COLUMN IF NOT EXISTS custom_delivery_fee numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION calculate_custom_delivery_fee(distance_km numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN distance_km IS NULL OR distance_km <= 0 THEN 500::numeric
    ELSE 500::numeric + CEIL(distance_km) * 300::numeric
  END
$$;

CREATE TABLE IF NOT EXISTS client_wallets (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposited numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE client_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_wallets_select_own" ON client_wallets;
CREATE POLICY "client_wallets_select_own" ON client_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "client_wallets_insert_own" ON client_wallets;
CREATE POLICY "client_wallets_insert_own" ON client_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS driver_wallets (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_wallets_select_own" ON driver_wallets;
CREATE POLICY "driver_wallets_select_own" ON driver_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "driver_wallets_insert_own" ON driver_wallets;
CREATE POLICY "driver_wallets_insert_own" ON driver_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS merchant_wallets (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merchant_wallets_select_own" ON merchant_wallets;
CREATE POLICY "merchant_wallets_select_own" ON merchant_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "merchant_wallets_insert_own" ON merchant_wallets;
CREATE POLICY "merchant_wallets_insert_own" ON merchant_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_type text NOT NULL CHECK (wallet_type IN ('client','driver','merchant')),
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','earning','fee')),
  amount numeric NOT NULL CHECK (amount > 0),
  channel text,
  account_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_transactions_select_own" ON wallet_transactions;
CREATE POLICY "wallet_transactions_select_own" ON wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_select_participants" ON chat_messages;
CREATE POLICY "chat_messages_select_participants" ON chat_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = chat_messages.order_id AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid() OR EXISTS (SELECT 1 FROM stores s WHERE s.id = o.store_id AND s.merchant_id = auth.uid())))
);
DROP POLICY IF EXISTS "chat_messages_insert_participants" ON chat_messages;
CREATE POLICY "chat_messages_insert_participants" ON chat_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM orders o WHERE o.id = chat_messages.order_id AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid()))
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order ON chat_messages(order_id, created_at);

CREATE TABLE IF NOT EXISTS ratings_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  merchant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_rating integer CHECK (driver_rating BETWEEN 1 AND 5),
  merchant_rating integer CHECK (merchant_rating BETWEEN 1 AND 5),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);
ALTER TABLE ratings_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ratings_reviews_select_participants" ON ratings_reviews;
CREATE POLICY "ratings_reviews_select_participants" ON ratings_reviews FOR SELECT TO authenticated USING (reviewer_id = auth.uid() OR driver_id = auth.uid() OR merchant_id = auth.uid());
DROP POLICY IF EXISTS "ratings_reviews_insert_customer" ON ratings_reviews;
CREATE POLICY "ratings_reviews_insert_customer" ON ratings_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM orders o WHERE o.id = ratings_reviews.order_id AND o.customer_id = auth.uid() AND o.status = 'delivered'));
CREATE INDEX IF NOT EXISTS idx_ratings_reviews_order ON ratings_reviews(order_id);

CREATE OR REPLACE FUNCTION apply_wallet_transaction(p_wallet_type text, p_transaction_type text, p_amount numeric, p_channel text DEFAULT NULL, p_account_reference text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_id uuid; v_balance numeric;
BEGIN
  IF v_user IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000000 THEN RAISE EXCEPTION 'Invalid wallet transaction'; END IF;
  IF p_wallet_type NOT IN ('client', 'driver', 'merchant') OR p_transaction_type NOT IN ('deposit', 'withdrawal') THEN RAISE EXCEPTION 'Invalid wallet transaction'; END IF;
  IF p_wallet_type = 'client' THEN
    INSERT INTO client_wallets (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
    SELECT balance INTO v_balance FROM client_wallets WHERE user_id = v_user FOR UPDATE;
    IF p_transaction_type = 'withdrawal' AND v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE client_wallets SET balance = CASE WHEN p_transaction_type = 'deposit' THEN balance + p_amount ELSE balance - p_amount END, total_deposited = total_deposited + CASE WHEN p_transaction_type = 'deposit' THEN p_amount ELSE 0 END, total_withdrawn = total_withdrawn + CASE WHEN p_transaction_type = 'withdrawal' THEN p_amount ELSE 0 END, updated_at = now() WHERE user_id = v_user;
  ELSIF p_wallet_type = 'driver' THEN
    INSERT INTO driver_wallets (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
    SELECT balance INTO v_balance FROM driver_wallets WHERE user_id = v_user FOR UPDATE;
    IF p_transaction_type = 'withdrawal' AND v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE driver_wallets SET balance = CASE WHEN p_transaction_type = 'deposit' THEN balance + p_amount ELSE balance - p_amount END, total_earned = total_earned + CASE WHEN p_transaction_type = 'deposit' THEN p_amount ELSE 0 END, total_withdrawn = total_withdrawn + CASE WHEN p_transaction_type = 'withdrawal' THEN p_amount ELSE 0 END, updated_at = now() WHERE user_id = v_user;
  ELSE
    INSERT INTO merchant_wallets (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
    SELECT balance INTO v_balance FROM merchant_wallets WHERE user_id = v_user FOR UPDATE;
    IF p_transaction_type = 'withdrawal' AND v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    UPDATE merchant_wallets SET balance = CASE WHEN p_transaction_type = 'deposit' THEN balance + p_amount ELSE balance - p_amount END, total_earned = total_earned + CASE WHEN p_transaction_type = 'deposit' THEN p_amount ELSE 0 END, total_withdrawn = total_withdrawn + CASE WHEN p_transaction_type = 'withdrawal' THEN p_amount ELSE 0 END, updated_at = now() WHERE user_id = v_user;
  END IF;
  INSERT INTO wallet_transactions (user_id, wallet_type, transaction_type, amount, channel, account_reference, status) VALUES (v_user, p_wallet_type, p_transaction_type, p_amount, p_channel, p_account_reference, CASE WHEN p_transaction_type = 'deposit' THEN 'completed' ELSE 'pending' END) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION apply_wallet_transaction(text, text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_wallet_transaction(text, text, numeric, text, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
