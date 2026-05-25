-- Center consultations — doctor portal backed by CitaDoc
CREATE TABLE IF NOT EXISTS public.center_consultations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  center_id        UUID        REFERENCES public.centers(id) ON DELETE CASCADE,
  medico_id        UUID        REFERENCES public.medicos(id),
  paciente_nombre  TEXT        NOT NULL,
  paciente_tel     TEXT,
  motivo           TEXT,
  diagnostico      TEXT,
  notas            TEXT,
  fecha            DATE        DEFAULT CURRENT_DATE
);

ALTER TABLE public.center_consultations ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (doctors) can read/write consultations
CREATE POLICY "cc_auth_read"   ON public.center_consultations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cc_auth_insert" ON public.center_consultations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
