-- Observabilidad -- cron de abuse-detector, cada 15 minutos.
-- Versionado desde el dia 1 (a diferencia de varios crons viejos de
-- este proyecto que solo existian en la DB viva, sin migracion).
--
-- IMPORTANTE: <SERVICE_ROLE_KEY> es un placeholder a proposito -- este
-- archivo nunca se corre verbatim contra produccion (GitHub secret
-- scanning bloqueo un push real de este mismo tipo durante P2.3 cuando
-- el valor real quedo commiteado). El valor real se aplica directo via
-- `supabase db query --linked`, igual que el resto de los headers de
-- cron.job de este proyecto -- ninguno queda en un archivo de git.

-- Nota: cron.schedule() no admite ON CONFLICT (es una llamada a funcion,
-- no un INSERT) -- si esta migracion se re-corre con el jobname ya
-- existente, pg_cron tira error de duplicado. Solo se corre una vez.
SELECT cron.schedule(
  'abuse-detector-15min',
  '*/15 * * * *',
  $cmd$
    SELECT net.http_post(
      url:='https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/abuse-detector',
      body:='{}'::jsonb,
      headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
    );
  $cmd$
);
