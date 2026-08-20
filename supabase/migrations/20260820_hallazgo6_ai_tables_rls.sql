-- Hallazgo #6 -- P1 seguridad (20 ago 2026).
-- ai_usage_logs, ai_rate_limits, model_pricing_versions tenian RLS
-- deshabilitado por completo, con grants INSERT/SELECT/UPDATE/DELETE/
-- TRUNCATE a anon y authenticated. Los 3 consumidores reales son 100%
-- server-side (voice-assistant-intent, medical-soap-extract,
-- voice-assistant-chat, _shared/rate-limit.ts), todos via
-- SUPABASE_SERVICE_ROLE_KEY -- ningun cliente necesita acceso directo.
--
-- ai_rate_limits es la mas critica: con anon/authenticated pudiendo leer
-- y escribir directo, cualquiera podia resetear su propio request_count
-- a mano y saltarse el rate limiting de las funciones de IA.
--
-- Sin self-service legitimo en ninguna de las 3 -> sin policies. RLS
-- habilitado sin ninguna policy permissive es deny-by-default para
-- anon/authenticated; service_role sigue bypasseando RLS como siempre.
-- REVOKE ALL explicito ademas cubre ALTER DEFAULT PRIVILEGES, mismo
-- patron que el resto de la auditoria.

alter table public.ai_usage_logs         enable row level security;
alter table public.ai_rate_limits        enable row level security;
alter table public.model_pricing_versions enable row level security;

revoke all on public.ai_usage_logs, public.ai_rate_limits, public.model_pricing_versions
  from anon, authenticated;
