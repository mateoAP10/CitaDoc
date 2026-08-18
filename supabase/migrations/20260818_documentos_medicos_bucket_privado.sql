-- P0 seguridad, Hallazgo 2 (18 ago 2026): el bucket documentos-medicos era
-- publico (storage.buckets.public=true). getPublicUrl() genera una URL
-- permanente que bypassa RLS por completo en el endpoint /object/public/ --
-- confirmado reproducible: cualquiera con la URL descarga el PDF clinico
-- real sin login ni API key. Combinado con el Hallazgo 1 (ya cerrado), que
-- exponia pdf_url en texto plano via SELECT, la ruta de ataque era trivial.
--
-- Esta migracion SOLO toca el bucket documentos-medicos: lo pasa a privado
-- y agrega la policy de SELECT que antes no hacia falta (el flag publico
-- bypassaba RLS enteramente, asi que nunca existio ninguna policy de SELECT
-- para este bucket -- ni siquiera el propio medico dueno tenia una). Sin
-- esta policy, createSignedUrl()/download() fallarian para todos, incluido
-- el dueno legitimo, en el momento en que el bucket deja de ser publico.
--
-- No se mueve ni se borra ningun archivo -- los paths (medico_id/archivo.pdf)
-- no cambian. No se toca verificacion-docs (Hallazgo 3, pendiente) ni
-- ninguna otra tabla/bucket/policy.

update storage.buckets set public = false where id = 'documentos-medicos';

-- Mismo patron de ownership que ya usa "medico lee sus docs" en
-- verificacion-docs, pero aqui la carpeta es medicos.id (asi sube
-- renderHTMLaPDF: I = M.id + "/" + archivo), no auth.uid() directo.
create policy "medico lee sus documentos" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documentos-medicos'
    and (storage.foldername(name))[1] in (
      select id::text from public.medicos where user_id = auth.uid()
    )
  );
