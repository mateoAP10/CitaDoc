-- P6.0 — Restaurar realtime de citas
--
-- Hallazgo (30 ago 2026, durante el click-through visual de Activación V1 / da5839e):
-- la publicación `supabase_realtime` existía pero no tenía ninguna tabla agregada
-- (select * from pg_publication_tables where pubname='supabase_realtime' → 0 filas).
-- El canal `citas-rt-<medico_id>` que ya existía en citadoc-dashboard.html
-- (.channel(...).on("postgres_changes", {table:"citas", filter:"medico_id=eq."+id}, ...))
-- estaba correctamente suscrito pero nunca recibía eventos, para ningún médico,
-- desde que ese código existe -- sin error visible.
--
-- Afecta: cargarCitas/cargarProximas/cargarStats (dashboard no se actualiza solo
-- cuando llega una cita nueva) y, de rebote, el paso 5 del widget de Activación V1
-- (da5839e), que depende de ese mismo refresh para pasar a "Activado" sin reload.
--
-- La tabla ya tenía las policies de RLS necesarias para que Realtime entregue el
-- evento al médico dueño (policy "medico ve citas", SELECT por medicos.user_id = auth.uid()).
-- Solo faltaba esto:

alter publication supabase_realtime add table public.citas;

-- Probado en producción con fixture sintética (médico + cita efímeros, borrados
-- después): dashboard abierto con Puppeteer, insert real de una cita vía SQL,
-- estMes/estTotal pasaron de 0 a 1 y el widget de Activación cambió a
-- "Perfil activado" sin recargar la página. 0 residuos.
