-- P0 seguridad, medicos SELECT -- cierre (19 ago 2026). Con medicos_publico
-- ya sirviendo el perfil/booking publico (21 archivos + admin.html
-- migrados), estas 3 policies permisivas dejan de tener motivo: eran las
-- que exponian la fila COMPLETA de medicos (66 columnas, incluida cedula,
-- senescyt, plan, subscription_status, web_config_draft) a cualquiera,
-- autenticado o no, en cuanto activo=true.
--
-- "medicos_select_own" (auth.uid() = user_id) queda intacta -- el propio
-- medico sigue viendo y editando su fila completa desde el dashboard, sin
-- ningun cambio.

drop policy if exists "medico lee su perfil" on public.medicos;
drop policy if exists "medicos_select_public" on public.medicos;
drop policy if exists "Public reads active verified doctors" on public.medicos;
