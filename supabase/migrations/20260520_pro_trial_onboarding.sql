-- Migration: Pro Trial Onboarding
-- Adds subscription_status to medicos and updates register_medico RPC

-- 1. Add subscription_status if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.medicos ADD COLUMN subscription_status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 2. Update existing records: pro with trial_ends_at in future -> trialing
UPDATE public.medicos
SET subscription_status = 'trialing'
WHERE plan = 'pro'
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at > NOW()
  AND (subscription_status IS NULL OR subscription_status = '');

-- 3. Update existing records: free or pro without trial -> active
UPDATE public.medicos
SET subscription_status = 'active'
WHERE (subscription_status IS NULL OR subscription_status = '')
  AND (plan = 'gratuito' OR plan = 'free' OR trial_ends_at IS NULL);

-- 4. Recreate register_medico with subscription_status support
CREATE OR REPLACE FUNCTION public.register_medico(
  p_user_id UUID,
  p_email TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_titulo TEXT,
  p_cedula TEXT DEFAULT '',
  p_senescyt TEXT DEFAULT '',
  p_slug TEXT,
  p_bio TEXT DEFAULT '',
  p_precio INTEGER DEFAULT 0,
  p_pais TEXT DEFAULT '',
  p_ciudad TEXT DEFAULT '',
  p_especialidades TEXT[] DEFAULT '{}',
  p_seguros TEXT[] DEFAULT '{}',
  p_telefono TEXT DEFAULT '',
  p_horario_desde TEXT DEFAULT '09:00',
  p_horario_hasta TEXT DEFAULT '17:00',
  p_dias_atencion TEXT[] DEFAULT '{}',
  p_plan TEXT DEFAULT 'gratuito',
  p_plan_activo BOOLEAN DEFAULT false,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_subscription_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
      AND email = p_email
      AND created_at > now() - interval '30 minutes'
  ) THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  IF EXISTS (SELECT 1 FROM public.medicos WHERE user_id = p_user_id) THEN
    RETURN json_build_object('success', true, 'existing', true);
  END IF;

  -- Determine subscription_status if not provided
  v_status := COALESCE(p_subscription_status, 'active');
  IF p_plan = 'pro' AND p_trial_ends_at IS NOT NULL THEN
    v_status := 'trialing';
  END IF;

  INSERT INTO public.medicos (
    user_id, email, nombre, apellido, titulo, cedula, senescyt, slug, bio,
    precio, pais, ciudad, especialidades, seguros, telefono,
    horario_desde, horario_hasta, dias_atencion,
    plan, plan_activo, trial_ends_at, subscription_status, activo
  ) VALUES (
    p_user_id, p_email, p_nombre, p_apellido, p_titulo, p_cedula, p_senescyt,
    p_slug, p_bio, p_precio, p_pais, p_ciudad, p_especialidades, p_seguros,
    p_telefono, p_horario_desde, p_horario_hasta, p_dias_atencion,
    p_plan, p_plan_activo, p_trial_ends_at, v_status, true
  );

  RETURN json_build_object('success', true, 'existing', false);
END;
$$;
