-- Migration: Onboarding drip emails tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'onboarding_emails_sent'
  ) THEN
    ALTER TABLE public.medicos ADD COLUMN onboarding_emails_sent TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Cron: run onboarding drip daily at 09:00 UTC
SELECT cron.schedule(
  'onboarding-drip-daily',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/onboarding-drip',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
)
ON CONFLICT (jobname) DO NOTHING;
