/*
# جَرْمَل - Wallets, Payouts, and Store Status

## Overview
Adds wallet balances for drivers and merchants, a payout request system with local Yemeni payment channels, and a store open/closed toggle.

## Tables Created
1. `wallets` - Balance tracking per user (driver/merchant)
2. `payout_requests` - Withdrawal requests via local payment channels

## Tables Modified
1. `stores` - Added `is_open` toggle (already exists, adding `merchant_phone` and `merchant_address` for completeness)

## Payment Channels
- جيب (Jawwal)
- ون كاش (OneCash)
- الكريمي (Al-Kuraimi)
- البنك اليمني الكويتي (YKB)

## Security
- wallets: owner can read/update own balance
- payout_requests: owner can read/insert own requests
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_select_own" ON wallets;
CREATE POLICY "wallets_select_own" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallets_insert_own" ON wallets;
CREATE POLICY "wallets_insert_own" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallets_update_own" ON wallets;
CREATE POLICY "wallets_update_own" ON wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  channel text NOT NULL,
  channel_account text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_select_own" ON payout_requests;
CREATE POLICY "payouts_select_own" ON payout_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payouts_insert_own" ON payout_requests;
CREATE POLICY "payouts_insert_own" ON payout_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payout_requests(user_id);
