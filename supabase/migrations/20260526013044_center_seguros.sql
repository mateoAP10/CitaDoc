-- Add seguros (insurance) arrays to centers and center_services
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS seguros TEXT[] DEFAULT '{}';

ALTER TABLE public.center_services
  ADD COLUMN IF NOT EXISTS seguros TEXT[] DEFAULT '{}';
