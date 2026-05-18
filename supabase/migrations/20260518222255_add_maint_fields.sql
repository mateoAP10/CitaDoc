ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS maint_paid_until  date,
  ADD COLUMN IF NOT EXISTS plan_activated_at timestamptz;
