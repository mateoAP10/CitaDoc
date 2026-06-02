ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS cancelada_at TIMESTAMPTZ;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS reschedule_prompt_sent BOOLEAN DEFAULT false;
