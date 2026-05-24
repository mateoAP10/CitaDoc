-- ── Tabla reseñas ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resenas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  cita_id      UUID        UNIQUE REFERENCES public.citas(id) ON DELETE CASCADE,
  medico_id    UUID        REFERENCES public.medicos(id) ON DELETE CASCADE,
  rating_medico SMALLINT   CHECK (rating_medico BETWEEN 1 AND 5),
  rating_app    SMALLINT   CHECK (rating_app BETWEEN 1 AND 5),
  comentario   TEXT
);

ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resenas_public_read" ON public.resenas FOR SELECT USING (true);
CREATE POLICY "resenas_service_write" ON public.resenas FOR ALL USING (true);

-- ── Columnas en medicos ────────────────────────────────────────────────────────
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS rating_promedio NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS total_resenas   INTEGER      DEFAULT 0;

-- ── review_sent en citas ───────────────────────────────────────────────────────
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS review_sent BOOLEAN DEFAULT false;

-- ── Trigger: actualiza rating en medicos tras cada reseña ──────────────────────
CREATE OR REPLACE FUNCTION sync_medico_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.medicos
  SET
    rating_promedio = (
      SELECT ROUND(AVG(rating_medico)::NUMERIC, 2)
      FROM public.resenas
      WHERE medico_id = NEW.medico_id AND rating_medico IS NOT NULL
    ),
    total_resenas = (
      SELECT COUNT(*)
      FROM public.resenas
      WHERE medico_id = NEW.medico_id AND rating_medico IS NOT NULL
    )
  WHERE id = NEW.medico_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_medico_rating ON public.resenas;
CREATE TRIGGER trg_sync_medico_rating
  AFTER INSERT OR UPDATE ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION sync_medico_rating();

-- ── Cron: review drip cada hora ────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.schedule(
    'review-drip-hourly',
    '30 * * * *',
    $cron$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/review-drip',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
EXCEPTION WHEN unique_violation THEN NULL;
END $$;
