-- ============================================================
-- Fleet Management Schema
-- Namibian Driver-Owner Connection App
-- ============================================================

-- VEHICLES table: cars registered by owners
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,           -- e.g. Toyota
  model VARCHAR(100) NOT NULL,          -- e.g. HiAce
  year INTEGER NOT NULL,
  color VARCHAR(50),
  registration_number VARCHAR(30) NOT NULL UNIQUE,  -- Namibian plate e.g. N 12345 W
  vehicle_type VARCHAR(50) NOT NULL,    -- sedan, minibus, bakkie, truck, etc.
  capacity INTEGER,                     -- passenger or load capacity
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'maintenance', 'inactive')),
  vin VARCHAR(50),                      -- Vehicle Identification Number
  insurance_expiry DATE,
  roadworthy_expiry DATE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VEHICLE ASSIGNMENTS table: links vehicles to drivers per job/vacancy
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id), -- owner who made assignment
  job_id UUID,                          -- optional: link to a job/vacancy table
  job_title VARCHAR(200),               -- label for the vacancy/role
  start_date DATE NOT NULL,
  end_date DATE,                        -- null = ongoing
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver ON vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON vehicle_assignments(status);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON vehicle_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own vehicles
CREATE POLICY "owners_manage_vehicles" ON vehicles
  FOR ALL USING (auth.uid() = owner_id);

-- Drivers can view vehicles assigned to them
CREATE POLICY "drivers_view_assigned_vehicles" ON vehicles
  FOR SELECT USING (
    id IN (
      SELECT vehicle_id FROM vehicle_assignments
      WHERE driver_id = auth.uid() AND status = 'active'
    )
  );

-- Owners manage assignments for their vehicles
CREATE POLICY "owners_manage_assignments" ON vehicle_assignments
  FOR ALL USING (assigned_by = auth.uid());

-- Drivers can view their own assignments
CREATE POLICY "drivers_view_assignments" ON vehicle_assignments
  FOR SELECT USING (driver_id = auth.uid());

