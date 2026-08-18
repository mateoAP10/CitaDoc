-- Corrige 3 crons que fallaban en silencio desde su creación.
--
-- perfil-frio-daily, weekly-report-monday y review-drip-hourly usaban
-- current_setting('app.supabase_url') / current_setting('app.service_role_key')
-- en su comando net.http_post(). Supabase no permite ALTER DATABASE ... SET
-- para parámetros custom con el rol de este proyecto (permission denied to
-- set parameter), así que esos current_setting() nunca resolvieron nada y
-- cada corrida moría en el primer statement, sin registrar error visible
-- salvo en cron.job_run_details.
--
-- Fix: URL hardcodeada, mismo patrón que los crons que sí funcionan en este
-- proyecto (appointment-reminders, cancel-followup-hourly, growth-daily-content,
-- trial-reminders-daily) -- no requieren Authorization header.
--
-- Ver incidents/2026-08-18-review-drip-backlog.md para el incidente real que
-- destapó este bug al corregir review-drip-hourly.

DO $$
BEGIN
  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'perfil-frio-daily'),
    command => $cmd$SELECT net.http_post(url:='https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/perfil-frio', body:='{}'::jsonb, headers:='{"Content-Type":"application/json"}'::jsonb);$cmd$
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'weekly-report-monday'),
    command => $cmd$SELECT net.http_post(url:='https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/weekly-report', body:='{}'::jsonb, headers:='{"Content-Type":"application/json"}'::jsonb);$cmd$
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- review-drip-hourly: se corrige la URL PERO se deja pausado (active=false).
-- No reactivar hasta implementar idempotencia real + ventana de elegibilidad
-- (ver incidents/2026-08-18-review-drip-backlog.md). La función además tiene
-- un freeze a nivel de código (FROZEN=true en review-drip/index.ts) como
-- segunda capa de seguridad independiente del estado del cron.
DO $$
BEGIN
  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'review-drip-hourly'),
    command => $cmd$SELECT net.http_post(url:='https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/review-drip', body:='{}'::jsonb, headers:='{"Content-Type":"application/json"}'::jsonb);$cmd$,
    active  => false
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
