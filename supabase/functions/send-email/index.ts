import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM = 'CitaDoc <hola@citadoc.lat>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-citadoc-public-key',
  'Content-Type': 'application/json',
}

// ── Templates ─────────────────────────────────────────────────────────────────

const I18N_EMAIL: Record<string, Record<string, string>> = {
  es: { confirmed:'Cita Confirmada', new:'Nueva Cita', rescheduled:'Cita Reprogramada', headline_c:'Tu cita está confirmada.', headline_n:'Nueva cita agendada.', headline_r:'Tu cita ha sido reprogramada.', patient:'Paciente', doctor:'Médico', date:'Fecha', time:'Hora', location:'Lugar', mode:'Modalidad', view_doctor:'Ver perfil del médico →', view_panel:'Ver en mi panel →' },
  en: { confirmed:'Confirmed Appointment', new:'New Appointment', rescheduled:'Rescheduled Appointment', headline_c:'Your appointment is confirmed.', headline_n:'New appointment scheduled.', headline_r:'Your appointment has been rescheduled.', patient:'Patient', doctor:'Doctor', date:'Date', time:'Time', location:'Location', mode:'Mode', view_doctor:'View doctor profile →', view_panel:'View in my panel →' },
  pt: { confirmed:'Consulta Confirmada', new:'Nova Consulta', rescheduled:'Consulta Remarcada', headline_c:'Sua consulta está confirmada.', headline_n:'Nova consulta agendada.', headline_r:'Sua consulta foi remarcada.', patient:'Paciente', doctor:'Médico', date:'Data', time:'Hora', location:'Local', mode:'Modalidade', view_doctor:'Ver perfil do médico →', view_panel:'Ver no meu painel →' },
  fr: { confirmed:'Rendez-vous confirmé', new:'Nouveau rendez-vous', rescheduled:'Rendez-vous reprogrammé', headline_c:'Votre rendez-vous est confirmé.', headline_n:'Nouveau rendez-vous planifié.', headline_r:'Votre rendez-vous a été reprogrammé.', patient:'Patient', doctor:'Médecin', date:'Date', time:'Heure', location:'Lieu', mode:'Mode', view_doctor:'Voir le profil du médecin →', view_panel:'Voir dans mon tableau →' },
  de: { confirmed:'Termin bestätigt', new:'Neuer Termin', rescheduled:'Termin verschoben', headline_c:'Ihr Termin ist bestätigt.', headline_n:'Neuer Termin vereinbart.', headline_r:'Ihr Termin wurde verschoben.', patient:'Patient', doctor:'Arzt', date:'Datum', time:'Uhrzeit', location:'Ort', mode:'Art', view_doctor:'Arztprofil ansehen →', view_panel:'Im Cockpit ansehen →' },
  it: { confirmed:'Appuntamento confermato', new:'Nuovo appuntamento', rescheduled:'Appuntamento riprogrammato', headline_c:'Il tuo appuntamento è confermato.', headline_n:'Nuovo appuntamento programmato.', headline_r:'Il tuo appuntamento è stato riprogrammato.', patient:'Paziente', doctor:'Medico', date:'Data', time:'Ora', location:'Luogo', mode:'Modalità', view_doctor:'Vedi profilo medico →', view_panel:'Vedi nel mio pannello →' },
  tr: { confirmed:'Randevu Onaylandı', new:'Yeni Randevu', rescheduled:'Randevu Yeniden Planlandı', headline_c:'Randevunuz onaylandı.', headline_n:'Yeni randevu planlandı.', headline_r:'Randevunuz yeniden planlandı.', patient:'Hasta', doctor:'Doktor', date:'Tarih', time:'Saat', location:'Konum', mode:'Mod', view_doctor:'Doktor profilini görüntüle →', view_panel:'Panelimde görüntüle →' },
  ru: { confirmed:'Приём подтверждён', new:'Новая запись', rescheduled:'Запись перенесена', headline_c:'Ваш приём подтверждён.', headline_n:'Новая запись создана.', headline_r:'Ваш приём перенесён.', patient:'Пациент', doctor:'Врач', date:'Дата', time:'Время', location:'Место', mode:'Формат', view_doctor:'Посмотреть профиль врача →', view_panel:'Открыть панель →' },
  ar: { confirmed:'تم تأكيد الموعد', new:'موعد جديد', rescheduled:'تم إعادة جدولة الموعد', headline_c:'تم تأكيد موعدك.', headline_n:'تم جدولة موعد جديد.', headline_r:'تم إعادة جدولة موعدك.', patient:'المريض', doctor:'الطبيب', date:'التاريخ', time:'الوقت', location:'الموقع', mode:'الطريقة', view_doctor:'عرض ملف الطبيب ←', view_panel:'عرض في لوحتي ←' },
}

function tplAppointment(d: Record<string, string>): string {
  const lang         = d.lang && I18N_EMAIL[d.lang] ? d.lang : 'es'
  const T            = I18N_EMAIL[lang]
  const isDoctor     = (d.appointment_mode || '').includes('Dashboard')
  const isReschedule = (d.appointment_mode || '').includes('reprogramada') || (d.appointment_mode || '').includes('rescheduled')
  const badge        = isReschedule ? T.rescheduled : isDoctor ? T.new : T.confirmed
  const headline     = isReschedule ? T.headline_r : isDoctor ? T.headline_n : T.headline_c
  const modeClean    = (d.appointment_mode || '')
    .replace('📋 Dashboard: https://citadoc.lat/citadoc-dashboard.html', 'Panel médico')
    .replace(/^[^\w]+ /, '')
  const badgeBg      = isReschedule ? '#fef9c3' : '#dbeafe'
  const badgeColor   = isReschedule ? '#92400e' : '#1d4ed8'
  const headerGrad   = isReschedule
    ? 'linear-gradient(135deg,#fffbeb 0%,#fef9c3 100%)'
    : 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)'
  const ctaColor     = isDoctor ? '#1d4ed8' : '#0891b2'
  const ctaLabel     = isDoctor ? T.view_panel : T.view_doctor

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
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
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">${T.patient}</p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${d.patient_name || ''}</p>
    </td></tr>
    <tr><td style="padding:18px 0;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">${T.doctor}</p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${d.doctor_name || ''}</p>
    </td></tr>
    <tr><td style="padding-top:18px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">${T.date}</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.appointment_date || ''}</p>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">${T.time}</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.appointment_time || ''}</p>
        </td>
      </tr></table>
    </td></tr>
    ${d.location_name ? `<tr><td style="padding-top:18px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">${T.location}</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:600;">${d.location_name}</p>
        </td>
        ${modeClean ? `<td style="width:50%;vertical-align:top;padding-left:16px;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">${T.mode}</p>
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

${(d.pdf_url as string) ? `<tr><td style="padding:0 40px 20px;">
  <a href="${d.pdf_url}" style="display:block;background:#0f172a;color:#fff;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
    ⬇ Descargar documentos en PDF
  </a>
</td></tr>` : ''}
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

function tplVerificationNew(d: Record<string, string>): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:36px 40px 28px;border-bottom:1px solid #1e293b;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
    <td style="background:rgba(139,92,246,.2);border:1px solid rgba(139,92,246,.4);border-radius:100px;padding:5px 14px;">
      <span style="color:#c4b5fd;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Admin · Verificación Pendiente</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 8px;color:#f8fafc;font-size:20px;font-weight:700;">Nuevo médico para verificar</h1>
  <p style="margin:0;color:rgba(255,255,255,.4);font-size:14px;">${d.titulo || 'Dr.'} ${d.nombre || ''} ${d.apellido || ''} envió sus documentos.</p>
</td></tr>
<tr><td style="padding:28px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding-bottom:14px;border-bottom:1px solid #1e293b;">
      <p style="margin:0 0 3px;color:rgba(255,255,255,.3);font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Nombre</p>
      <p style="margin:0;color:#e2e8f0;font-size:14px;font-weight:600;">${d.titulo || 'Dr.'} ${d.nombre || ''} ${d.apellido || ''}</p>
    </td></tr>
    <tr><td style="padding:14px 0;border-bottom:1px solid #1e293b;">
      <p style="margin:0 0 3px;color:rgba(255,255,255,.3);font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Email</p>
      <p style="margin:0;color:#e2e8f0;font-size:14px;">${d.doctor_email || ''}</p>
    </td></tr>
    <tr><td style="padding:14px 0 20px;">
      <p style="margin:0 0 10px;color:rgba(255,255,255,.3);font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Documentos</p>
      ${d.cedula_url ? `<p style="margin:0 0 8px;"><a href="${d.cedula_url}" style="color:#818cf8;font-size:13px;font-weight:600;">Ver documento de identidad →</a></p>` : ''}
      ${d.titulo_url ? `<p style="margin:0;"><a href="${d.titulo_url}" style="color:#818cf8;font-size:13px;font-weight:600;">Ver título médico →</a></p>` : ''}
    </td></tr>
  </table>
  <a href="https://citadoc.lat/admin.html?key=citadoc-growth-2026" style="display:block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-top:4px;">Ir al panel de verificaciones →</a>
</td></tr>
</table></td></tr>
<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc Admin</p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function tplVerificationResult(nombre: string, titulo: string, aprobado: boolean): string {
  const bg   = aprobado ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fff1f2,#fee2e2)'
  const badgeBg    = aprobado ? '#d1fae5' : '#fee2e2'
  const badgeColor = aprobado ? '#065f46' : '#991b1b'
  const badge      = aprobado ? 'Verificación Aprobada' : 'Verificación Rechazada'
  const headline   = aprobado ? `${titulo} ${nombre}, estás verificado.` : `${titulo} ${nombre}, necesitamos revisar tus documentos.`
  const body       = aprobado
    ? 'Tu perfil ahora muestra el badge de médico verificado. Tus pacientes pueden confiar en tu identidad profesional.'
    : 'No pudimos verificar tus documentos. Por favor sube imágenes más claras o legibles en la sección Verificación de tu perfil.'
  const cta        = aprobado ? 'Ver mi perfil verificado →' : 'Subir nuevos documentos →'
  const ctaUrl     = aprobado ? 'https://citadoc.lat/citadoc-dashboard.html' : 'https://citadoc.lat/citadoc-dashboard.html'
  const ctaColor   = aprobado ? '#059669' : '#dc2626'

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>
<tr><td style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:${bg};padding:36px 40px 28px;border-bottom:1px solid #e2e8f0;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
    <td style="background:${badgeBg};border-radius:100px;padding:5px 14px;">
      <span style="color:${badgeColor};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${badge}</span>
    </td>
  </tr></table>
  <h1 style="margin:0;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;">${headline}</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;">${body}</p>
  <a href="${ctaUrl}" style="display:block;background:${ctaColor};color:#fff;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">${cta}</a>
</td></tr>
</table></td></tr>
<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function tplTrialStarted(nombre: string, titulo: string, trialEndsAt: string): string {
  const endDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }) : '30 días'
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
      <span style="color:rgba(255,255,255,0.45);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Trial Pro Activo</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 14px;color:#f8fafc;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.5px;">Tu trial Pro comenzó 🚀</h1>
  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:14px;line-height:1.6;">${titulo} ${nombre}, tienes acceso premium completo hasta el <strong style="color:#f8fafc;">${endDate}</strong>.</p>
</td></tr>

<tr><td style="padding:36px 44px;">
  <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.7;">
    Durante estos 30 días puedes explorar todas las funcionalidades Pro: gestión de pacientes, historiales clínicos, recetas digitales y tu perfil optimizado en búsquedas.
  </p>

  <p style="margin:0 0 16px;color:rgba(255,255,255,0.2);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Incluido en tu trial</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding-bottom:16px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px;">
          <div style="width:26px;height:26px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;text-align:center;line-height:26px;">
            <span style="color:rgba(255,255,255,0.3);font-size:10px;font-weight:700;">01</span>
          </div>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">Perfil destacado en búsquedas</p>
          <p style="margin:0;color:#475569;font-size:13px;">Aparece primero cuando los pacientes buscan tu especialidad</p>
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
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">Gestión de pacientes completa</p>
          <p style="margin:0;color:#475569;font-size:13px;">Historial clínico, recetas digitales y seguimiento</p>
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
          <p style="margin:0 0 2px;color:#e2e8f0;font-size:14px;font-weight:600;">Landing personalizada</p>
          <p style="margin:0;color:#475569;font-size:13px;">Tu propia página web médica con tu branding</p>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:0 44px 44px;">
  <a href="https://citadoc.lat/citadoc-dashboard.html" style="display:block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
    Explorar mi dashboard &rarr;
  </a>
</td></tr>

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · La capa AI del médico moderno · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr></table>
</body></html>`
}

function tplTrialReminder(nombre: string, titulo: string, daysLeft: number, trialEndsAt: string): string {
  const endDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const urgency = daysLeft === 1 ? '⚠️ Último día' : daysLeft <= 5 ? '⏳ Quedan pocos días' : '📅 Recordatorio'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#0f172a;border-radius:20px;overflow:hidden;border:1px solid #1e293b">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:40px 44px 32px;border-bottom:1px solid #1e293b">
  <div style="display:inline-block;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);border-radius:100px;padding:5px 14px;margin-bottom:20px">
    <span style="color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${urgency}</span>
  </div>
  <h1 style="margin:0 0 12px;color:#f8fafc;font-size:24px;font-weight:700;line-height:1.2">Tu trial Pro vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}</h1>
  <p style="margin:0;color:rgba(255,255,255,.4);font-size:14px;line-height:1.6">${titulo} ${nombre}, tu acceso premium termina el <strong style="color:#f8fafc">${endDate}</strong>.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.7">Activa tu plan Pro para seguir con acceso a historiales clínicos, recetas digitales, prioridad en búsquedas y más.</p>
  <a href="https://citadoc.lat/citadoc-dashboard.html" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Activar Plan Pro →</a>
</td></tr>
<tr><td style="padding:0 44px 32px;text-align:center">
  <p style="margin:0;color:#334155;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#334155">hola@citadoc.lat</a></p>
</td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplTrialExpired(nombre: string, titulo: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#0f172a;border-radius:20px;overflow:hidden;border:1px solid #1e293b">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:40px 44px 32px;border-bottom:1px solid #1e293b">
  <h1 style="margin:0 0 12px;color:#f8fafc;font-size:24px;font-weight:700;line-height:1.2">Tu trial Pro venció</h1>
  <p style="margin:0;color:rgba(255,255,255,.4);font-size:14px;line-height:1.6">${titulo} ${nombre}, tu período de prueba ha terminado. Tu cuenta vuelve al plan gratuito.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.7">Activa tu plan Pro para recuperar acceso completo a todas las funcionalidades premium de CitaDoc.</p>
  <a href="https://citadoc.lat/citadoc-dashboard.html" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Activar Plan Pro →</a>
</td></tr>
<tr><td style="padding:0 44px 32px;text-align:center">
  <p style="margin:0;color:#334155;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#334155">hola@citadoc.lat</a></p>
</td></tr>
</table></td></tr>
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

    // ── Auth / Public Key validation ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    const publicKey  = req.headers.get('x-citadoc-public-key')
    const VALID_PUBLIC_KEY = Deno.env.get('PUBLIC_BOOKING_KEY') || 'citadoc-public-2026'

    // If no JWT auth, require valid public key
    if (!authHeader && publicKey !== VALID_PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
    }

    // Public key access: only allow appointment-related types
    if (!authHeader && publicKey === VALID_PUBLIC_KEY) {
      const PUBLIC_ALLOWED_TYPES = ['appointment', 'reschedule', 'reminder']
      if (!PUBLIC_ALLOWED_TYPES.includes(type)) {
        return new Response(JSON.stringify({ error: 'Forbidden type for public access' }), { status: 403, headers: CORS })
      }
    }

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

      case 'trial_started': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu trial Pro de CitaDoc comenzó 🚀`
        await sendEmail(to_email, subject, tplTrialStarted(data.nombre || '', data.titulo || 'Dr.', data.trial_ends_at || ''))
        break
      }

      case 'reminder': {
        const subject = `Recordatorio: tu cita con ${data.doctor_name || 'tu médico'} es mañana`
        await sendEmail(to_email, subject, tplReminder(data))
        break
      }

      case 'verification_new': {
        const subject = `Verificación pendiente — ${data.titulo || 'Dr.'} ${data.nombre || ''} ${data.apellido || ''}`
        await sendEmail(to_email, subject, tplVerificationNew(data as Record<string, string>))
        break
      }

      case 'verification_result': {
        const aprobado = data.aprobado === true || data.aprobado === 'true'
        const subject  = aprobado
          ? `Tu cuenta CitaDoc ha sido verificada`
          : `Actualiza tus documentos de verificación`
        await sendEmail(to_email, subject, tplVerificationResult(data.nombre || '', data.titulo || 'Dr.', aprobado))
        break
      }

      case 'pro_activated': {
        const isProweb = data.plan === 'pro_web'
        const planLabel = isProweb ? 'PRO + WEB' : 'PRO'
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu plan CitaDoc ${planLabel} está activo`
        const siteUrl = isProweb && data.slug ? `https://${data.slug}.citadoc.lat` : null
        const body = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:20px;overflow:hidden">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:40px;text-align:center">
<div style="display:inline-block;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px 16px;margin-bottom:24px">
<span style="color:rgba(255,255,255,.5);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">CitaDoc ${planLabel}</span></div>
<h1 style="margin:0 0 12px;color:#fff;font-size:26px;font-weight:700;line-height:1.25">Tu práctica médica<br>acaba de evolucionar.</h1>
<p style="margin:0;color:rgba(255,255,255,.5);font-size:15px">${data.titulo || 'Dr.'} ${data.nombre || ''}, tu plan está activo.</p>
</td></tr>
<tr><td style="background:#fff;padding:36px 40px">
<p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">Tienes acceso completo a tu dashboard, agendamiento inteligente${isProweb ? ' y tu sitio web médico personalizado' : ''}.</p>
${siteUrl ? `<p style="margin:0 0 20px;color:#374151;font-size:15px">Tu sitio web: <a href="${siteUrl}" style="color:#0b7c6e;font-weight:700">${siteUrl}</a></p>` : ''}
<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td>
<a href="https://citadoc.lat/citadoc-dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700">Ir a mi dashboard →</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:20px 40px;text-align:center">
<p style="margin:0;color:rgba(255,255,255,.3);font-size:12px">CitaDoc Health Network · citadoc.lat</p>
</td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`
        await sendEmail(to_email, subject, body)
        break
      }

      case 'trial_reminder_20':
      case 'trial_reminder_25':
      case 'trial_reminder_29': {
        const days = type === 'trial_reminder_20' ? 10 : type === 'trial_reminder_25' ? 5 : 1
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu trial Pro vence en ${days} día${days > 1 ? 's' : ''}`
        await sendEmail(to_email, subject, tplTrialReminder(data.nombre || '', data.titulo || 'Dr.', days, data.trial_ends_at || ''))
        break
      }

      case 'trial_expired': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu trial Pro de CitaDoc venció`
        await sendEmail(to_email, subject, tplTrialExpired(data.nombre || '', data.titulo || 'Dr.'))
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
