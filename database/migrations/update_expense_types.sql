-- Add 'toll' and 'parking' as valid expense types for driver expenses
ALTER TABLE vehicle_expenses
  DROP CONSTRAINT IF EXISTS vehicle_expenses_expense_type_check;

ALTER TABLE vehicle_expenses
  ADD CONSTRAINT vehicle_expenses_expense_type_check
  CHECK (expense_type IN ('fuel','maintenance','insurance','tyres','toll','parking','other'));
