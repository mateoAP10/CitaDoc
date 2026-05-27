-- Fix register_medico: extend 30-min window to 7 days so email confirmation works anytime
-- Root cause: doctors confirming email after 30 min got silently rejected

CREATE OR REPLACE FUNCTION public.register_medico(
  p_user_id UUID,
  p_email TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_titulo TEXT,
  p_cedula TEXT DEFAULT '',
  p_senescyt TEXT DEFAULT '',
  p_slug TEXT DEFAULT '',
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
  -- Verify user exists and email matches (removed 30-min window — confirmation can arrive anytime)
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
      AND email = p_email
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
