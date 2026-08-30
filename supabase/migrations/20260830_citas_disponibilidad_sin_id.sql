-- P6.1 -- Eje 1: cerrar la fuga de cita_id en citas_disponibilidad
--
-- Hallazgo (30 ago 2026, durante el mapeo P6): citas_disponibilidad era una
-- vista sin filtro (security_invoker=false, bypassea el RLS de citas) que
-- devolvia id, medico_id, fecha, hora, estado de las 41 citas reales de
-- TODOS los medicos a cualquier anon, sin autenticacion. Confirmado en vivo.
--
-- Encadenado con eso: cita-action (confirm/cancel/reschedule) y cita-review
-- (legacy) no validan nada mas alla del cita_id -- con los ids de esta vista,
-- cualquiera sin login podia cancelar/confirmar cualquier cita de cualquier
-- medico/paciente en toda la plataforma, o dejar resenas falsas.
--
-- Decision de Mateo: el UUID de cita sigue siendo un bearer token valido
-- para cita-action una vez que deja de ser descubrible publicamente -- no
-- hace falta invalidar los links ya enviados en recordatorios, ni construir
-- un sistema de tokens nuevo. Alcance de este bloque: que citas_disponibilidad
-- deje de exponer el id. El dump agregado (medico_id/fecha/hora/estado sin
-- filtro por medico) queda fuera a proposito -- es un problema de scraping
-- de agenda, no el vector critico de integridad que se cerro aca.
--
-- CREATE OR REPLACE VIEW no permite eliminar columnas -- hace falta
-- drop+create en la misma migracion, re-otorgando el grant.

drop view public.citas_disponibilidad;

create view public.citas_disponibilidad as
  select medico_id, fecha, hora, estado from public.citas;

grant select on public.citas_disponibilidad to anon, authenticated;

-- El DROP+CREATE crea un objeto nuevo -- hereda privilegios por defecto del
-- esquema public (ALTER DEFAULT PRIVILEGES ya configurado en este proyecto),
-- que resultaron ser INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER para
-- anon y authenticated, no solo SELECT. Descubierto al verificar los grants
-- inmediatamente despues de aplicar esto -- revocado antes de seguir.
-- La vista es "auto-updatable" (select simple de una sola tabla), asi que
-- sin este revoke esos verbos hubieran quedado realmente escribibles.
revoke insert, update, delete, truncate, references, trigger
  on public.citas_disponibilidad from anon, authenticated;

-- security_invoker se deja en su default (false) a proposito: si heredara
-- el RLS de citas, anon (que no tiene ninguna policy de SELECT ahi) veria
-- 0 filas siempre, rompiendo el booking publico completo.
