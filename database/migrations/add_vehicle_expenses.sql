CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id           UUID REFERENCES profiles(id),
  agreement_id        UUID REFERENCES driver_agreements(id),
  vehicle_description TEXT,
  expense_type        TEXT NOT NULL
                      CHECK (expense_type IN ('fuel','maintenance','insurance','tyres','other')),
  amount              NUMERIC(10,2) NOT NULL,
  expense_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_access_expenses" ON vehicle_expenses
  FOR ALL USING (owner_id = auth.uid());
