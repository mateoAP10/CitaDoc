// ── P6.1 -- Eje 2b (30 ago 2026) ────────────────────────────────────────────
// cita-review es legacy: desde el 18 ago 2026 review-drip manda
// citadoc.lat/resena/{cita_id}?medico_id=... (resena.html -> resenas con RLS
// real por ownership), no este endpoint. Nada nuevo apunta acá.
//
// Hallazgo del mapeo P6/P6.1: esta funcion corria con SERVICE_ROLE_KEY y
// escribia en `resenas` sin validar NADA mas alla del cita_id/medico_id que
// llegaban crudos por query string -- ni siquiera la proteccion que ya tiene
// `resenas` via RLS (medico_id real de la cita), porque el service role la
// bypassea. Combinado con la fuga de cita_id ya cerrada en citas_disponibilidad
// (Eje 1), esto permitia dejar resenas falsas atribuidas a cualquier medico.
//
// Decision de Mateo: no vale la pena construir un sistema de tokens para una
// ruta que el producto ya no usa. Se neutraliza la escritura por completo --
// el endpoint sigue respondiendo (para no romper un link viejo con un 404
// confuso) pero ya no toca la base de datos en ningun caso. Sin redirect
// automatico a resena.html: el link legacy no trae medico_id de forma
// confiable para eso, y no es el alcance de este bloque.

function page(title: string, body: string): Response {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — CitaDoc</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100svh;background:linear-gradient(135deg,#052a27,#073d36);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;padding:24px}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:40px 36px;max-width:420px;width:100%;text-align:center;backdrop-filter:blur(12px)}
.logo{color:rgba(255,255,255,.45);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:28px}
h1{color:#fff;font-size:22px;font-weight:700;line-height:1.3;margin-bottom:10px}
p{color:rgba(255,255,255,.5);font-size:15px;line-height:1.65;margin-bottom:24px}
.cta{display:block;background:rgba(14,157,140,.85);color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;margin-top:8px}
</style></head>
<body><div class="card">${body}</div></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function pageLegacyInactive(): Response {
  return page('Enlace no disponible', `
    <div class="logo">CitaDoc</div>
    <h1>Este enlace ya no está activo</h1>
    <p>Este link de reseña es de una versión anterior de CitaDoc. Si querés dejar tu opinión, podés hacerlo directamente desde el perfil de tu médico.</p>
    <a class="cta" href="https://citadoc.lat">Ir a CitaDoc →</a>
  `)
}

Deno.serve(async (req) => {
  const url      = new URL(req.url)
  const citaId   = url.searchParams.get('cita_id') || ''
  const rMedico  = parseInt(url.searchParams.get('r')  || '0')
  const rApp     = parseInt(url.searchParams.get('ra') || '0')

  if (!citaId) return page('Error', '<h1>Enlace inválido</h1>')

  // Ambas ramas (rating de médico y rating de app) quedan neutralizadas por
  // igual -- ninguna toca `resenas`. No se distingue el caso porque ya no
  // hay nada que hacer con esos parámetros más allá de mostrar la misma
  // respuesta inerte.
  if ((rMedico >= 1 && rMedico <= 5) || (rApp >= 1 && rApp <= 5)) {
    return pageLegacyInactive()
  }

  return page('Error', '<h1>Enlace inválido</h1><p>Este enlace no es válido o ya fue usado.</p>')
})
