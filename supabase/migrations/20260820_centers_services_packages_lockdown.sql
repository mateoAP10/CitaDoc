-- P2.2-C2 -- Doctor Center: centers + center_services + center_packages
-- (20 ago 2026). centers/center_services ya tenian el SELECT publico bien
-- gateado (activo=true) pero el write estaba completamente abierto
-- (ALL, qual:true, roles:{public}). center_packages no tenia NINGUN gate,
-- ni siquiera en SELECT -- paquetes inactivos/borrador eran publicos.
--
-- A diferencia de A/B/C1 (REVOKE ALL puro, sin reemplazo -- esas tablas no
-- tienen consumidor publico), aca SI hay lectura publica real
-- (doctor-center.html, citadoc-web2.html) que debe sobrevivir. Por eso,
-- siguiendo la regla establecida en P0/P1 (nunca confiar en los
-- privilegios por defecto): REVOKE ALL explicito + GRANT SELECT
-- explicito, nunca dejar que ALTER DEFAULT PRIVILEGES decida.
--
-- El write administrativo pasa por admin-center-crud (requireAdmin() +
-- admin_users), igual que el resto del stack.

-- ── centers ──────────────────────────────────────────────────────────────
revoke all on public.centers from anon, authenticated;
grant select on public.centers to anon, authenticated;
drop policy if exists centers_service_write on public.centers;
-- centers_public_read (activo=true) queda intacta.

-- ── center_services ──────────────────────────────────────────────────────
revoke all on public.center_services from anon, authenticated;
grant select on public.center_services to anon, authenticated;
drop policy if exists center_services_write on public.center_services;
-- center_services_public_read (activo=true) queda intacta.

-- ── center_packages ──────────────────────────────────────────────────────
-- Nunca tuvo gate en SELECT -- se reemplaza la policy vieja (sin filtro)
-- por una nueva con activo=true, evaluada por Postgres en cada fila.
revoke all on public.center_packages from anon, authenticated;
grant select on public.center_packages to anon, authenticated;
drop policy if exists cp_pkg_select on public.center_packages;
drop policy if exists cp_pkg_insert on public.center_packages;
drop policy if exists cp_pkg_update on public.center_packages;
drop policy if exists cp_pkg_delete on public.center_packages;

create policy "center_packages_public_read" on public.center_packages
  for select to public using (activo = true);
