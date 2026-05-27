-- Auto-create medico row on auth.users INSERT (signUp)
-- Elimina la dependencia de localStorage + RPC post-confirmación

-- Trigger function
CREATE OR REPLACE FUNCTION public.handle_new_medico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre  TEXT;
  v_apellido TEXT;
  v_titulo  TEXT;
  v_slug    TEXT;
  v_base    TEXT;
  v_n       INT := 0;
BEGIN
  v_nombre  := NEW.raw_user_meta_data->>'nombre';
  v_apellido := COALESCE(NEW.raw_user_meta_data->>'apellido', '');
  v_titulo  := COALESCE(NEW.raw_user_meta_data->>'titulo', 'Dr.');

  -- Solo para registros médicos (tienen nombre)
  IF v_nombre IS NULL OR v_nombre = '' THEN
    RETURN NEW;
  END IF;

  -- Si ya existe, no hacer nada
  IF EXISTS (SELECT 1 FROM public.medicos WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Generar slug único
  v_base := lower(
    regexp_replace(
      regexp_replace(v_titulo, '\.', '', 'g') || '-' || v_nombre || '-' || v_apellido,
      '[^a-zA-Z0-9]+', '-', 'g'
    )
  );
  v_base := trim(both '-' from v_base);
  v_slug := v_base;

  WHILE EXISTS (SELECT 1 FROM public.medicos WHERE slug = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  -- Crear fila básica del médico
  INSERT INTO public.medicos (
    user_id, email, nombre, apellido, titulo, slug,
    plan, plan_activo, activo, subscription_status, verificacion_estado
  ) VALUES (
    NEW.id, NEW.email, v_nombre, v_apellido, v_titulo, v_slug,
    'gratuito', false, true, 'active', 'pendiente'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear el signUp por un error aquí
  RETURN NEW;
END;
$$;

-- Recrear trigger limpio
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_medico();
