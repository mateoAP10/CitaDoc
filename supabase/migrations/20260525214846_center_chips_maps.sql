ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS chip1     TEXT DEFAULT 'Atención inmediata',
  ADD COLUMN IF NOT EXISTS chip2     TEXT DEFAULT 'Múltiples especialidades',
  ADD COLUMN IF NOT EXISTS chip3     TEXT DEFAULT 'Lab · Imágenes · Consultas',
  ADD COLUMN IF NOT EXISTS maps_url  TEXT;
