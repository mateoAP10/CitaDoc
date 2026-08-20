-- P2.2-C4 -- Doctor Center: center_doctors (20 ago 2026). RLS habilitado
-- con SELECT publico sin gate (correcto, se deja intacto -- informacion
-- no sensible, y doctor-center.html depende de poder consultarla con
-- anon para validar el acceso de un medico logueado a un centro
-- especifico) + una policy ALL (qual:true) de write completamente
-- abierta -- cualquiera con la anon key podia agregar/quitar medicos de
-- cualquier centro, sin login.
--
-- Sin self-service de escritura: ni doctor-center.html ni
-- citadoc-dashboard.html escriben esta tabla, solo la leen (el segundo,
-- filtrado por su propio medico_id). El unico consumidor de escritura es
-- doctor-center-admin.html. Mismo patron que center_services (P2.2-C2):
-- REVOKE ALL + GRANT SELECT explicito (nunca confiar en los privilegios
-- por defecto) + la policy de SELECT publica queda exactamente igual.

revoke all on public.center_doctors from anon, authenticated;
grant select on public.center_doctors to anon, authenticated;

drop policy if exists center_doctors_write on public.center_doctors;
-- center_doctors_public_read (qual:true, sin gate) queda intacta a propósito.
