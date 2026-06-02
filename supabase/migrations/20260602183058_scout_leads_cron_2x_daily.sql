-- Scout-leads cron: 2 veces al día, batches rotados
-- Mañana 08:00 UTC (run_index=0) + Tarde 18:00 UTC (run_index=1)
-- Cada run hace 5 queries × 20 resultados = ~50 leads/día

select cron.schedule(
  'scout-leads-morning',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/scout-leads',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body    := '{"run_index":0,"batch_size":5}'::jsonb
  );
  $$
);

select cron.schedule(
  'scout-leads-afternoon',
  '0 18 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/scout-leads',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body    := '{"run_index":1,"batch_size":5}'::jsonb
  );
  $$
);