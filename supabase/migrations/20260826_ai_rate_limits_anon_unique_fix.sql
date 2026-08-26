-- Observabilidad P0 -- ai_rate_limits nunca aplico el limite para
-- llamadas anonimas (doctor_id IS NULL): el UNIQUE existente es
-- (doctor_id, feature, window_start), y Postgres trata NULL <> NULL en
-- constraints de unicidad, asi que cada request anonimo insertaba una
-- fila nueva en vez de incrementar la existente -- confirmado con
-- evidencia real (4 llamadas a triage-especialidad, limite 3/min,
-- las 4 pasaron; 4 filas separadas para el mismo ip/feature/ventana en
-- vez de una con request_count subiendo).
--
-- Fix: indice unico parcial para el caso anonimo, usando (ip, feature,
-- window_start) -- el caso autenticado/service_role sigue exactamente
-- igual, sin tocar el constraint ni checkRateLimit().

-- 1. Consolidar duplicados existentes ANTES de crear el indice (si no,
--    la creacion falla por violacion de unicidad). Se suman los
--    request_count del grupo en una sola fila -- preserva el conteo
--    real de trafico en vez de descartarlo.
WITH grupos AS (
  SELECT ip, feature, window_start,
         min(id::text)::uuid AS keep_id,
         sum(request_count)  AS total
  FROM ai_rate_limits
  WHERE doctor_id IS NULL
  GROUP BY ip, feature, window_start
  HAVING count(*) > 1
)
UPDATE ai_rate_limits a
SET request_count = g.total
FROM grupos g
WHERE a.id = g.keep_id;

WITH grupos AS (
  SELECT ip, feature, window_start, min(id::text)::uuid AS keep_id
  FROM ai_rate_limits
  WHERE doctor_id IS NULL
  GROUP BY ip, feature, window_start
  HAVING count(*) > 1
)
DELETE FROM ai_rate_limits a
USING grupos g
WHERE a.doctor_id IS NULL
  AND a.ip = g.ip
  AND a.feature = g.feature
  AND a.window_start = g.window_start
  AND a.id <> g.keep_id;

-- 2. Indice unico parcial para el caso anonimo. El constraint existente
--    (doctor_id, feature, window_start) queda intacto para el caso
--    autenticado/service_role.
CREATE UNIQUE INDEX IF NOT EXISTS ai_rate_limits_anon_ip_feature_window_key
  ON ai_rate_limits (ip, feature, window_start)
  WHERE doctor_id IS NULL;
