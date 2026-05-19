import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM = 'CitaDoc <hola@citadoc.lat>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

// ── Templates ─────────────────────────────────────────────────────────────────

function tplAppointment(d: Record<string, string>): string {
  const isDoctor     = (d.appointment_mode || '').includes('Dashboard')
  const isReschedule = (d.appointment_mode || '').includes('reprogramada')
  const badge        = isReschedule ? 'Cita Reprogramada' : isDoctor ? 'Nueva Cita' : 'Cita Confirmada'
  const headline     = isReschedule ? 'Tu cita ha sido reprogramada.' : isDoctor ? 'Nueva cita agendada.' : 'Tu cita está confirmada.'
  const modeClean    = (d.appointment_mode || '')
    .replace('📋 Dashboard: https://citadoc.lat/citadoc-dashboard.html', 'Panel médico')
    .replace(/^[^\w]+ /, '')
  const badgeBg      = isReschedule ? '#fef9c3' : '#dbeafe'
  const badgeColor   = isReschedule ? '#92400e' : '#1d4ed8'
  const headerGrad   = isReschedule
    ? 'linear-gradient(135deg,#fffbeb 0%,#fef9c3 100%)'
    : 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)'
  const ctaColor     = isDoctor ? '#1d4ed8' : '#0891b2'
  const ctaLabel     = isDoctor ? 'Ver en mi panel →' : 'Ver perfil del médico →'

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>

<tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:${headerGrad};padding:36px 40px 28px;border-bottom:1px solid #e2e8f0;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
    <td style="background:${badgeBg};border-radius:100px;padding:5px 14px;">
      <span style="color:${badgeColor};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${badge}</span>
    </td>
  </tr></table>
  <h1 style="margin:0;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
</td></tr>

<tr><td style="padding:32px 40px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding-bottom:18px;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Paciente</p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${d.patient_name || ''}</p>
    </td></tr>
    <tr><td style="padding:18px 0;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Médico</p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${d.doctor_name || ''}</p>
    </td></tr>
    <tr><td style="padding-top:18px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Fecha</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.appointment_date || ''}</p>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Hora</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.appointment_time || ''}</p>
        </td>
      </tr></table>
    </td></tr>
    ${d.location_name ? `<tr><td style="padding-top:18px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Lugar</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.location_name}</p>
        </td>
        ${modeClean ? `<td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Modalidad</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${modeClean}</p>
        </td>` : ''}
      </tr></table>
    </td></tr>` : ''}
  </table>
</td></tr>

${d.public_profile_url ? `<tr><td style="padding:0 40px 36px;">
  <a href="${d.public_profile_url}" style="display:block;background:${ctaColor};color:#fff;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">${ctaLabel}</a>
</td></tr>` : ''}

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`
}

function tplIndicaciones(d: Record<string, unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  // Receta block
  // deno-lint-ignore no-explicit-any
  const receta = d.receta as any
  const recetaHtml = receta?.items?.length ? `
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0 0 14px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">💊 Receta médica</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#f8fafc;">
          <td style="padding:8px 14px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:35%;">Medicamento</td>
          <td style="padding:8px 14px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Dosis</td>
          <td style="padding:8px 14px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Frecuencia</td>
          <td style="padding:8px 14px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Duración</td>
        </tr>
        ${receta.items.map((item: Record<string,string>, i: number) => `
        <tr style="background:${i%2===0?'#fff':'#fafafa'};border-top:1px solid #f1f5f9;">
          <td style="padding:10px 14px;color:#0f172a;font-size:13px;font-weight:600;">${safe(item.medicamento)}</td>
          <td style="padding:10px 14px;color:#374151;font-size:13px;">${safe(item.dosis)}</td>
          <td style="padding:10px 14px;color:#374151;font-size:13px;">${safe(item.frecuencia)}</td>
          <td style="padding:10px 14px;color:#374151;font-size:13px;">${safe(item.duracion)}</td>
        </tr>`).join('')}
      </table>
    </div>
    ${receta.notas ? `<p style="margin:10px 0 0;color:#6b7280;font-size:13px;font-style:italic;">${safe(receta.notas)}</p>` : ''}
  </td></tr>` : ''

  // Labs block
  // deno-lint-ignore no-explicit-any
  const labs = d.laboratorios as any
  const labsHtml = labs?.items?.length ? `
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0 0 14px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🧪 Orden de laboratorio</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      ${labs.items.map((item: Record<string,string>, i: number) => `
      <div style="padding:12px 16px;background:${i%2===0?'#fff':'#f8fafc'};${i>0?'border-top:1px solid #f1f5f9;':''}">
        <p style="margin:0 0 3px;color:#0f172a;font-size:14px;font-weight:600;">${safe(item.nombre)}</p>
        ${item.indicacion ? `<p style="margin:0;color:#6b7280;font-size:12px;">${safe(item.indicacion)}</p>` : ''}
        ${item.prioridad && item.prioridad!=='normal' ? `<span style="display:inline-block;margin-top:4px;background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;">${safe(item.prioridad)}</span>` : ''}
      </div>`).join('')}
    </div>
  </td></tr>` : ''

  // Imagenes block
  // deno-lint-ignore no-explicit-any
  const imgs = d.imagenes as any
  const imagenesHtml = imgs?.items?.length ? `
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0 0 14px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🩻 Orden de imágenes</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      ${imgs.items.map((item: Record<string,string>, i: number) => `
      <div style="padding:12px 16px;background:${i%2===0?'#fff':'#f8fafc'};${i>0?'border-top:1px solid #f1f5f9;':''}">
        <p style="margin:0 0 2px;color:#0f172a;font-size:14px;font-weight:600;">${safe(item.estudio)}${item.zona?` — ${safe(item.zona)}`:''}</p>
        ${item.motivo ? `<p style="margin:0;color:#6b7280;font-size:12px;">${safe(item.motivo)}</p>` : ''}
      </div>`).join('')}
    </div>
  </td></tr>` : ''

  // Indicaciones text block
  const safeText = safe(d.text || '')
  const textHtml = safeText ? `
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0 0 14px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋 Indicaciones generales</p>
    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:20px 24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;white-space:pre-wrap;">${safeText}</p>
    </div>
  </td></tr>` : ''

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>

<tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);padding:36px 40px 28px;border-bottom:1px solid #d1fae5;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
    <td style="background:#d1fae5;border-radius:100px;padding:5px 14px;">
      <span style="color:#065f46;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Documentos Médicos</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 6px;color:#0f172a;font-size:20px;font-weight:700;">De: ${safe(d.doctor_name as string)}</h1>
  <p style="margin:0;color:#6b7280;font-size:14px;">Para: <strong>${safe(d.patient_name as string)}</strong></p>
</td></tr>

<tr><td style="padding:28px 0 0;"></td></tr>

${recetaHtml}
${labsHtml}
${imagenesHtml}
${textHtml}

<tr><td style="padding:0 40px 32px;text-align:center;">
  <p style="margin:0;color:#94a3b8;font-size:12px;">${safe(d.doctor_name as string)}</p>
</td></tr>

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`
}

function tplReminder(d: Record<string, string>): string {
  const modeClean = (d.appointment_mode || '').replace(/^[^\w]+ /, '')
  const base      = 'https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/cita-action'
  const id        = d.cita_id || ''
  const confirmUrl    = `${base}?action=confirm&cita_id=${id}`
  const cancelUrl     = `${base}?action=cancel&cita_id=${id}`
  const rescheduleUrl = `${base}?action=reschedule&cita_id=${id}`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>

<tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:linear-gradient(135deg,#fefce8 0%,#fef9c3 100%);padding:36px 40px 28px;border-bottom:1px solid #fde68a;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
    <td style="background:#fde68a;border-radius:100px;padding:5px 14px;">
      <span style="color:#92400e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Recordatorio — Mañana</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;">Tienes una cita<br>en 12 horas.</h1>
  <p style="margin:0;color:#78716c;font-size:14px;">Confirma tu asistencia con un clic.</p>
</td></tr>

<tr><td style="padding:32px 40px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding-bottom:18px;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Médico</p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${d.doctor_name || ''}</p>
    </td></tr>
    <tr><td style="padding-top:18px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Fecha</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.appointment_date || ''}</p>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Hora</p>
          <p style="margin:0;color:#0f172a;font-size:22px;font-weight:700;">${d.appointment_time || ''}</p>
        </td>
      </tr></table>
    </td></tr>
    ${modeClean ? `<tr><td style="padding-top:18px;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Modalidad</p>
      <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${modeClean}</p>
    </td></tr>` : ''}
  </table>
</td></tr>

<!-- Acción principal: Confirmar -->
<tr><td style="padding:0 40px 12px;">
  <a href="${confirmUrl}" style="display:block;background:#10b981;color:#fff;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">
    ✓ Confirmo mi asistencia
  </a>
</td></tr>

<!-- Acciones secundarias -->
<tr><td style="padding:0 40px 36px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="width:50%;padding-right:6px;">
      <a href="${rescheduleUrl}" style="display:block;background:#f1f5f9;color:#374151;text-align:center;padding:12px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid #e2e8f0;">
        📅 Reprogramar
      </a>
    </td>
    <td style="width:50%;padding-left:6px;">
      <a href="${cancelUrl}" style="display:block;background:#f1f5f9;color:#ef4444;text-align:center;padding:12px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid #fecaca;">
        ✕ Cancelar cita
      </a>
    </td>
  </tr></table>
</td></tr>

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`
}

function tplDocs(htmlBody: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>
<tr><td>${htmlBody}</td></tr>
<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function tplWelcomeFree(nombre: string, titulo: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>

<tr><td style="background:#0f172a;border-radius:20px;overflow:hidden;border:1px solid #1e293b;">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="padding:48px 44px 40px;border-bottom:1px solid #1e293b;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
    <td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:100px;padding:6px 16px;">
      <span style="color:rgba(255,255,255,0.45);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Cuenta Activa</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 14px;color:#f8fafc;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.5px;">Bienvenido a CitaDoc,<br>${titulo} ${nombre}.</h1>
  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:14px;line-height:1.6;">Tu cuenta está lista. Empieza a recibir citas hoy.</p>
</td></tr>

<tr><td style="padding:36px 44px;">
  <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.7;">
    Tu perfil médico ya es visible para pacientes. Completa tu disponibilidad y empieza a recibir citas en minutos.
  </p>

  <p style="margin:0 0 16px;color:rgba(255,255,255,0.2);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Para empezar</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding-bottom:16px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px;">
          <div style="width:26px;height:26px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;text-align:center;line-height:26px;">
            <span style="color:rgba(255,255,255,0.3);font-size:10px;font-weight:700;">01</span>
          </div>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">Confirma tu email</p>
          <p style="margin:0;color:#475569;font-size:13px;">Revisa tu bandeja — te enviamos un link de confirmación</p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding-bottom:16px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px;">
          <div style="width:26px;height:26px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;text-align:center;line-height:26px;">
            <span style="color:rgba(255,255,255,0.3);font-size:10px;font-weight:700;">02</span>
          </div>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">Configura tu disponibilidad</p>
          <p style="margin:0;color:#475569;font-size:13px;">Horarios, modalidad, precio de consulta</p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px;">
          <div style="width:26px;height:26px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;text-align:center;line-height:26px;">
            <span style="color:rgba(255,255,255,0.3);font-size:10px;font-weight:700;">03</span>
          </div>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">Comparte tu enlace de citas</p>
          <p style="margin:0;color:#475569;font-size:13px;">Tus pacientes pueden agendar directamente</p>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:0 44px 44px;">
  <a href="https://citadoc.lat/citadoc-dashboard.html" style="display:block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
    Ir a mi panel &rarr;
  </a>
</td></tr>

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · La capa AI del médico moderno · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.warn('[send-email] No RESEND_API_KEY'); return }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) console.warn('[send-email] Resend error:', res.status, await res.text())
  else console.log('[send-email] Sent to:', to, '|', subject)
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const body = await req.json()
    const { type, to_email, ...data } = body

    if (!to_email) return new Response(JSON.stringify({ error: 'missing to_email' }), { status: 400, headers: CORS })

    switch (type) {
      case 'appointment':
      case 'reschedule': {
        const isDoctor     = (data.appointment_mode || '').includes('Dashboard')
        const isReschedule = (data.appointment_mode || '').includes('reprogramada') || type === 'reschedule'
        const subject = isReschedule
          ? `Tu cita con ${data.doctor_name || 'tu médico'} ha sido reprogramada`
          : isDoctor
          ? `Nueva cita — ${data.patient_name || ''}`
          : `Tu cita con ${data.doctor_name || 'tu médico'} está confirmada`
        await sendEmail(to_email, subject, tplAppointment({ ...data, appointment_mode: data.appointment_mode || '' }))
        break
      }

      case 'indicaciones': {
        const subject = `Documentos médicos — ${data.doctor_name || 'tu médico'}`
        await sendEmail(to_email, subject, tplIndicaciones(data as Record<string, unknown>))
        break
      }

      case 'docs': {
        const subject = `Documentos de tu consulta — ${data.doctor_name || 'tu médico'}`
        await sendEmail(to_email, subject, tplDocs(data.html_body || ''))
        break
      }

      case 'welcome_free': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu cuenta CitaDoc está lista`
        await sendEmail(to_email, subject, tplWelcomeFree(data.nombre || '', data.titulo || 'Dr.'))
        break
      }

      case 'reminder': {
        const subject = `Recordatorio: tu cita con ${data.doctor_name || 'tu médico'} es mañana`
        await sendEmail(to_email, subject, tplReminder(data))
        break
      }

      default:
        return new Response(JSON.stringify({ error: 'unknown type: ' + type }), { status: 400, headers: CORS })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: CORS })
  } catch (e) {
    console.error('[send-email] error:', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: CORS })
  }
})
