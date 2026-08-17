-- Repositorio de documentos clínicos por paciente -- capa de INDEXACIÓN pura.
-- Nunca es la ruta que genera el PDF (esa sigue siendo generarYSubirPDF() en
-- citadoc-dashboard.html, sin cambios de comportamiento) -- esta tabla solo
-- registra lo que esa función ya subió a Storage, para poder listarlo por
-- paciente. Indexa desde ahora en adelante: los PDFs generados antes de esta
-- migración no tienen patient_id recuperable y no se reconstruyen retroactivamente.

CREATE TABLE IF NOT EXISTS public.documentos_clinicos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id         UUID NOT NULL REFERENCES public.medicos(id),
  paciente_id       UUID NOT NULL REFERENCES public.pacientes(id),
  consulta_id       UUID REFERENCES public.consultas(id),
  tipo              TEXT NOT NULL CHECK (tipo IN ('receta','laboratorio','imagenes','resumen','certificado')),
  origen            TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','assistant')),
  estado            TEXT NOT NULL DEFAULT 'generado' CHECK (estado IN ('generado','enviado','error_envio')),
  storage_path      TEXT NOT NULL,
  pdf_url           TEXT NOT NULL,
  email_enviado_a   TEXT,
  enviado_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documentos_clinicos_paciente_idx ON public.documentos_clinicos (paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documentos_clinicos_medico_idx   ON public.documentos_clinicos (medico_id);

ALTER TABLE public.documentos_clinicos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documentos_clinicos' AND policyname='documentos_clinicos_all'
  ) THEN
    CREATE POLICY "documentos_clinicos_all" ON public.documentos_clinicos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
