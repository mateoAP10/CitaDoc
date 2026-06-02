ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS reminder_3h_sent BOOLEAN DEFAULT false;
