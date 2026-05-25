-- ── Centers ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.centers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  slug          TEXT        UNIQUE NOT NULL,
  nombre        TEXT        NOT NULL,
  tagline       TEXT,
  descripcion   TEXT,
  logo_url      TEXT,
  portada_url   TEXT,
  ciudad        TEXT,
  direccion     TEXT,
  telefono      TEXT,
  whatsapp      TEXT,
  instagram     TEXT,
  color_primary TEXT        DEFAULT '#CC2936',
  activo        BOOLEAN     DEFAULT true
);

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centers_public_read"  ON public.centers FOR SELECT USING (activo = true);
CREATE POLICY "centers_service_write" ON public.centers FOR ALL    USING (true);

-- ── Center Services ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.center_services (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id    UUID        REFERENCES public.centers(id) ON DELETE CASCADE,
  nombre       TEXT        NOT NULL,
  categoria    TEXT        NOT NULL,
  precio       NUMERIC(10,2),
  descripcion  TEXT,
  booking_type TEXT        NOT NULL DEFAULT 'request',
  orden        INTEGER     DEFAULT 0,
  activo       BOOLEAN     DEFAULT true
);

ALTER TABLE public.center_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "center_services_public_read" ON public.center_services FOR SELECT USING (activo = true);
CREATE POLICY "center_services_write"       ON public.center_services FOR ALL    USING (true);

-- ── Center Doctors (junction) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.center_doctors (
  center_id UUID REFERENCES public.centers(id)  ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id)  ON DELETE CASCADE,
  orden     INTEGER DEFAULT 0,
  PRIMARY KEY (center_id, medico_id)
);

ALTER TABLE public.center_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "center_doctors_public_read" ON public.center_doctors FOR SELECT USING (true);
CREATE POLICY "center_doctors_write"       ON public.center_doctors FOR ALL    USING (true);

-- ── Seed: Doctor Center ───────────────────────────────────────────────────────
INSERT INTO public.centers (slug, nombre, tagline, descripcion, ciudad, direccion, telefono, whatsapp, instagram, color_primary)
VALUES (
  'doctor-center',
  'Doctor Center',
  'Tu salud, nuestra prioridad',
  'Medicina de excelencia, tecnología avanzada y atención humana en un solo lugar.',
  'Guayaquil',
  'Urdesa Norte AV 24, Villa B15',
  '+593 98 917 3062',
  '593989173062',
  'doctorcenterec',
  '#CC2936'
) ON CONFLICT (slug) DO NOTHING;

-- ── Seed: Servicios Doctor Center ────────────────────────────────────────────
DO $$
DECLARE cid UUID;
BEGIN
  SELECT id INTO cid FROM public.centers WHERE slug = 'doctor-center';

  INSERT INTO public.center_services (center_id, nombre, categoria, precio, booking_type, orden) VALUES
    (cid, 'Medicina general',    'consulta',    25,  'doctor',  1),
    (cid, 'Pediatría',           'consulta',    30,  'doctor',  2),
    (cid, 'Ginecología',         'consulta',    35,  'doctor',  3),
    (cid, 'Traumatología',       'consulta',    35,  'doctor',  4),
    (cid, 'Cardiología',         'consulta',    40,  'doctor',  5),
    (cid, 'Dermatología',        'consulta',    35,  'doctor',  6),
    (cid, 'Biometría hemática',  'laboratorio',  8,  'request', 1),
    (cid, 'Glucosa',             'laboratorio',  5,  'request', 2),
    (cid, 'Perfil lipídico',     'laboratorio', 18,  'request', 3),
    (cid, 'Hemograma completo',  'laboratorio', 12,  'request', 4),
    (cid, 'Uroanálisis',         'laboratorio',  7,  'request', 5),
    (cid, 'Función renal',       'laboratorio', 20,  'request', 6),
    (cid, 'Ecografía abdominal', 'imagen',      35,  'request', 1),
    (cid, 'Ecografía obstétrica','imagen',      40,  'request', 2),
    (cid, 'Radiografía',         'imagen',      20,  'request', 3),
    (cid, 'Electrocardiograma',  'imagen',      25,  'request', 4),
    (cid, 'Espirometría',        'imagen',      30,  'request', 5)
  ON CONFLICT DO NOTHING;
END $$;
