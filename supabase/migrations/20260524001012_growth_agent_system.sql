-- ── growth_events — log de todas las acciones del Growth Agent ───────────────
CREATE TABLE IF NOT EXISTS public.growth_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  medico_id       UUID        REFERENCES public.medicos(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  onboarding_state TEXT,
  metadata        JSONB       DEFAULT '{}'
);

ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_events_service" ON public.growth_events FOR ALL USING (true);

-- ── Columnas en medicos ────────────────────────────────────────────────────────
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS onboarding_state      TEXT;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS growth_agent_fired_at TIMESTAMPTZ;

-- ── Trigger: dispara growth-agent al instante cuando se crea un médico ────────
CREATE OR REPLACE FUNCTION trigger_growth_agent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/growth-agent',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object('medico_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_growth_agent ON public.medicos;
CREATE TRIGGER trg_growth_agent
  AFTER INSERT ON public.medicos
  FOR EACH ROW EXECUTE FUNCTION trigger_growth_agent();
