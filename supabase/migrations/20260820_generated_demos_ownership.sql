-- P1 seguridad, generated_demos (20 ago 2026). anon_update_demos +
-- authenticated_update_demos -- UPDATE, qual=true, with_check=true, para
-- AMBOS roles -- permitian que cualquiera, con o sin login, modificara
-- cualquier campo de cualquier demo: payment_status, medico_id,
-- activated_at, status. Confirmado fraude real reproducible: anon marca
-- payment_status='paid' sin pagar, vía demo.html (publico, sin login).
--
-- Mapeo de consumidores: demo.html (publico, sin login, es el vector de
-- fraude confirmado -- sin ningun flujo legitimo que preservar, no se
-- toca codigo, la RLS lo cierra solo). admin.html (deployDemo/
-- retractDemo/publish, siempre sin sesion de medico, igual que
-- activarWebSitio) y js/web-builder-v2.js._deployWeb (isAdmin:true,
-- mismo caso cross-doctor que ya resolvimos para medicos) -- ambos
-- necesitan la Edge Function admin-update-demo. js/web-builder-v2.js en
-- modo isAdmin:false (dashboard, propio demo) queda cubierto por
-- ownership real. generate-demo y payphone-webhook usan service_role, sin
-- cambios. js/web-builder.js confirmado sin ningun consumidor (no lo
-- carga ninguna pagina) -- no aplica.
--
-- payment_status NO se resuelve aqui -- se sigue pudiendo tocar por las
-- vias autorizadas (ownership propio, o admin via Edge Function), igual
-- que hoy. Es una decision de negocio aparte (¿la activacion self-service
-- es gratuita a proposito, o deberia exigir pago real de Payphone?),
-- documentada, no una omision.

drop policy if exists "anon_update_demos" on public.generated_demos;
drop policy if exists "authenticated_update_demos" on public.generated_demos;

create policy "medico actualiza su propio demo" on public.generated_demos
  for update
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));
