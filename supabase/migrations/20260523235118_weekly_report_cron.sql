-- Migration: Weekly performance report — cron lunes 09:00 UTC
DO $$
BEGIN
  PERFORM cron.schedule(
    'weekly-report-monday',
    '0 9 * * 1',
    $cron$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/weekly-report',
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
