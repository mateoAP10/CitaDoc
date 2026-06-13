-- website_contacts — leads generados desde el sitio público del médico
-- source: 'agendar' | 'contacto' | 'whatsapp' | 'instagram'
CREATE TABLE IF NOT EXISTS public.website_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  medico_id   UUID        NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  nombre      TEXT,
  telefono    TEXT,
  email       TEXT,
  mensaje     TEXT,
  source      TEXT        NOT NULL DEFAULT 'contacto',
  leido       BOOLEAN     DEFAULT false,
  slug        TEXT
);

ALTER TABLE public.website_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_owner_read"    ON public.website_contacts FOR SELECT  USING (auth.uid() IS NOT NULL);
CREATE POLICY "wc_public_insert" ON public.website_contacts FOR INSERT  WITH CHECK (true);

-- website_page_views — analítica básica de visitas por slug
CREATE TABLE IF NOT EXISTS public.website_page_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  medico_id  UUID        NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  slug       TEXT        NOT NULL,
  source     TEXT        DEFAULT 'direct',
  user_agent TEXT
);

ALTER TABLE public.website_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wpv_owner_read"    ON public.website_page_views FOR SELECT  USING (auth.uid() IS NOT NULL);
CREATE POLICY "wpv_public_insert" ON public.website_page_views FOR INSERT  WITH CHECK (true);
