-- P0 seguridad, Hallazgo 3 (18 ago 2026): verificacion-docs (bucket PRIVADO,
-- cedula/titulo de medicos para verificacion de cuenta) tenia dos policies
-- demasiado amplias para el rol authenticated -- cualquier medico logueado,
-- no solo un admin, podia leer y sobrescribir los documentos de identidad
-- de CUALQUIER otro medico:
--   "admin lee todos los docs": SELECT, solo exige auth.role()='authenticated'
--     -- pese al nombre, no comprueba ningun rol admin real.
--   "medico actualiza sus docs": UPDATE, solo exige auth.uid() IS NOT NULL
--     -- no compara la carpeta del archivo contra el uid del que llama.
-- Confirmado reproducible: medico B leyo, listo y sobrescribio la
-- cedula/titulo de medico A con una cuenta autenticada normal, sin ningun
-- rol especial.
--
-- "medico lee sus docs" (SELECT, ya scoped por carpeta = auth.uid()) y
-- "medico sube sus docs" (INSERT) quedan intactas -- estaban bien.
--
-- admin-verify (Edge Function) no se toca ni le afecta este cambio: corre
-- con service role + su propio header x-admin-token, nunca dependio de
-- "admin lee todos los docs" para nada -- confirmado en el codigo de la
-- funcion antes de tocar esto.

drop policy if exists "admin lee todos los docs" on storage.objects;

drop policy if exists "medico actualiza sus docs" on storage.objects;

create policy "medico actualiza sus docs" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'verificacion-docs'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'verificacion-docs'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
