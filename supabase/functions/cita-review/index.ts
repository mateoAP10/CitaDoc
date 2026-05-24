import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function stars(n: number, total = 5): string {
  return '★'.repeat(n) + '☆'.repeat(total - n)
}

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
.stars-row{display:flex;justify-content:center;gap:6px;margin-bottom:8px}
.star-link{font-size:40px;text-decoration:none;line-height:1;transition:transform .15s}
.star-link:hover{transform:scale(1.2)}
.star-label{color:rgba(255,255,255,.35);font-size:12px;margin-bottom:28px}
.cta{display:block;background:rgba(14,157,140,.85);color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;margin-top:8px}
.big-check{font-size:52px;margin-bottom:16px}
</style></head>
<body><div class="card">${body}</div></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

Deno.serve(async (req) => {
  const url       = new URL(req.url)
  const citaId    = url.searchParams.get('cita_id')  || ''
  const medicoId  = url.searchParams.get('medico_id') || ''
  const rMedico   = parseInt(url.searchParams.get('r')  || '0')
  const rApp      = parseInt(url.searchParams.get('ra') || '0')

  if (!citaId) return page('Error', '<h1>Enlace inválido</h1>')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // ── Paso 1: rating del médico ──────────────────────────────────────────────
  if (rMedico >= 1 && rMedico <= 5) {
    await sb.from('resenas').upsert(
      { cita_id: citaId, medico_id: medicoId, rating_medico: rMedico },
      { onConflict: 'cita_id' }
    )

    // Construir links para rating de la app
    const appLinks = [1,2,3,4,5].map(n => {
      const href = `${SUPABASE_URL}/functions/v1/cita-review?cita_id=${citaId}&ra=${n}`
      const emoji = n <= 4 ? ['😕','😐','🙂','😊','🤩'][n-1] : '🤩'
      return `<a class="star-link" href="${href}" title="${n} estrella${n>1?'s':''}">${emoji}</a>`
    }).join('')

    return page('Gracias', `
      <div class="logo">CitaDoc</div>
      <div style="font-size:48px;margin-bottom:12px">${['😕','😐','🙂','😊','🤩'][rMedico-1]}</div>
      <h1>¡Gracias! Diste<br>${stars(rMedico)} al médico</h1>
      <p style="margin-top:8px;margin-bottom:28px">¿Cómo fue tu experiencia con CitaDoc?</p>
      <div class="stars-row">${appLinks}</div>
      <div class="star-label">Toca para calificar la app</div>
      <a class="cta" href="https://citadoc.lat" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15)">Saltar →</a>
    `)
  }

  // ── Paso 2: rating de la app ───────────────────────────────────────────────
  if (rApp >= 1 && rApp <= 5) {
    await sb.from('resenas')
      .update({ rating_app: rApp })
      .eq('cita_id', citaId)

    return page('¡Gracias!', `
      <div class="logo">CitaDoc</div>
      <div class="big-check">🎉</div>
      <h1>¡Gracias por tu reseña!</h1>
      <p>Tu opinión ayuda a otros pacientes a encontrar al médico ideal.</p>
      <a class="cta" href="https://citadoc.lat">Agendar otra cita →</a>
    `)
  }

  return page('Error', '<h1>Enlace inválido</h1><p>Este enlace no es válido o ya fue usado.</p>')
})
