-- P1 seguridad, Storage growth-creatives -- ajuste (20 ago 2026).
-- Descubierto al implementar: un médico normal SÍ sube realmente a
-- growth-creatives desde su propio dashboard (foto/logo/portada de su
-- sitio, ruta demo-media/{slug}/...), no solo admin.html/
-- doctor-center-admin.html. Enrutar TODO por la Edge Function admin
-- habría roto ese self-service real -- un médico normal no debe tener
-- (ni necesitar) el token admin.
--
-- Se agrega una policy de INSERT propia para authenticated, con ownership
-- real: el path debe ser demo-media/{slug}/... y ese slug debe
-- corresponder a un generated_demos.medico_id igual al propio médico
-- logueado. generated_demos tiene RLS -- una subquery directa se
-- evaluaria con los permisos de quien llama, viendo solo SU PROPIO demo
-- (gracias a la policy de ownership que ya aplicamos ahi) -- pero como
-- necesitamos leer el medico_id de CUALQUIER slug para comparar (no solo
-- el propio, para poder rechazar correctamente el caso ajeno), hace falta
-- SECURITY DEFINER, mismo patron ya usado en resenas.
--
-- Los otros 2 uploads de admin.html (creatives del growth queue,
-- admin-uploads/...) no calzan con el patron demo-media/{slug}/... asi
-- que esta policy no les aplica -- siguen exigiendo la Edge Function
-- admin, como ya se implemento.

create or replace function public.demo_slug_medico_id_de(p_slug text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select medico_id from public.generated_demos where slug = p_slug;
$$;

create policy "medico sube media de su propio demo" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'growth-creatives'
    and (storage.foldername(name))[1] = 'demo-media'
    and public.demo_slug_medico_id_de((storage.foldername(name))[2]) in (
      select id from public.medicos where user_id = auth.uid()
    )
  );
