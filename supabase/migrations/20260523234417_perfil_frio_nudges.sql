-- Migration: Perfil frío — tracking de nudges enviados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'perfil_nudges_sent'
  ) THEN
    ALTER TABLE public.medicos ADD COLUMN perfil_nudges_sent TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Cron: detector de perfiles fríos — daily 10:00 UTC
DO $$
BEGIN
  PERFORM cron.schedule(
    'perfil-frio-daily',
    '0 10 * * *',
    $cron$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/perfil-frio',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
EXCEPTION WHEN unique_violation THEN NULL;
END $$;
