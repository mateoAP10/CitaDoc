# Runbook de secrets — CitaDoc

Inventario de los 16 secrets configurados en Supabase Edge Functions (proyecto `qxoomcqaafogczrvsyhg`), quién los usa, y cómo recuperarse si alguno se compromete o hay que rotarlo.

**Ningún valor real vive en este archivo ni en el repo.** Los valores solo existen en `supabase secrets` (Edge Functions) y en el dashboard del proveedor correspondiente.

**Regla general de rotación**: cambiar el valor de un secret con `supabase secrets set NOMBRE=nuevo_valor` **no requiere redeploy** — las funciones lo leen en cada invocación (`Deno.env.get()`), no queda embebido en el bundle. Redeploy solo hace falta si además cambia código. La excepción es `SUPABASE_SERVICE_ROLE_KEY` (ver más abajo) porque ese valor también vive hardcodeado en `cron.job.command` de Postgres, fuera del alcance de `supabase secrets`.

---

## IA / contenido

| Secret | Proveedor | Funciones que lo usan | Rotación |
|---|---|---|---|
| `KIMI_API_KEY` | Moonshot AI (Kimi) | `voice-assistant-intent`, `voice-assistant-chat`, `medical-soap-extract`, `patient-summary`, `generate-website-config`, `generate-growth-content`, `generate-citadoc-content`, `generate-demo`, `growth-agent`, `growth-daily-batch`, `showcase-batch`, `triage-especialidad` (12 funciones) | Consola Moonshot → regenerar → `supabase secrets set` |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | `generate-website-config` (Vision, ruta primaria), `tag-asset` (Vision), `meta-campaigns` (análisis de texto), `generate-demo` | Console Anthropic → revocar/crear → `supabase secrets set` |
| `BRAVE_SEARCH_API_KEY` | Brave Search API | `scout-leads` | Dashboard Brave → regenerar |
| `GROWTH_ADMIN_KEY` | Interno (no es de un proveedor externo — lo genera CitaDoc) | `generate-citadoc-content` (gate `x-growth-key`) | Generar un string random nuevo → `supabase secrets set` → actualizar donde se ingresa manualmente (panel growth) |

## Email / pagos

| Secret | Proveedor | Funciones que lo usan | Rotación |
|---|---|---|---|
| `RESEND_API_KEY` | Resend | `send-email`, `invite-doctor`, `payphone-webhook` | Dashboard Resend → API Keys → revocar/crear |
| `PAYPHONE_TOKEN` | PayPhone | `payphone-prepare` (prepara checkout), `payphone-webhook` (confirma transacción llamando de vuelta a PayPhone) | Dashboard comercio PayPhone → regenerar. ⚠️ Coordinar: rotarlo con pagos en curso puede invalidar una confirmación en vuelo — hacerlo en ventana de bajo tráfico |
| `PAYPHONE_STORE_ID` | PayPhone | `payphone-prepare` | Mismo dashboard PayPhone — normalmente no rota sola, solo si PayPhone reasigna el store |

## Meta (Facebook/Instagram)

| Secret | Proveedor | Funciones que lo usan | Rotación |
|---|---|---|---|
| `META_APP_SECRET` | Meta for Developers | `meta-oauth`, `meta-webhook` (verificación de firma del webhook) | Meta App Dashboard → App Secret → regenerar. ⚠️ Invalida tokens OAuth activos de la app — requiere re-autenticar la conexión de Meta desde `admin.html` después |
| `META_REDIRECT_URI` | N/A — config, no secreto | `meta-oauth` | No es rotable en el sentido de seguridad; debe coincidir siempre con la URL registrada en Meta App Dashboard |

## Supabase (plataforma)

| Secret | Proveedor | Funciones que lo usan | Rotación |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (auto-generado) | ~40 funciones (prácticamente todas — bypassa RLS) | **Blast radius más alto de todos los secrets.** Dashboard → Project Settings → API → regenerar. Después de rotar hay que actualizar A MANO el header `Authorization` de **todos** los `cron.job` que lo usan hoy (`appointment-reminders`, `onboarding-drip`, `perfil-frio`, `growth-daily-batch`, `scout-leads`, `weekly-report`) — `supabase secrets set` NO alcanza para esos, porque el valor está literal en `cron.job.command`, no en el env de la función. Ver [[citadoc_p2_2_closed]] / P2.3 sobre `sb_secret_...` vs JWT legacy. |
| `SUPABASE_ANON_KEY` | Supabase (auto-generado) | Público por diseño — hardcodeado en todo el frontend (`citadoc-dashboard.html`, `admin.html`, etc.) | Rotarla implica actualizar **todos** los HTML/JS que la tienen hardcodeada, no solo el secret de Edge Functions |
| `SUPABASE_URL` | Supabase (auto-generado) | Prácticamente todas | Solo cambia si se migra de proyecto Supabase entero |
| `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` | Supabase (auto-generado) | **Ninguna función los referencia explícitamente** (confirmado por grep) — parecen inyectados automáticamente por la plataforma, no consumidos por código propio | No rotar manualmente sin confirmar primero que de verdad no los usa nada |

---

## Hallazgo de esta revisión: no hay secrets hardcodeados reales en el repo

Grep exhaustivo de patrones de asignación literal (`PAYPHONE_TOKEN =`, `RESEND_API_KEY =`, etc.) sobre todo `supabase/functions`: **cero coincidencias**. La única excepción conocida es `PUBLIC_BOOKING_KEY` en `send-email` — no es un secret de la tabla de arriba (nunca se configuró como tal), el código cae a un fallback hardcodeado `'citadoc-public-2026'` si no existe. No es sensible (su función es filtrar tipos de email públicos, no autenticar), pero si algún día se decide tratarlo como secret real, hay que configurarlo explícitamente — hoy no existe en `supabase secrets list`.

---

## Procedimiento general de rotación

1. **Revocar** el valor viejo en el dashboard del proveedor (si el proveedor lo permite; algunos solo permiten "generar nuevo" sin revocar el anterior explícitamente).
2. **Generar** el nuevo valor.
3. `supabase secrets set NOMBRE=nuevo_valor --project-ref qxoomcqaafogczrvsyhg`.
4. Si el secret es `SUPABASE_SERVICE_ROLE_KEY`: actualizar además cada `cron.job.command` afectado (ver tabla arriba) vía `cron.alter_job()`, tocando solo `command`.
5. Si el secret es `SUPABASE_ANON_KEY`: actualizar todos los HTML/JS que lo tienen hardcodeado.
6. Si el secret es `META_APP_SECRET`: re-autenticar la conexión de Meta desde el panel admin.
7. **Smoke test**: probar la función más simple que dependa de ese secret (ej. para Kimi, `triage-especialidad`; para Resend, `send-email` con un tipo permitido; para el service_role, cualquier función admin) y confirmar que responde 200 con datos reales, no un error de auth del proveedor.
8. Confirmar en los logs de Supabase Functions que no hay errores nuevos de autenticación contra el proveedor en los minutos siguientes.
