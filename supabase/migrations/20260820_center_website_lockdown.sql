-- P2.2-C3 -- Doctor Center: center_website + center_website_services +
-- center_website_testimonials (20 ago 2026). Las 3 tenian una unica
-- policy ALL (qual:true, with_check:true, roles:{public}) -- sin ningun
-- gate, ni siquiera en SELECT. El sitio propio del centro (incluidos
-- borradores no publicados) era publico para cualquiera con la anon key.
--
-- Mismo patron que center_packages (P2.2-C2): REVOKE ALL + GRANT SELECT
-- explicito + policy nueva evaluada por Postgres en cada fila -- no
-- depende de que el cliente filtre por published/active.

-- ── center_website ───────────────────────────────────────────────────────
revoke all on public.center_website from anon, authenticated;
grant select on public.center_website to anon, authenticated;
drop policy if exists cw_public on public.center_website;
create policy "center_website_public_read" on public.center_website
  for select to public using (published = true);

-- ── center_website_services ──────────────────────────────────────────────
revoke all on public.center_website_services from anon, authenticated;
grant select on public.center_website_services to anon, authenticated;
drop policy if exists cws_public on public.center_website_services;
create policy "center_website_services_public_read" on public.center_website_services
  for select to public using (active = true);

-- ── center_website_testimonials ──────────────────────────────────────────
-- Sin CRUD administrativo -- ningun consumidor de escritura en todo el
-- repo, confirmado dos veces durante la auditoria. service_role sigue
-- con acceso completo para cargas manuales futuras.
revoke all on public.center_website_testimonials from anon, authenticated;
grant select on public.center_website_testimonials to anon, authenticated;
drop policy if exists cwt_public on public.center_website_testimonials;
create policy "center_website_testimonials_public_read" on public.center_website_testimonials
  for select to public using (active = true);

-- ── RPC transaccional para reemplazar servicios del sitio ───────────────
-- Replica el patron actual del cliente (DELETE todo + POST uno por uno)
-- pero atomico: una llamada a funcion en Postgres corre dentro de una
-- unica transaccion implicita -- si el INSERT falla, el DELETE tambien
-- se revierte, nunca queda el sitio sin servicios a mitad de camino.
-- La whitelist/validacion de campos por servicio ya se hizo en la Edge
-- Function antes de llamar a esta funcion (rechaza campos desconocidos,
-- no los ignora) -- esto es una segunda capa, no la unica.
create or replace function public.replace_center_website_services(
  p_center_id uuid,
  p_services jsonb
)
returns setof public.center_website_services
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.centers where id = p_center_id) then
    raise exception 'center_id no corresponde a un centro real';
  end if;

  delete from public.center_website_services where center_id = p_center_id;

  return query
  insert into public.center_website_services (center_id, name, description, icon_key, color, order_index, active)
  select
    p_center_id,
    (elem->>'name')::varchar,
    elem->>'description',
    (elem->>'icon_key')::varchar,
    (elem->>'color')::varchar,
    coalesce((elem->>'order_index')::integer, 0),
    coalesce((elem->>'active')::boolean, true)
  from jsonb_array_elements(p_services) as elem
  returning *;
end;
$$;

revoke all on function public.replace_center_website_services(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_center_website_services(uuid, jsonb) to service_role;
