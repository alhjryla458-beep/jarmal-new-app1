/*
# جَرْمَل - Admin Role & Admin Dashboard Security

## Overview
Adds a fourth role `admin` to the profiles table and creates server-enforced admin access
for managing wallet transactions, freezing/activating user accounts, and viewing platform-wide
statistics. Admin powers are enforced entirely on the database side via RLS policies and
SECURITY DEFINER functions.

## Modified Tables
- `profiles`: role CHECK widened to include `admin`. Admin SELECT policy reads all profiles.
  Admin UPDATE policy sets `is_active` on any profile. Column-level grant restricts admin
  UPDATE to `is_active` only.
- `wallet_transactions`: admin SELECT reads all; admin UPDATE changes `status` only.
- `orders`: admin SELECT reads all orders.
- `ratings_reviews`: admin SELECT reads all reviews.

## New Functions (SECURITY DEFINER, search_path = public)
1. `is_admin()` — returns true if current user has role = 'admin'.
2. `admin_confirm_wallet_transaction(p_transaction_id, p_action)` — confirm/reject a pending
   wallet transaction, reversing balance effects on rejection. Admin-only.
*/

-- ============ Widen role CHECK to include admin ============
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%customer%driver%merchant%'
      AND pg_get_constraintdef(oid) NOT LIKE '%admin%'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('customer', 'driver', 'merchant', 'admin'));
  END IF;
END $$;

-- ============ is_admin() helper ============
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============ profiles: admin can read all ============
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated
  USING (is_admin());

-- ============ profiles: admin can toggle is_active ============
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Restrict admin UPDATE to is_active column only
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (is_active) ON profiles TO authenticated;

-- ============ wallet_transactions: admin can read all ============
DROP POLICY IF EXISTS "wallet_transactions_select_admin" ON wallet_transactions;
CREATE POLICY "wallet_transactions_select_admin" ON wallet_transactions
  FOR SELECT TO authenticated
  USING (is_admin());

-- ============ wallet_transactions: admin can update status ============
DROP POLICY IF EXISTS "wallet_transactions_update_admin" ON wallet_transactions;
CREATE POLICY "wallet_transactions_update_admin" ON wallet_transactions
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

REVOKE UPDATE ON wallet_transactions FROM authenticated;
GRANT UPDATE (status) ON wallet_transactions TO authenticated;

-- ============ orders: admin can read all ============
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT TO authenticated
  USING (is_admin());

-- ============ ratings_reviews: admin can read all ============
DROP POLICY IF EXISTS "ratings_reviews_select_admin" ON ratings_reviews;
CREATE POLICY "ratings_reviews_select_admin" ON ratings_reviews
  FOR SELECT TO authenticated
  USING (is_admin());

-- ============ Admin function: confirm/reject wallet transaction ============
CREATE OR REPLACE FUNCTION admin_confirm_wallet_transaction(p_transaction_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_balance numeric;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_action NOT IN ('confirm', 'reject') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_tx FROM wallet_transactions WHERE id = p_transaction_id FOR UPDATE;

  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;

  IF p_action = 'confirm' THEN
    UPDATE wallet_transactions SET status = 'completed' WHERE id = p_transaction_id;
  ELSE
    IF v_tx.wallet_type = 'client' THEN
      SELECT balance INTO v_balance FROM client_wallets WHERE user_id = v_tx.user_id FOR UPDATE;
      IF v_tx.transaction_type = 'deposit' THEN
        IF v_balance < v_tx.amount THEN RAISE EXCEPTION 'Cannot reverse deposit: insufficient balance'; END IF;
        UPDATE client_wallets SET balance = balance - v_tx.amount, total_deposited = total_deposited - v_tx.amount, updated_at = now() WHERE user_id = v_tx.user_id;
      ELSE
        UPDATE client_wallets SET balance = balance + v_tx.amount, total_withdrawn = total_withdrawn - v_tx.amount, updated_at = now() WHERE user_id = v_tx.user_id;
      END IF;
    ELSIF v_tx.wallet_type = 'driver' THEN
      SELECT balance INTO v_balance FROM driver_wallets WHERE user_id = v_tx.user_id FOR UPDATE;
      IF v_tx.transaction_type = 'deposit' THEN
        IF v_balance < v_tx.amount THEN RAISE EXCEPTION 'Cannot reverse deposit: insufficient balance'; END IF;
        UPDATE driver_wallets SET balance = balance - v_tx.amount, total_earned = total_earned - v_tx.amount, updated_at = now() WHERE user_id = v_tx.user_id;
      ELSE
        UPDATE driver_wallets SET balance = balance + v_tx.amount, total_withdrawn = total_withdrawn - v_tx.amount, updated_at = now() WHERE user_id = v_tx.user_id;
      END IF;
    ELSIF v_tx.wallet_type = 'merchant' THEN
      SELECT balance INTO v_balance FROM merchant_wallets WHERE user_id = v_tx.user_id FOR UPDATE;
      IF v_tx.transaction_type = 'deposit' THEN
        IF v_balance < v_tx.amount THEN RAISE EXCEPTION 'Cannot reverse deposit: insufficient balance'; END IF;
        UPDATE merchant_wallets SET balance = balance - v_tx.amount, total_earned = total_earned - v_tx.amount, updated_at = now() WHERE user_id = v_tx.user_id;
      ELSE
        UPDATE merchant_wallets SET balance = balance + v_tx.amount, total_withdrawn = total_withdrawn - v_tx.amount, updated_at = now() WHERE user_id = v_tx.user_id;
      END IF;
    END IF;
    UPDATE wallet_transactions SET status = 'rejected' WHERE id = p_transaction_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_confirm_wallet_transaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_confirm_wallet_transaction(uuid, text) TO authenticated;
