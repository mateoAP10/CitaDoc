ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS portada_blur    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portada_filter  TEXT    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS logo_url        TEXT;
