-- Grupo B (P2.3) -- versiona trigger_auto_website_config, que existia
-- SOLO en la base viva sin ninguna migracion en git (mismo patron de
-- drift ya visto en appointment-reminders/onboarding-drip/scout-leads).
--
-- Agrega ademas el Authorization que le faltaba: generate-website-config
-- paso a exigir auth (JWT del propio medico, admin, o service_role) en
-- el mismo bloque de seguridad -- sin este header el trigger se hubiera
-- roto en silencio, mismo patron que HF1.
--
-- Condicion y logica del trigger SIN CAMBIOS respecto a como corria en
-- produccion: dispara solo la primera vez que un medico completa su
-- perfil (foto+bio+especialidad+activo) y todavia no tiene ningun
-- web_config/web_config_draft -- naturalmente idempotente, no se toca.
--
-- IMPORTANTE: <SERVICE_ROLE_KEY> es un placeholder a proposito -- este
-- archivo NUNCA se corrio verbatim contra produccion (GitHub secret
-- scanning bloqueo el push cuando el valor real estaba commiteado). El
-- valor real se aplico directo via `supabase db query --linked`, igual
-- que todos los headers de cron.job de este mismo sweep P2.3 -- ninguno
-- de esos quedo tampoco en un archivo de git. Mismo criterio acá.

CREATE OR REPLACE FUNCTION public.trigger_auto_website_config()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (
    NEW.foto_url IS NOT NULL AND NEW.foto_url != '' AND
    NEW.bio IS NOT NULL AND length(trim(NEW.bio)) > 20 AND
    array_length(NEW.especialidades, 1) > 0 AND
    NEW.activo = true AND
    NEW.web_config IS NULL AND
    NEW.web_config_draft IS NULL AND
    (OLD.foto_url IS DISTINCT FROM NEW.foto_url OR
     OLD.bio IS DISTINCT FROM NEW.bio)
  ) THEN
    PERFORM net.http_post(
      url     := 'https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/generate-website-config',
      body    := json_build_object('medico_id', NEW.id, 'use_mock', false)::jsonb,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'  -- ver nota arriba: placeholder a proposito
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_website_config_on_profile_complete ON public.medicos;
CREATE TRIGGER auto_website_config_on_profile_complete
  AFTER UPDATE ON public.medicos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_website_config();
