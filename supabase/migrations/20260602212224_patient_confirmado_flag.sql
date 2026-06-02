ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS paciente_confirmado BOOLEAN DEFAULT false;
