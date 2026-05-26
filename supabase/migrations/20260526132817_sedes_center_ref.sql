-- Add center_ref to doctor_locations so center-backed locations are trackable
ALTER TABLE public.doctor_locations
  ADD COLUMN IF NOT EXISTS center_ref UUID REFERENCES public.centers(id) ON DELETE CASCADE;
