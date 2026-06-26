-- ============================================
-- RentaHub Database Schema
-- Supabase PostgreSQL Migration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUILDINGS TABLE
-- ============================================
CREATE TABLE buildings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  description TEXT,
  total_rooms INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  floor INTEGER DEFAULT 1,
  capacity INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  monthly_rate DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_id, room_number)
);

-- ============================================
-- ACCOUNTS TABLE (one per room)
-- ============================================
CREATE TABLE accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,
  primary_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  move_in_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANTS TABLE (multiple per account/room)
-- ============================================
CREATE TABLE tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  is_primary BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BILLS TABLE
-- ============================================
CREATE TABLE bills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bill_type VARCHAR(20) NOT NULL CHECK (bill_type IN ('water', 'electricity', 'utilities')),
  amount DECIMAL(10,2) NOT NULL,
  billing_period VARCHAR(50),
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'partial')),
  image_url TEXT,
  notes TEXT,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT TRUE,
  target_building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN PROFILES TABLE
-- ============================================
CREATE TABLE admin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_rooms_building_id ON rooms(building_id);
CREATE INDEX idx_accounts_room_id ON accounts(room_id);
CREATE INDEX idx_tenants_account_id ON tenants(account_id);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_auth_user_id ON tenants(auth_user_id);
CREATE INDEX idx_bills_account_id ON bills(account_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (service role bypasses RLS, these are for authenticated users)
CREATE POLICY "Admins full access to buildings" ON buildings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to rooms" ON rooms FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to accounts" ON accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to tenants" ON tenants FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to bills" ON bills FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to payments" ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to announcements" ON announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins full access to admin_profiles" ON admin_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

-- Tenants can read their own data
CREATE POLICY "Tenants can view their own tenant record" ON tenants FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Tenants can view their account" ON accounts FOR SELECT
  USING (id IN (SELECT account_id FROM tenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tenants can view their room" ON rooms FOR SELECT
  USING (id IN (SELECT room_id FROM accounts WHERE id IN (SELECT account_id FROM tenants WHERE auth_user_id = auth.uid())));

CREATE POLICY "Tenants can view their building" ON buildings FOR SELECT
  USING (id IN (SELECT building_id FROM rooms WHERE id IN (SELECT room_id FROM accounts WHERE id IN (SELECT account_id FROM tenants WHERE auth_user_id = auth.uid()))));

CREATE POLICY "Tenants can view their bills" ON bills FOR SELECT
  USING (account_id IN (SELECT account_id FROM tenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tenants can view their payments" ON payments FOR SELECT
  USING (bill_id IN (SELECT id FROM bills WHERE account_id IN (SELECT account_id FROM tenants WHERE auth_user_id = auth.uid())));

CREATE POLICY "Tenants can view active announcements" ON announcements FOR SELECT
  USING (is_active = TRUE);

-- ============================================
-- STORAGE BUCKET FOR BILL IMAGES
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('bill-images', 'bill-images', true);

CREATE POLICY "Admin can upload bill images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bill-images' AND EXISTS (SELECT 1 FROM admin_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Anyone can view bill images" ON storage.objects FOR SELECT
  USING (bucket_id = 'bill-images');

-- ============================================
-- SEED DATA: 5 Buildings
-- ============================================
INSERT INTO buildings (name, address, description, total_rooms) VALUES
  ('Building A', '123 Main Street', 'Primary residential building with modern amenities', 15),
  ('Building B', '124 Main Street', 'Second residential building with garden access', 15),
  ('Building C', '125 Main Street', 'Third residential building near the park', 15),
  ('Building D', '126 Main Street', 'Fourth residential building with parking', 15),
  ('Building E', '127 Main Street', 'Fifth residential building with rooftop deck', 15);

-- Seed 15 rooms per building
DO $$
DECLARE
  bldg RECORD;
  i INTEGER;
BEGIN
  FOR bldg IN SELECT id FROM buildings LOOP
    FOR i IN 1..15 LOOP
      INSERT INTO rooms (building_id, room_number, floor, capacity, monthly_rate)
      VALUES (bldg.id, 'R' || LPAD(i::TEXT, 2, '0'), CEIL(i::FLOAT / 5), 4, 5000.00);
    END LOOP;
  END LOOP;
END $$;
