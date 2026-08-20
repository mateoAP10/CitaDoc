-- P1 seguridad, resenas (20 ago 2026). resenas_service_write -- FOR ALL,
-- roles={public}, qual=true, with_check=NULL (equivale a true) -- permitia
-- que cualquiera insertara resenas falsas atribuidas a CUALQUIER medico, y
-- borrara cualquier resena real, sin ningun login. Confirmado reproducible
-- en la auditoria global previa.
--
-- resenas no tiene concepto de "dueno autenticado" -- el paciente nunca
-- inicia sesion, por diseno (resena.html es publica). El alcance aprobado
-- para este bloque es cerrar exactamente lo que RLS SI puede garantizar:
--   1. medico_id de la fila debe coincidir con el medico_id real de la
--      cita referenciada -- nunca confiar en lo que mande el cliente
--      (resena.html toma medico_id de la URL, sin verificar nada hoy).
--   2. cita_id no puede cambiar despues de creada -- si no, alguien podria
--      cambiar cita_id + medico_id a la vez (ambos consistentes entre si)
--      y "secuestrar" una resena existente hacia otra cita distinta. RLS
--      WITH CHECK no puede comparar el valor viejo contra el nuevo de una
--      columna -- para eso hace falta un trigger.
--   3. DELETE se cierra por completo -- ni resena.html ni cita-review
--      borran nunca, no hay ningun consumidor legitimo.
--
-- Explicitamente fuera de este bloque (hallazgo arquitectonico aparte,
-- documentado, no resuelto aqui): no hay ninguna prueba de que quien
-- envia la resena sea el paciente real de esa cita -- requiere un
-- mecanismo de token/enlace firmado, no un ajuste de policy. Tampoco se
-- toca cita-review (legado, service role, dejado vivo a proposito solo
-- para no romper links de emails ya enviados).

drop policy if exists "resenas_service_write" on public.resenas;
-- resenas_public_read (SELECT) queda intacta, sin cambios.

-- citas tiene RLS por ownership desde la etapa 1 de esta remediacion --
-- una subquery directa a citas() dentro de esta policy se evaluaria con
-- los permisos de quien llama (anon), que no tiene SELECT sobre citas,
-- asi que devolveria 0 filas y la comparacion seria siempre NULL/false,
-- pase lo que pase. Mismo patron ya visto y resuelto en
-- sync_medico_rating(): funcion SECURITY DEFINER para esta unica lectura
-- acotada (solo medico_id, nada mas).
create or replace function public.citas_medico_id_de(p_cita_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select medico_id from public.citas where id = p_cita_id;
$$;

drop policy if exists "insertar reseña con medico_id real de la cita" on public.resenas;
create policy "insertar reseña con medico_id real de la cita" on public.resenas
  for insert
  with check (medico_id = public.citas_medico_id_de(cita_id));

drop policy if exists "actualizar reseña con medico_id real de la cita" on public.resenas;
create policy "actualizar reseña con medico_id real de la cita" on public.resenas
  for update
  using (true)
  with check (medico_id = public.citas_medico_id_de(cita_id));

-- DELETE: sin ninguna policy -> bloqueado por defecto (RLS ya habilitado).

create or replace function public.resenas_cita_id_inmutable()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.cita_id is distinct from old.cita_id then
    raise exception 'cita_id no puede modificarse después de creada la reseña';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_resenas_cita_id_inmutable on public.resenas;
create trigger trg_resenas_cita_id_inmutable
  before update on public.resenas
  for each row
  execute function public.resenas_cita_id_inmutable();
