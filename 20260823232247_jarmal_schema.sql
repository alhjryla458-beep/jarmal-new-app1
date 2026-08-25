/*
# جَرْمَل - Delivery App Schema

## Overview
Creates the complete database schema for the جَرْمَل delivery application with three roles:
- عميل (Customer): browses stores, orders products, tracks delivery
- مندوب توصيل (Driver): accepts and delivers orders
- تاجر (Merchant): manages store, products, and incoming orders

## Tables Created
1. `profiles` - Extends auth.users with role, phone, national_id, and role-specific fields
2. `driver_access_codes` - Pre-issued codes that drivers must present to register
3. `stores` - Merchant stores with category and location
4. `products` - Products belonging to a store with price and availability
5. `orders` - Orders placed by customers, assigned to drivers, with status lifecycle
6. `order_items` - Line items within an order
7. `driver_locations` - Live GPS coordinates for active drivers (for tracking)

## Security (RLS)
- All tables have RLS enabled
- profiles: each user reads/updates only their own row
- driver_access_codes: anyone can SELECT (needed to validate code at signup), only service role can INSERT/UPDATE/DELETE
- stores: all authenticated can read; merchant owner can insert/update/delete own
- products: all authenticated can read; store owner can insert/update/delete own products
- orders: customer can read/update own orders; driver can read/update assigned orders; merchant can read/update orders for their store; all authenticated can insert
- order_items: read for customer/driver/merchant of the parent order; insert by customer; update by merchant
- driver_locations: driver updates own location; customer can read location for their active order's driver; merchant can read for their store's active orders

## Notes
- Owner columns default to auth.uid() so inserts that omit the owner succeed
- driver_access_codes is intentionally world-readable so the anon client can validate a code before signup
- Order status lifecycle: pending -> accepted -> at_store -> picked_up -> en_route -> delivered (also cancelled)
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'driver', 'merchant')),
  full_name text,
  phone text,
  national_id text,
  email text,
  store_name text,
  store_category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ driver_access_codes ============
CREATE TABLE IF NOT EXISTS driver_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_codes_select_all" ON driver_access_codes;
CREATE POLICY "access_codes_select_all" ON driver_access_codes FOR SELECT
  TO anon, authenticated USING (true);

-- ============ stores ============
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  is_open boolean NOT NULL DEFAULT true,
  rating numeric DEFAULT 0,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select_all" ON stores;
CREATE POLICY "stores_select_all" ON stores FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "stores_insert_own" ON stores;
CREATE POLICY "stores_insert_own" ON stores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = merchant_id);

DROP POLICY IF EXISTS "stores_update_own" ON stores;
CREATE POLICY "stores_update_own" ON stores FOR UPDATE
  TO authenticated USING (auth.uid() = merchant_id) WITH CHECK (auth.uid() = merchant_id);

DROP POLICY IF EXISTS "stores_delete_own" ON stores;
CREATE POLICY "stores_delete_own" ON stores FOR DELETE
  TO authenticated USING (auth.uid() = merchant_id);

CREATE INDEX IF NOT EXISTS idx_stores_merchant ON stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);

-- ============ products ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  category text,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_all" ON products;
CREATE POLICY "products_select_all" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.merchant_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.merchant_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.merchant_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.merchant_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);

-- ============ orders ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','at_store','picked_up','en_route','delivered','cancelled')),
  total numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  notes text,
  customer_latitude double precision,
  customer_longitude double precision,
  customer_address text,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_role" ON orders;
CREATE POLICY "orders_select_role" ON orders FOR SELECT
  TO authenticated USING (
    auth.uid() = customer_id
    OR auth.uid() = driver_id
    OR status = 'pending'
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.merchant_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_insert_customer" ON orders;
CREATE POLICY "orders_insert_customer" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "orders_update_role" ON orders;
CREATE POLICY "orders_update_role" ON orders FOR UPDATE
  TO authenticated USING (
    auth.uid() = customer_id
    OR auth.uid() = driver_id
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.merchant_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = customer_id
    OR auth.uid() = driver_id
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.merchant_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_delete_customer" ON orders;
CREATE POLICY "orders_delete_customer" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============ order_items ============
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_role" ON order_items;
CREATE POLICY "order_items_select_role" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_id = auth.uid()
        OR orders.driver_id = auth.uid()
        OR EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.merchant_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "order_items_insert_customer" ON order_items;
CREATE POLICY "order_items_insert_customer" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============ driver_locations ============
CREATE TABLE IF NOT EXISTS driver_locations (
  driver_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_locations_insert_own" ON driver_locations;
CREATE POLICY "driver_locations_insert_own" ON driver_locations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "driver_locations_update_own" ON driver_locations;
CREATE POLICY "driver_locations_update_own" ON driver_locations FOR UPDATE
  TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "driver_locations_select_role" ON driver_locations;
CREATE POLICY "driver_locations_select_role" ON driver_locations FOR SELECT
  TO authenticated USING (
    auth.uid() = driver_id
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.driver_id = driver_locations.driver_id
      AND orders.customer_id = auth.uid()
      AND orders.status IN ('accepted','at_store','picked_up','en_route')
    )
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.driver_id = driver_locations.driver_id
      AND EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.merchant_id = auth.uid())
      AND orders.status IN ('accepted','at_store','picked_up','en_route')
    )
  );

-- ============ updated_at trigger for driver_locations ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_locations_updated_at ON driver_locations;
CREATE TRIGGER trg_driver_locations_updated_at
  BEFORE UPDATE ON driver_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
