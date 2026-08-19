-- Auditoria global de privilegios por defecto (19 ago 2026), 3a de 3
-- vistas del esquema public. Mismo defecto que medicos_publico y
-- citas_disponibilidad: ALTER DEFAULT PRIVILEGES del esquema otorga
-- INSERT/UPDATE/DELETE/TRUNCATE a anon/authenticated sobre cualquier
-- vista nueva, salvo REVOKE explicito.
--
-- ai_usage_with_cost (JOIN de ai_usage_logs + model_pricing_versions) no
-- abre una vulnerabilidad NUEVA por si sola -- ai_usage_logs ya tiene RLS
-- deshabilitado y grant completo (hallazgo aparte, sin tocar en este
-- bloque). Pero rompe la regla del proyecto: toda vista expuesta a anon/
-- authenticated lleva REVOKE ALL + GRANT SELECT explicito, sin excepcion.
--
-- No se toca la definicion de la vista ni RLS/policies de ai_usage_logs
-- ni model_pricing_versions -- eso queda para el hallazgo aparte ya
-- documentado en la auditoria global (Hallazgo #6, RLS deshabilitado).

revoke all on public.ai_usage_with_cost from anon, authenticated;
grant select on public.ai_usage_with_cost to anon, authenticated;
