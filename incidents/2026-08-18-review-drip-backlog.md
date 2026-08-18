# Incidente: backlog de `review-drip` procesado de golpe al corregir el cron

**Fecha:** 18 de agosto de 2026
**Severidad:** Baja (impacto real en pacientes: ninguno — ver conclusión)
**Estado:** Contenido. `review-drip` congelado en código (`FROZEN=true`) + gateway exige JWT + cron pausado (`active=false`). No reactivar sin idempotencia real y ventana de elegibilidad.

## Qué pasó

El sistema de reseñas (tabla `resenas`, trigger `sync_medico_rating`, página `cita-review`,
función `review-drip`) estaba completo desde su creación (migración
`20260524000011_resenas_system.sql`) pero **nunca funcionó**: el cron `review-drip-hourly`
usaba `current_setting('app.supabase_url')` / `current_setting('app.service_role_key')`,
parámetros que Supabase no permite configurar a nivel de base de datos para roles no
superusuario (`ERROR: 42501: permission denied to set parameter`). Cada corrida horaria,
desde que se creó, fallaba en el primer `net.http_post` sin que nadie lo notara.

Los mismos dos parámetros rotos también dejaban muertos otros dos crons:
`perfil-frio-daily` y `weekly-report-monday`.

Al corregir `review-drip-hourly` (URL hardcodeada, mismo patrón que los crons que sí
funcionan como `appointment-reminders`) y probar la función manualmente vía curl para
confirmar el fix, la función procesó **todo el backlog acumulado de una sola vez**:
cualquier cita con `review_sent=false` y fecha/hora ya pasada (sin ventana de
elegibilidad — el filtro es "cualquier cita pasada, sin importar hace cuánto").

## Qué se envió realmente

La función reportó `{"ok":true,"sent":28}`.

- **28 correos reales enviados** — TODOS a `mateoalarconpons@gmail.com` (Mateo, plan `pro`),
  correspondientes a sus propias citas de prueba entre el 1 de mayo y el 3 de junio de 2026.
- **9 citas adicionales marcadas `review_sent=true` SIN enviar correo** — todas de la
  Dra. Josbelys Riera Borges (plan `gratuito`). El código filtra por plan
  (`if (!['pro','destacado','pro_web'].includes(m.plan))`) y salta el envío para planes
  no pagos, pero igual marca la cita como procesada para no reintentarla en cada corrida.
  **Ningún paciente de estas 9 citas recibió correo.** Pacientes/citas involucradas
  (solo para registro, cero acción tomada sobre ellas):
  - Jessica Rodríguez — jessica1078@gmail.com — 2026-06-09
  - josbelys riera / Mildreth (mismo email, dos citas) — josbelys27@gmail.com — 2026-06-04, 2026-06-09
  - Karen — karenpluas910@gmail.com — 2026-06-09
  - Liliana Cedeño — liliana.cego@hotmail.com — 2026-06-09
  - Elisa — masalemaelisa@gmail.com — 2026-06-11
  - Roselenny Mujica — roselennymujica.91@gmail.com — 2026-06-10
  - Rosa Moyano — rossmoyano@gmail.com — 2026-06-05
  - Samantha Galilea Flores Coronel — samanthacoronel22@gmail.com — 2026-06-05

**Conclusión: cero pacientes reales recibieron ningún correo.** El único destinatario
real de los 28 emails fue el propio Mateo, sobre sus propias citas de prueba.

## Contenido exacto del correo que se envió (a Mateo, 28 veces)

- **Tipo:** `post_consulta` (`send-email/index.ts`, función `tplPostConsulta`)
- **Asunto:** `¿Cómo fue tu consulta con {médico}?`
- **Cuerpo:** tarjeta de marca CitaDoc, "Gracias por tu consulta, Mateo Alarcon. Con
  Mateo Alarcon P." + "¿Cómo fue tu experiencia hoy?" + 5 emojis-enlace (😕😐🙂😊🤩,
  Mejorable/Regular/Buena/Muy buena/Excelente) que abren `cita-review?cita_id=…&r=N`.
- Nota de contenido (relevante para el fix futuro): el copy dice "hoy", que no tiene
  sentido para una cita de hace semanas — refuerza la necesidad de una ventana de
  elegibilidad real, no solo "cualquier cita pasada".

## Acciones de contención tomadas (en orden)

1. `citas.review_sent` para las 37 filas afectadas **no se tocó** — sigue en `true`,
   preserva el registro real de qué se procesó.
2. `cron.alter_job(17, active => false)` — el cron `review-drip-hourly` está pausado,
   no una eliminación del job (se conserva el historial en `cron.job_run_details`).
3. **Freeze a nivel de código**: `review-drip/index.ts` ahora devuelve `503` sin tocar la
   base de datos ni enviar nada, pase lo que pase con el cron (`const FROZEN = true`).
   Desplegado y verificado con una llamada real autenticada — confirmado `503 frozen:true`.
4. El redeploy además activó la verificación de JWT de la plataforma (antes la función
   aceptaba llamadas sin `Authorization` — por eso mi curl de prueba funcionó sin login).
   Ahora una llamada sin token ya rebota en `401` antes de llegar al código. Doble capa.
5. Se corrigieron también `perfil-frio-daily` y `weekly-report-monday` (mismo bug de
   `current_setting`) para que dejen de fallar en silencio — **no se tocó su lógica ni
   se probaron manualmente**, solo se corrigió la URL del cron.

## Remediación aplicada y verificada (18 ago 2026, misma tarde)

1. **Las 9 citas de Josbelys → `review_sent=false`.** Decisión de Mateo: el campo
   representa un envío real, nunca una exclusión. Si ella pasa a plan pago, sus
   pacientes vuelven a ser candidatos (siempre que la cita siga dentro de la ventana
   de elegibilidad vigente en ese momento).
2. **Ventana de elegibilidad implementada en `review-drip/index.ts`:** mínimo 2h
   después de la cita (ya existía), máximo `MAX_DAYS_BACK = 3` días (nuevo, vía
   `.gte('fecha', cutoffDate)` en la query). Además, el gate de plan no-pago ya NO
   marca `review_sent=true` — simplemente no toca la fila, mismo principio del punto 1.
3. **Prueba unitaria de la regla (9/9 PASS)** contra fechas reales del incidente
   (backlog de Mateo del 1 de mayo, de Josbelys del 11 y 3 de junio — las tres ahora
   excluidas) más casos límite (2h30 elegible, 30min no, ayer elegible, exactamente
   3 días elegible, 4 días no, cita futura no).
4. **Circuito real de extremo a extremo (7/7 PASS)** con una cita nueva y aislada
   (doctor/paciente efímeros, cita a 3h en el pasado, dentro de ventana) —
   **sin invocar `review-drip` en ningún momento**: se replicó su misma query de
   solo lectura (confirmó que selecciona la cita de prueba Y que cero citas reales
   existentes son elegibles bajo la nueva ventana), email real enviado
   (`send-email`, `post_consulta`), página de agradecimiento (rating médico)
   renderizó, fila en `resenas` creada, página de rating de app renderizó,
   `resenas.rating_app` actualizado, trigger `sync_medico_rating` actualizó
   `medicos.rating_promedio`/`total_resenas`. Todos los datos de prueba limpiados.
5. **`review-drip` sigue frenado en las 3 capas** (cron `active=false`,
   `FROZEN=true` en código, y de paso el redeploy activó verificación de JWT de la
   plataforma — antes aceptaba llamadas sin login). Verificado con llamada real
   autenticada tras el redeploy del fix de ventana: sigue devolviendo `503 frozen`.
6. Dato aparte, no manipulado: quedó 1 fila real en `resenas` — es de Mateo, del
   4 de mayo. Le dio clic a una estrella en uno de los 28 correos reales que recibió
   durante el incidente original. Legítima, no se tocó.

## Bug relacionado encontrado durante las pruebas (documentado aparte, no en este archivo)

Al probar el flujo de clic del paciente se encontró que `cita-review` sirve el HTML
con `Content-Type: text/plain` en vez de `text/html` — limitación conocida de Kong
(gateway de Supabase) en el dominio `*.supabase.co` para respuestas HTML vía GET,
confirmada con una función mínima de prueba aislada y con discusiones públicas de
Supabase. No es un bug de este código. Sin fix de código posible en el dominio
default; requiere dominio custom para Edge Functions. Ver conversación — pendiente
de decisión de Mateo, no se tocó `cita-review` todavía.

## Pendiente antes de descongelar (no empezar sin esto)

- Idempotencia real de extremo a extremo con prueba E2E (mismo nivel de exigencia que
  el Assistant): no debe ser posible reprocesar una cita ya marcada, ni con reintentos
  de red, ni con carreras entre corridas del cron. (La ventana de elegibilidad de
  arriba ya cubre el caso concreto de este incidente; falta idempotencia general.)
- Resolver el bug de Content-Type de `cita-review` (dominio custom o alternativa) --
  hoy el paciente que hace clic ve HTML crudo en vez de la página real.
- Recién después: comentario de texto en `cita-review` (hoy solo captura estrellas,
  `resenas.comentario` nunca se escribe) + mostrar reseñas/rating en el perfil público.
