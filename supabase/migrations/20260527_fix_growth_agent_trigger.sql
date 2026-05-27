-- Fix trigger_growth_agent: no crashear cuando app.supabase_url no está seteado
-- Bloqueaba todos los INSERTs en medicos (incluyendo el trigger de auto-creación)

CREATE OR REPLACE FUNCTION public.trigger_growth_agent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  v_url := current_setting('app.supabase_url', true);
  v_key := current_setting('app.service_role_key', true);
  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/growth-agent',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_key),
      body    := jsonb_build_object('medico_id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
