ALTER TABLE medicos ADD COLUMN IF NOT EXISTS web_status TEXT DEFAULT 'preview';

-- Médicos PRO activos con web_config ya definida pasan a active
UPDATE medicos
SET web_status = 'active'
WHERE web_status IS NULL
  AND activo = true
  AND web_config IS NOT NULL
  AND plan IN ('pro', 'pro_web', 'destacado');
