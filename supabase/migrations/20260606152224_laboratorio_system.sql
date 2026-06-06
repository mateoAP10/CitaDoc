-- ── Catálogo de exámenes de laboratorio ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_exams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id     UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  descripcion   TEXT NOT NULL,
  categoria     TEXT DEFAULT 'Laboratorio',
  valor_lab     NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_final  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ganancia_dres NUMERIC(10,2) NOT NULL DEFAULT 0,
  ganancia_dc   NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Órdenes de laboratorio ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id           UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  patient_id          UUID REFERENCES public.center_patients(id),
  medico_id           UUID REFERENCES public.medicos(id),
  fecha               DATE DEFAULT CURRENT_DATE,
  estado              TEXT DEFAULT 'pendiente',
  total_precio_final  NUMERIC(10,2) DEFAULT 0,
  total_valor_lab     NUMERIC(10,2) DEFAULT 0,
  total_ganancia_dres NUMERIC(10,2) DEFAULT 0,
  total_ganancia_dc   NUMERIC(10,2) DEFAULT 0,
  notas               TEXT,
  lab_pagado          BOOLEAN DEFAULT false,
  medico_pagado       BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Ítems de cada orden ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  exam_id       UUID REFERENCES public.lab_exams(id),
  descripcion   TEXT NOT NULL,
  valor_lab     NUMERIC(10,2) NOT NULL,
  precio_final  NUMERIC(10,2) NOT NULL,
  ganancia_dres NUMERIC(10,2) NOT NULL,
  ganancia_dc   NUMERIC(10,2) NOT NULL
);

-- ── Liquidaciones / pagos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_liquidaciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id  UUID REFERENCES public.centers(id),
  tipo       TEXT NOT NULL, -- 'laboratorio' | 'medico'
  medico_id  UUID REFERENCES public.medicos(id),
  monto      NUMERIC(10,2) NOT NULL,
  fecha      DATE DEFAULT CURRENT_DATE,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.lab_exams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_liquidaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_exams_public"        ON public.lab_exams        FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_orders_public"       ON public.lab_orders       FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_order_items_public"  ON public.lab_order_items  FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_liquidaciones_public" ON public.lab_liquidaciones FOR ALL TO public USING (true) WITH CHECK (true);
