import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getClientIp } from '../_shared/rate-limit.ts'

// P2.3 -- send-email: la rama `Authorization` solo chequeaba que el header
// no estuviera vacio, sin validar identidad -- "Authorization existe ->
// confianza". La anon key (publica, hardcodeada en varios HTML) es un
// string no vacio, asi que entraba directo a la rama privilegiada y
// desbloqueaba los 35 tipos sin restriccion, incluidos los que adjuntan
// PDFs reales via pdf_url. Fix: 3 niveles explicitos por identidad real,
// no por presencia de header.
//
// A -- JWT de usuario real (medico/staff, auth.getUser() resuelve):
// solo los tipos que el dashboard/Doctor Center legitimamente disparan.
const USER_ALLOWED_TYPES = [
  'voice_doc', 'docs', 'indicaciones', 'verification_new',
  'lab_order_confirm', 'lab_order_realizado', 'lab_order_cancelado', 'lab_result',
  'center_reminder', 'center_noshow', 'center_postvista', 'center_coupon', 'center_confirm',
]
// C -- x-citadoc-public-key (flujo de booking sin sesion): sin cambios,
// misma lista que ya existia.
const PUBLIC_ALLOWED_TYPES = ['appointment', 'reschedule', 'reminder', 'web_generada']

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
  const isDoctor      = (d.appointment_mode || '').includes('Dashboard')
  const isReschedule  = (d.appointment_mode || '').includes('reprogramada') || (d.appointment_mode || '').includes('rescheduled')
  const isDoctorCenter = (d.appointment_mode || '') === 'Solicitud de cita'
  const centerName    = d.brand_name || 'Doctor Center'
  const badge         = isDoctorCenter ? centerName : isReschedule ? T.rescheduled : isDoctor ? T.new : T.confirmed
  const headline      = isDoctorCenter ? `Tu turno en ${centerName}.` : isReschedule ? T.headline_r : isDoctor ? T.headline_n : T.headline_c
  const modeClean     = (d.appointment_mode || '')
    .replace('📋 Dashboard: https://citadoc.lat/citadoc-dashboard.html', 'Panel médico')
    .replace(/^[^\w]+ /, '')
  const badgeBg       = isDoctorCenter ? '#f0f9ff' : isReschedule ? '#fef9c3' : '#dbeafe'
  const badgeColor    = isDoctorCenter ? '#0891b2' : isReschedule ? '#92400e' : '#1d4ed8'
  const headerGrad    = isReschedule
    ? 'linear-gradient(135deg,#fffbeb 0%,#fef9c3 100%)'
    : 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)'
  const ctaColor      = isDoctor ? '#1d4ed8' : '#0891b2'
  const ctaLabel      = isDoctor ? T.view_panel : T.view_doctor

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  ${d.brand_logo ? `<img src="${d.brand_logo}" alt="" style="height:44px;max-width:160px;object-fit:contain;display:block;margin:0 auto 8px;">` : ''}
  <span style="color:#0f172a;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${d.brand_name || 'CITADOC'}</span>
  ${d.brand_subtitle ? `<br><span style="color:#94a3b8;font-size:10px;letter-spacing:1px;">${d.brand_subtitle}</span>` : ''}
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
    ${d.services ? (() => {
      try {
        const svcs = JSON.parse(d.services) as Array<{nombre: string; precio: number}>
        if (!svcs.length) return ''
        return `<tr><td style="padding-top:18px;border-top:1px solid #f1f5f9;">
          <p style="margin:0 0 10px;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Servicios solicitados</p>
          <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${svcs.map((s, i) => `<tr style="background:${i%2===0?'#fff':'#f8fafc'};${i>0?'border-top:1px solid #f1f5f9;':''}">
                <td style="padding:10px 14px;color:#0f172a;font-size:13px;font-weight:600;">${s.nombre||''}</td>
                <td style="padding:10px 14px;color:#0891b2;font-size:13px;font-weight:700;text-align:right;">${s.precio>0?'$'+s.precio:''}</td>
              </tr>`).join('')}
              ${d.services_total && Number(d.services_total)>0 ? `<tr style="background:#f0f9ff;border-top:2px solid #e0f2fe;">
                <td style="padding:12px 14px;color:#0f172a;font-size:13px;font-weight:700;">Total estimado</td>
                <td style="padding:12px 14px;color:#0891b2;font-size:15px;font-weight:800;text-align:right;">$${Number(d.services_total).toFixed(2)}</td>
              </tr>` : ''}
            </table>
          </div>
        </td></tr>`
      } catch { return '' }
    })() : ''}
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

  const sectionWrap = (color: string, borderColor: string, labelColor: string, icon: string, title: string, content: string) => `
  <tr><td style="padding:0 32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid ${borderColor};border-radius:14px;overflow:hidden;">
      <tr><td style="background:${color};padding:12px 18px;border-bottom:1px solid ${borderColor};">
        <span style="font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${labelColor};">${icon} ${title}</span>
      </td></tr>
      <tr><td style="background:#fff;padding:16px 18px;">${content}</td></tr>
    </table>
  </td></tr>`

  // 1. Medicación
  // deno-lint-ignore no-explicit-any
  const receta = d.receta as any
  const recetaHtml = receta?.items?.length ? sectionWrap(
    '#f0fdf4','#bbf7d0','#065f46','💊','Medicación',
    `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f8fafc;">
        <td style="padding:7px 10px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:38%;border-bottom:1px solid #e5e7eb;">Medicamento</td>
        <td style="padding:7px 10px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Dosis</td>
        <td style="padding:7px 10px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Frecuencia</td>
        <td style="padding:7px 10px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Duración</td>
      </tr>
      ${receta.items.map((item: Record<string,string>) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:9px 10px;color:#0f172a;font-size:13px;font-weight:600;">${safe(item.medicamento)}</td>
        <td style="padding:9px 10px;color:#374151;font-size:13px;">${safe(item.dosis)}</td>
        <td style="padding:9px 10px;color:#374151;font-size:13px;">${safe(item.frecuencia)}</td>
        <td style="padding:9px 10px;color:#374151;font-size:13px;">${safe(item.duracion)}</td>
      </tr>`).join('')}
    </table>
    ${receta.notas ? `<p style="margin:10px 0 0;color:#6b7280;font-size:12px;font-style:italic;">${safe(receta.notas)}</p>` : ''}`
  ) : ''

  // 2. Indicaciones
  const safeText = safe(d.text || '')
  const textHtml = safeText ? sectionWrap(
    '#eff6ff','#bfdbfe','#1e40af','📋','Indicaciones',
    `<p style="margin:0;color:#1e293b;font-size:14px;line-height:1.8;white-space:pre-wrap;">${safeText}</p>`
  ) : ''

  // 3. Imágenes
  // deno-lint-ignore no-explicit-any
  const imgs = d.imagenes as any
  const imagenesHtml = imgs?.items?.length ? sectionWrap(
    '#faf5ff','#e9d5ff','#6b21a8','🩻','Orden de imágenes',
    imgs.items.map((item: Record<string,string>, i: number) => `
    <div style="${i>0?'border-top:1px solid #f3e8ff;margin-top:10px;padding-top:10px;':''}">
      <p style="margin:0 0 2px;color:#0f172a;font-size:13px;font-weight:600;">${safe(item.estudio)}${item.zona?` — ${safe(item.zona)}`:''}</p>
      ${item.motivo ? `<p style="margin:0;color:#6b7280;font-size:12px;">${safe(item.motivo)}</p>` : ''}
    </div>`).join('')
  ) : ''

  // 4. Laboratorios
  // deno-lint-ignore no-explicit-any
  const labs = d.laboratorios as any
  const labsHtml = labs?.items?.length ? sectionWrap(
    '#fff7ed','#fed7aa','#9a3412','🧪','Laboratorios',
    labs.items.map((item: Record<string,string>, i: number) => `
    <div style="${i>0?'border-top:1px solid #ffedd5;margin-top:10px;padding-top:10px;':''}">
      <p style="margin:0 0 2px;color:#0f172a;font-size:13px;font-weight:600;">${safe(item.nombre)}</p>
      ${item.indicacion ? `<p style="margin:0;color:#6b7280;font-size:12px;">${safe(item.indicacion)}</p>` : ''}
      ${item.prioridad && item.prioridad!=='normal' ? `<span style="display:inline-block;margin-top:4px;background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;">${safe(item.prioridad)}</span>` : ''}
    </div>`).join('')
  ) : ''

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

<tr><td style="padding-bottom:20px;text-align:center;">
  ${d.brand_logo ? `<img src="${d.brand_logo as string}" alt="" style="height:44px;max-width:160px;object-fit:contain;display:block;margin:0 auto 8px;">` : ''}
  <span style="color:#0f172a;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${safe(d.brand_name as string) || 'CITADOC'}</span>
  ${d.brand_subtitle ? `<br><span style="color:#94a3b8;font-size:10px;letter-spacing:1px;">${safe(d.brand_subtitle as string)}</span>` : ''}
</td></tr>

<tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 32px 24px;">
  <p style="margin:0 0 4px;color:rgba(255,255,255,.45);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Documentos médicos</p>
  <h1 style="margin:0 0 6px;color:#fff;font-size:19px;font-weight:700;">${safe(d.doctor_name as string)}</h1>
  <p style="margin:0;color:rgba(255,255,255,.55);font-size:13px;">Para: <strong style="color:rgba(255,255,255,.85);">${safe(d.patient_name as string)}</strong></p>
</td></tr>

<!-- FIRMA — siempre visible, justo debajo del header -->
<tr><td style="padding:16px 32px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #16a34a;background:#f0fdf4;border-radius:0 10px 10px 0;">
    <tr><td style="padding:12px 16px;">
      <p style="margin:0 0 3px;font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:1px;">&#10003; Este documento ha sido firmado y autorizado digitalmente</p>
      <p style="margin:0;font-size:12px;color:#166534;">por <strong>${safe(d.doctor_name as string)}</strong>${(d.doctor_meta as string) ? ' &mdash; '+safe(d.doctor_meta as string) : ''}</p>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:16px 0 0;"></td></tr>

${recetaHtml}
${textHtml}
${imagenesHtml}
${labsHtml}

<!-- PDF cards por tipo -->
<tr><td style="padding:0 32px 8px;">
${(d.pdf_receta as string) ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;border:1.5px solid #bbf7d0;border-radius:10px;overflow:hidden;"><tr><td style="padding:10px 14px;background:#f0fdf4;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0;font-size:12px;font-weight:700;color:#065f46;">&#128138; Receta M&eacute;dica.pdf</p></td><td align="right"><a href="${d.pdf_receta}" style="font-size:11px;font-weight:700;color:#15803d;text-decoration:none;">Descargar &rarr;</a></td></tr></table></td></tr></table>` : ''}
${(d.pdf_imagenes as string) ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;border:1.5px solid #e9d5ff;border-radius:10px;overflow:hidden;"><tr><td style="padding:10px 14px;background:#faf5ff;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0;font-size:12px;font-weight:700;color:#6b21a8;">&#129657; Orden Im&aacute;genes.pdf</p></td><td align="right"><a href="${d.pdf_imagenes}" style="font-size:11px;font-weight:700;color:#7c3aed;text-decoration:none;">Descargar &rarr;</a></td></tr></table></td></tr></table>` : ''}
${(d.pdf_laboratorios as string) ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;border:1.5px solid #fed7aa;border-radius:10px;overflow:hidden;"><tr><td style="padding:10px 14px;background:#fff7ed;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0;font-size:12px;font-weight:700;color:#9a3412;">&#129514; Orden Laboratorios.pdf</p></td><td align="right"><a href="${d.pdf_laboratorios}" style="font-size:11px;font-weight:700;color:#c2410c;text-decoration:none;">Descargar &rarr;</a></td></tr></table></td></tr></table>` : ''}
${(d.pdf_indicaciones as string) ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;border:1.5px solid #bfdbfe;border-radius:10px;overflow:hidden;"><tr><td style="padding:10px 14px;background:#eff6ff;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0;font-size:12px;font-weight:700;color:#1e40af;">&#128203; Indicaciones.pdf</p></td><td align="right"><a href="${d.pdf_indicaciones}" style="font-size:11px;font-weight:700;color:#1d4ed8;text-decoration:none;">Descargar &rarr;</a></td></tr></table></td></tr></table>` : ''}
${(!d.pdf_receta && !d.pdf_imagenes && !d.pdf_laboratorios && d.pdf_url as string) ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;"><tr><td style="padding:10px 14px;background:#f8fafc;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0;font-size:12px;font-weight:700;color:#0f172a;">&#128196; Documentos M&eacute;dicos.pdf</p></td><td align="right"><a href="${d.pdf_url}" style="font-size:11px;font-weight:700;color:#1d4ed8;text-decoration:none;">Descargar &rarr;</a></td></tr></table></td></tr></table>` : ''}
</td></tr>

</table></td></tr>

<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">${safe(d.brand_name as string) || 'CitaDoc'} · <a href="mailto:hola@citadoc.lat" style="color:#cbd5e1;text-decoration:none;">hola@citadoc.lat</a></p>
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

function tplReminder3h(d: Record<string, string>): string {
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

<tr><td style="background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);padding:36px 40px 28px;border-bottom:1px solid #fed7aa;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:18px;"><tr>
    <td style="background:#fed7aa;border-radius:100px;padding:5px 14px;">
      <span style="color:#9a3412;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Recordatorio — Hoy</span>
    </td>
  </tr></table>
  <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;">Tu cita es<br>en 3 horas.</h1>
  <p style="margin:0;color:#78716c;font-size:14px;">Confirma para que tu médico sepa que vas.</p>
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

<tr><td style="padding:0 40px 12px;">
  <a href="${confirmUrl}" style="display:block;background:#10b981;color:#fff;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">
    ✓ Confirmo mi asistencia
  </a>
</td></tr>

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

function tplVoiceDoc(label: string, d: Record<string, unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CITADOC</span>
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#062e2b 0%,#0b7c6e 100%);padding:32px 32px 26px;text-align:center;">
  <div style="font-size:34px;line-height:1;margin-bottom:10px;">📄</div>
  <p style="margin:0 0 4px;color:rgba(255,255,255,.6);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Documento médico</p>
  <h1 style="margin:0;color:#fff;font-size:19px;font-weight:700;">Te llegó ${safe(label)}</h1>
</td></tr>
<tr><td style="padding:26px 32px 8px;text-align:center;">
  <p style="margin:0 0 4px;color:#0f172a;font-size:15px;">De <strong>${safe(d.doctor_name)}</strong></p>
  <p style="margin:0;color:#6b7280;font-size:13px;">Para ${safe(d.patient_name)}</p>
</td></tr>
<tr><td style="padding:18px 32px 28px;text-align:center;">
  <p style="margin:0 0 20px;color:#374151;font-size:13px;line-height:1.7;">Abre el PDF adjunto para verlo — está firmado y autorizado digitalmente por tu médico con su usuario y contraseña de CitaDoc.</p>
  ${d.pdf_url ? `<a href="${d.pdf_url}" style="display:inline-block;padding:12px 26px;background:linear-gradient(135deg,#062e2b,#0b7c6e);color:#fff;text-decoration:none;border-radius:50px;font-size:13px;font-weight:700;">📄 Abrir PDF</a>` : ''}
</td></tr>
</table>
</td></tr>
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

function tplOnboardingDay2(nombre: string, titulo: string, slug: string): string {
  const dashUrl = 'https://citadoc.lat/citadoc-dashboard.html'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:40px 44px 32px;border-bottom:1px solid #e2e8f0">
  <p style="margin:0 0 8px;color:#16a34a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tu perfil médico</p>
  <h1 style="margin:0 0 12px;color:#0f1a18;font-size:26px;font-weight:700;line-height:1.2">Tu consulta merece estar completa</h1>
  <p style="margin:0;color:#475569;font-size:15px;line-height:1.6">${titulo} ${nombre}, tienes una cuenta activa en CitaDoc. Completa tu perfil para que los pacientes puedan encontrarte.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr><td style="padding:14px 0;border-bottom:1px solid #f1f5f9">
      <span style="color:#0b7c6e;font-size:18px;margin-right:12px">○</span>
      <span style="color:#334155;font-size:15px">Agrega tu foto de perfil profesional</span>
    </td></tr>
    <tr><td style="padding:14px 0;border-bottom:1px solid #f1f5f9">
      <span style="color:#0b7c6e;font-size:18px;margin-right:12px">○</span>
      <span style="color:#334155;font-size:15px">Escribe una bio breve sobre tu práctica</span>
    </td></tr>
    <tr><td style="padding:14px 0">
      <span style="color:#0b7c6e;font-size:18px;margin-right:12px">○</span>
      <span style="color:#334155;font-size:15px">Configura tu precio de consulta</span>
    </td></tr>
  </table>
  <a href="${dashUrl}" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Completar mi perfil →</a>
</td></tr>
<tr><td style="padding:0 44px 28px;text-align:center">
  <p style="margin:0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8">hola@citadoc.lat</a></p>
</td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplOnboardingDay5(nombre: string, titulo: string, slug: string): string {
  const profileUrl = slug ? `https://citadoc.lat/dr/${slug}` : 'https://citadoc.lat/citadoc-dashboard.html'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:#0f172a;padding:40px 44px 32px;border-bottom:1px solid #1e293b">
  <p style="margin:0 0 8px;color:#63b3ed;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Comunidad CitaDoc</p>
  <h1 style="margin:0 0 12px;color:#f8fafc;font-size:26px;font-weight:700;line-height:1.2">Así usan CitaDoc otros médicos</h1>
  <p style="margin:0;color:rgba(255,255,255,.5);font-size:15px;line-height:1.6">${titulo} ${nombre}, tu perfil digital ya está activo. Aquí lo que están logrando médicos como tú.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr>
      <td width="33%" style="text-align:center;padding:20px 8px;background:#f8fafc;border-radius:12px;margin:4px">
        <div style="color:#0b7c6e;font-size:28px;font-weight:800;line-height:1">5 min</div>
        <div style="color:#64748b;font-size:12px;margin-top:6px">para activar<br>tu perfil</div>
      </td>
      <td width="4%"></td>
      <td width="33%" style="text-align:center;padding:20px 8px;background:#f8fafc;border-radius:12px">
        <div style="color:#0b7c6e;font-size:28px;font-weight:800;line-height:1">24/7</div>
        <div style="color:#64748b;font-size:12px;margin-top:6px">pacientes<br>pueden agendarte</div>
      </td>
      <td width="4%"></td>
      <td width="33%" style="text-align:center;padding:20px 8px;background:#f8fafc;border-radius:12px">
        <div style="color:#0b7c6e;font-size:28px;font-weight:800;line-height:1">0</div>
        <div style="color:#64748b;font-size:12px;margin-top:6px">costo para<br>empezar</div>
      </td>
    </tr>
  </table>
  <a href="${profileUrl}" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Ver mi perfil público →</a>
</td></tr>
<tr><td style="padding:0 44px 28px;text-align:center">
  <p style="margin:0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8">hola@citadoc.lat</a></p>
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

function tplPostConsulta(d: Record<string, any>): string {
  const reviewUrl    = d.review_url || ''
  const doctorNombre = d.doctor_nombre || 'tu médico'
  const paciente     = d.paciente_nombre || ''
  const firstName    = paciente ? ', ' + paciente.split(' ')[0] : ''

  // La calificación (estrellas + comentario) se hace en una página real del
  // frontend de CitaDoc (citadoc.lat/resena/…), no con links por estrella --
  // el email solo necesita UN botón que lleve ahí.

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

<tr><td style="padding-bottom:20px;text-align:center">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span>
</td></tr>

<tr><td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:linear-gradient(135deg,#052a27,#0a3d35);padding:36px 40px 32px;text-align:center">
  <div style="width:48px;height:48px;background:rgba(255,255,255,.1);border-radius:50%;margin:0 auto 18px;line-height:48px;font-size:20px;text-align:center">✓</div>
  <p style="margin:0 0 8px;color:rgba(255,255,255,.45);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Consulta completada</p>
  <h1 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:700;line-height:1.3">Gracias por tu consulta${firstName}.</h1>
  <p style="margin:0;color:rgba(255,255,255,.45);font-size:14px">Con ${doctorNombre}</p>
</td></tr>

<tr><td style="padding:32px 40px 12px;text-align:center">
  <p style="margin:0 0 8px;color:#0f172a;font-size:16px;font-weight:600;line-height:1.5">Esperamos que te hayas sentido<br>en buenas manos.</p>
  <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">¿Cómo fue tu experiencia?</p>

  <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:20px">⭐ Calificar mi consulta</a>

  <p style="margin:0;color:#cbd5e1;font-size:12px">Un toque — 30 segundos. Tu reseña ayuda a otros pacientes.</p>
</td></tr>

<tr><td style="padding:24px 40px 28px;text-align:center;border-top:1px solid #f1f5f9">
  <p style="margin:0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8;text-decoration:none">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplReschedulePrompt(d: Record<string, any>): string {
  const doctorNombre = d.doctor_nombre || 'tu médico'
  const paciente     = d.paciente_nombre || ''
  const firstName    = paciente ? ', ' + paciente.split(' ')[0] : ''
  const profileUrl   = d.profile_url || 'https://citadoc.lat'

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

<tr><td style="padding-bottom:20px;text-align:center">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span>
</td></tr>

<tr><td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">

<tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px 32px;text-align:center">
  <div style="width:48px;height:48px;background:rgba(255,255,255,.08);border-radius:50%;margin:0 auto 18px;line-height:48px;font-size:22px;text-align:center">📅</div>
  <p style="margin:0 0 8px;color:rgba(255,255,255,.4);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Los planes cambian</p>
  <h1 style="margin:0 0 8px;color:#fff;font-size:21px;font-weight:700;line-height:1.3">¿Te gustaría encontrar<br>otro momento${firstName}?</h1>
  <p style="margin:0;color:rgba(255,255,255,.45);font-size:14px">${doctorNombre} tiene disponibilidad.</p>
</td></tr>

<tr><td style="padding:32px 40px 36px;text-align:center">
  <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7">Sabemos que a veces algo surge.<br>Puedes elegir el día y la hora que mejor te quede.</p>

  <table cellpadding="0" cellspacing="0" style="margin:0 auto">
    <tr><td>
      <a href="${profileUrl}" style="display:inline-block;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;text-decoration:none;padding:15px 32px;border-radius:12px;font-size:15px;font-weight:700">
        Ver disponibilidad →
      </a>
    </td></tr>
  </table>

  <p style="margin:24px 0 0;color:#cbd5e1;font-size:12px">Te esperamos cuando puedas.</p>
</td></tr>

<tr><td style="padding:0 40px 28px;text-align:center;border-top:1px solid #f1f5f9">
  <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8;text-decoration:none">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplWeeklyReport(d: Record<string, any>): string {
  const nombre      = d.nombre || ''
  const titulo      = d.titulo || 'Dr.'
  const slug        = d.slug   || ''
  const citasSemana = Number(d.citas_semana) || 0
  const citasTotal  = Number(d.citas_total)  || 0
  const score       = Number(d.score)        || 0
  const insight     = d.insight || 'sin_citas_comparte'
  const dashUrl     = 'https://citadoc.lat/citadoc-dashboard.html'
  const profileUrl  = slug ? `https://citadoc.lat/citadoc-perfil.html?slug=${slug}` : dashUrl

  const scoreBar = Math.round(score / 10) // 0-10 blocks
  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  const INSIGHTS: Record<string, { headline: string; body: string; cta: string; ctaUrl: string; color: string }> = {
    sin_horarios: {
      headline: 'Tu agenda está cerrada para pacientes',
      body:     'Sin horarios configurados, nadie puede agendarte aunque encuentren tu perfil. Toma 3 minutos activar tu disponibilidad.',
      cta:      'Configurar mi horario →',
      ctaUrl:   dashUrl,
      color:    '#ef4444',
    },
    sin_foto: {
      headline: 'Una foto puede duplicar tus citas',
      body:     'Los perfiles con foto profesional generan significativamente más confianza. Los pacientes quieren saber con quién se van a atender.',
      cta:      'Agregar mi foto →',
      ctaUrl:   dashUrl,
      color:    '#f59e0b',
    },
    sin_citas_comparte: {
      headline: 'Comparte tu perfil — es tu link de citas',
      body:     'Tu perfil ya está listo. La forma más rápida de conseguir tu primera cita online es enviarle el link a tus pacientes por WhatsApp.',
      cta:      'Ver mi perfil →',
      ctaUrl:   profileUrl,
      color:    '#0b7c6e',
    },
    perfil_incompleto: {
      headline: `Tu perfil está al ${score}% — complétalo`,
      body:     'Los perfiles completos aparecen primero en el directorio y generan más confianza. Agregar bio, precio y especialidades toma minutos.',
      cta:      'Completar mi perfil →',
      ctaUrl:   dashUrl,
      color:    '#6366f1',
    },
    upsell_pro: {
      headline: `Tuviste ${citasSemana} cita${citasSemana !== 1 ? 's' : ''} esta semana`,
      body:     'Con CitaDoc Pro tendrías historial clínico, recetas digitales y aparecerías primero en búsquedas. Perfecto para el siguiente nivel.',
      cta:      'Ver plan Pro →',
      ctaUrl:   dashUrl,
      color:    '#0b7c6e',
    },
    agenda_vacia: {
      headline: 'Tu agenda está abierta pero sin citas',
      body:     'Tu perfil y horarios están listos. Comparte tu link de citas con tus pacientes actuales para empezar a recibir agendamientos online.',
      cta:      'Compartir mi perfil →',
      ctaUrl:   profileUrl,
      color:    '#0b7c6e',
    },
    excelente: {
      headline: `Excelente semana — ${citasSemana} cita${citasSemana !== 1 ? 's' : ''}`,
      body:     'Tu perfil está generando resultados. Sigue compartiendo tu enlace y considera activar más funciones premium para optimizar tu consulta.',
      cta:      'Ver mi dashboard →',
      ctaUrl:   dashUrl,
      color:    '#10b981',
    },
  }

  const ins = INSIGHTS[insight] || INSIGHTS['sin_citas_comparte']

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<tr><td style="padding-bottom:20px;text-align:center">
  <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span>
</td></tr>

<tr><td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#052a27,#073d36);padding:36px 40px 28px">
  <p style="margin:0 0 6px;color:rgba(255,255,255,.4);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Reporte semanal</p>
  <h1 style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:700;line-height:1.25">${titulo} ${nombre}</h1>
  <p style="margin:0;color:rgba(255,255,255,.45);font-size:14px">Esta semana en CitaDoc</p>
</td></tr>

<!-- Stats row -->
<tr><td style="padding:28px 40px;border-bottom:1px solid #f1f5f9">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="33%" style="text-align:center;padding:16px 8px;background:#f8fafc;border-radius:12px">
      <div style="color:#0b7c6e;font-size:32px;font-weight:800;line-height:1">${citasSemana}</div>
      <div style="color:#64748b;font-size:12px;margin-top:6px;font-weight:600">citas esta semana</div>
    </td>
    <td width="4%"></td>
    <td width="33%" style="text-align:center;padding:16px 8px;background:#f8fafc;border-radius:12px">
      <div style="color:#0b7c6e;font-size:32px;font-weight:800;line-height:1">${citasTotal}</div>
      <div style="color:#64748b;font-size:12px;margin-top:6px;font-weight:600">citas totales</div>
    </td>
    <td width="4%"></td>
    <td width="33%" style="text-align:center;padding:16px 8px;background:#f8fafc;border-radius:12px">
      <div style="color:${scoreColor};font-size:32px;font-weight:800;line-height:1">${score}%</div>
      <div style="color:#64748b;font-size:12px;margin-top:6px;font-weight:600">perfil completo</div>
    </td>
  </tr></table>

  <!-- Score bar -->
  <div style="margin-top:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Completitud del perfil</span>
      <span style="color:${scoreColor};font-size:12px;font-weight:700">${score}%</span>
    </div>
    <div style="background:#e2e8f0;border-radius:100px;height:8px;overflow:hidden">
      <div style="background:${scoreColor};width:${score}%;height:8px;border-radius:100px"></div>
    </div>
  </div>
</td></tr>

<!-- Insight -->
<tr><td style="padding:28px 40px">
  <div style="border-left:3px solid ${ins.color};padding-left:16px;margin-bottom:24px">
    <p style="margin:0 0 8px;color:#0f172a;font-size:16px;font-weight:700;line-height:1.3">${ins.headline}</p>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.7">${ins.body}</p>
  </div>
  <a href="${ins.ctaUrl}" style="display:block;background:${ins.color};color:#fff;text-align:center;padding:15px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">${ins.cta}</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:0 40px 28px;text-align:center;border-top:1px solid #f1f5f9">
  <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8;text-decoration:none">hola@citadoc.lat</a></p>
</td></tr>

</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplPerfilFrioFoto(nombre: string, titulo: string): string {
  const dashUrl = 'https://citadoc.lat/citadoc-dashboard.html'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#fefce8,#fef9c3);padding:40px 44px 32px;border-bottom:1px solid #fde68a">
  <p style="margin:0 0 8px;color:#92400e;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tu perfil</p>
  <h1 style="margin:0 0 12px;color:#0f1a18;font-size:24px;font-weight:700;line-height:1.2">Los pacientes confían más cuando te ven</h1>
  <p style="margin:0;color:#78716c;font-size:15px;line-height:1.6">${titulo} ${nombre}, agregar tu foto de perfil profesional puede duplicar la tasa de agendamiento.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7">Una foto profesional genera confianza inmediata. Solo toma un minuto subirla desde tu panel.</p>
  <a href="${dashUrl}" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Agregar mi foto ahora →</a>
</td></tr>
<tr><td style="padding:0 44px 28px;text-align:center"><p style="margin:0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8">hola@citadoc.lat</a></p></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplPerfilFrioHorarios(nombre: string, titulo: string): string {
  const dashUrl = 'https://citadoc.lat/citadoc-dashboard.html'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:40px 44px 32px;border-bottom:1px solid #bfdbfe">
  <p style="margin:0 0 8px;color:#1e40af;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tu agenda</p>
  <h1 style="margin:0 0 12px;color:#0f1a18;font-size:24px;font-weight:700;line-height:1.2">Tu perfil está activo pero sin horarios</h1>
  <p style="margin:0;color:#475569;font-size:15px;line-height:1.6">${titulo} ${nombre}, sin horarios configurados los pacientes no pueden agendarte.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7">Configurar tu disponibilidad toma menos de 3 minutos. Elige tus días y horarios, y empieza a recibir citas hoy mismo.</p>
  <a href="${dashUrl}" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Configurar mi horario →</a>
</td></tr>
<tr><td style="padding:0 44px 28px;text-align:center"><p style="margin:0;color:#94a3b8;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#94a3b8">hola@citadoc.lat</a></p></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`
}

function tplPerfilFrioSinCitas(nombre: string, titulo: string, slug: string): string {
  const profileUrl = slug ? `https://citadoc.lat/citadoc-perfil.html?slug=${slug}` : 'https://citadoc.lat/citadoc-dashboard.html'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:20px;text-align:center"><span style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">CITADOC</span></td></tr>
<tr><td style="background:#0f172a;border-radius:20px;overflow:hidden;border:1px solid #1e293b">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:40px 44px 32px;border-bottom:1px solid #1e293b">
  <div style="display:inline-block;background:rgba(14,157,140,.15);border:1px solid rgba(14,157,140,.3);border-radius:100px;padding:5px 14px;margin-bottom:20px">
    <span style="color:#4dd9c8;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Tu primera cita te espera</span>
  </div>
  <h1 style="margin:0 0 12px;color:#f8fafc;font-size:24px;font-weight:700;line-height:1.2">Lleva pacientes a tu perfil</h1>
  <p style="margin:0;color:rgba(255,255,255,.45);font-size:15px;line-height:1.6">${titulo} ${nombre}, tu perfil está listo. El siguiente paso es compartirlo con tus pacientes actuales.</p>
</td></tr>
<tr><td style="padding:32px 44px">
  <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7">Comparte el enlace de tu perfil por WhatsApp con tus pacientes. Es la forma más rápida de conseguir tu primera cita online.</p>
  <div style="background:#1e293b;border-radius:12px;padding:16px 20px;margin-bottom:24px">
    <p style="margin:0 0 6px;color:rgba(255,255,255,.3);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Tu enlace de citas</p>
    <p style="margin:0;color:#4dd9c8;font-size:14px;font-weight:600;word-break:break-all">${profileUrl}</p>
  </div>
  <a href="${profileUrl}" style="display:block;background:linear-gradient(135deg,#085f54,#0b7c6e);color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none">Ver mi perfil →</a>
</td></tr>
<tr><td style="padding:0 44px 28px;text-align:center"><p style="margin:0;color:#475569;font-size:12px">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#475569">hola@citadoc.lat</a></p></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>`
}

// ── Growth Welcome ────────────────────────────────────────────────────────────
function tplGrowthWelcome(nombre: string, state: string, bioGenerada: string | null, slug: string): string {
  const profileUrl = `https://citadoc.lat/citadoc-perfil.html?slug=${slug}`
  const panelUrl   = 'https://citadoc.lat/citadoc-panel.html'

  const stateConfig: Record<string, { headline: string; body: string; cta: string; ctaUrl: string }> = {
    NEW_EMPTY: {
      headline: 'Tu perfil está listo. Activémoslo juntos.',
      body: 'La IA ya generó tu bio profesional. Solo falta tu foto y tus horarios para que los pacientes puedan agendarte hoy.',
      cta: 'Completar mi perfil →',
      ctaUrl: panelUrl,
    },
    NEW_PARTIAL: {
      headline: 'Buen comienzo. Falta poco.',
      body: 'Tu especialidad ya está. Agrega tu foto — es lo que más genera confianza en los pacientes — y configura tus horarios.',
      cta: 'Agregar foto y horarios →',
      ctaUrl: panelUrl,
    },
    HIGH_INTENT: {
      headline: 'Tu perfil se ve muy bien.',
      body: 'Solo falta configurar tu disponibilidad para que los pacientes puedan agendarte. Toma menos de 3 minutos.',
      cta: 'Activar mi agenda →',
      ctaUrl: panelUrl,
    },
    LIKELY_PRO: {
      headline: 'Perfil fuerte. Empeza a recibir pacientes hoy.',
      body: 'Tu perfil está casi completo. Ya podés recibir citas online desde CitaDoc.',
      cta: 'Ver mi perfil público →',
      ctaUrl: profileUrl,
    },
  }

  const cfg = stateConfig[state] || stateConfig['NEW_EMPTY']
  const bioSection = bioGenerada
    ? `<tr><td style="padding:20px 32px;background:#f0fdf9;border-radius:12px;margin:0 32px;">
        <p style="margin:0 0 6px;color:#047857;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">✨ Bio generada por IA</p>
        <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.6;font-style:italic;">"${bioGenerada}"</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:12px;">Podés editarla en tu panel cuando quieras.</p>
      </td></tr><tr><td style="height:24px;"></td></tr>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bienvenido a CitaDoc</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#052a27,#0b7c6e);border-radius:16px 16px 0 0;padding:32px 32px 28px;text-align:center;">
    <p style="margin:0 0 4px;color:rgba(255,255,255,.5);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">CitaDoc</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.3;">${cfg.headline}</h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="background:#fff;padding:32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td>
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">Hola <strong>${nombre}</strong>, bienvenido a CitaDoc.</p>
        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">${cfg.body}</p>
      </td></tr>
      ${bioSection}
      <tr><td style="text-align:center;padding-bottom:8px;">
        <a href="${cfg.ctaUrl}" style="display:inline-block;background:#0b7c6e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">${cfg.cta}</a>
      </td></tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">CitaDoc · <a href="mailto:hola@citadoc.lat" style="color:#0b7c6e;text-decoration:none;">hola@citadoc.lat</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function tplWebGenerada(d: { nombre: string; especialidad: string; ciudad: string; web_url: string; is_real: boolean }): string {
  const badge   = d.is_real ? 'PÁGINA WEB ACTIVA' : 'DEMO'
  const badgeColor = d.is_real ? '#0b7c6e' : '#7c3aed'
  const badgeBg    = d.is_real ? 'rgba(11,124,110,.12)' : 'rgba(124,58,237,.12)'
  const headline   = d.is_real
    ? 'Tu página web médica ya está activa.'
    : 'Tu demo médica está lista para ver.'
  const sub = d.is_real
    ? `Hola <strong>${d.nombre}</strong>, tu presencia digital en CitaDoc está en vivo. Comparte tu enlace con pacientes y empieza a recibir citas.`
    : `Hola <strong>${d.nombre}</strong>, generamos una demo de tu sitio web médico. Es solo una muestra — escríbenos para activarla con tus datos reales.`
  const cta = d.is_real ? 'Ver mi sitio web →' : 'Ver mi demo →'
  const footer = d.is_real
    ? 'Tu web está activa en citadoc.lat. Para editar información, contáctanos.'
    : 'Esta es una demo. Para activar tu web real escríbenos a hola@citadoc.lat'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu web CitaDoc</title></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:48px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(145deg,#0d1b2a 0%,#0b2d26 100%);border-radius:20px 20px 0 0;padding:40px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,.06);">
    <div style="display:inline-block;background:${badgeBg};border:1px solid ${badgeColor};border-radius:20px;padding:5px 14px;margin-bottom:24px;">
      <span style="color:${badgeColor};font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;">${badge}</span>
    </div>
    <h1 style="margin:0 0 10px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-.3px;">${headline}</h1>
    <p style="margin:0;color:rgba(255,255,255,.4);font-size:13px;">${d.especialidad}${d.ciudad ? ' · ' + d.ciudad : ''}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#111b29;padding:36px 40px;">
    <p style="margin:0 0 28px;color:rgba(255,255,255,.75);font-size:15px;line-height:1.7;">${sub}</p>

    <!-- URL card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 20px;">
        <p style="margin:0 0 6px;color:rgba(255,255,255,.3);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Tu enlace</p>
        <a href="${d.web_url}" style="color:#5dba8a;font-size:14px;font-family:monospace;text-decoration:none;word-break:break-all;">${d.web_url}</a>
      </td></tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="text-align:center;">
        <a href="${d.web_url}" style="display:inline-block;background:linear-gradient(135deg,#0b7c6e,#0ea08f);color:#fff;text-decoration:none;padding:15px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:.2px;">${cta}</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0d1520;border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,.05);">
    <p style="margin:0 0 6px;color:rgba(255,255,255,.18);font-size:12px;line-height:1.6;">${footer}</p>
    <p style="margin:0;color:rgba(255,255,255,.12);font-size:11px;">CitaDoc Health Network · <a href="https://citadoc.lat" style="color:rgba(255,255,255,.25);text-decoration:none;">citadoc.lat</a></p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

// ── CENTER FOLLOWUP TEMPLATES ─────────────────────────────────────────────────
function centerBase(centerName: string, preheader: string, headerBg: string, badgeColor: string, badgeBg: string, badgeText: string, body: string): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${safe(preheader)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:36px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding-bottom:16px;text-align:center;">
  <span style="font-size:11px;font-weight:800;color:#0f172a;letter-spacing:2px;text-transform:uppercase;">${safe(centerName)}</span>
  <span style="font-size:10px;color:#94a3b8;margin-left:6px;">· vía CitaDoc</span>
</td></tr>
<tr><td style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:${headerBg};padding:28px 32px 24px;">
  <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
    <td style="background:${badgeBg};border-radius:100px;padding:4px 12px;">
      <span style="color:${badgeColor};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${safe(badgeText)}</span>
    </td></tr></table>
  <p style="margin:0;color:rgba(255,255,255,.7);font-size:13px;">${safe(preheader)}</p>
</td></tr>
${body}
</table></td></tr>
<tr><td style="padding:16px 0 0;text-align:center;">
  <p style="margin:0;color:#cbd5e1;font-size:11px;">CitaDoc · <a href="https://citadoc.lat" style="color:#cbd5e1;text-decoration:none;">citadoc.lat</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function tplCenterConfirm(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const body = `
<tr><td style="padding:28px 32px 8px;">
  <p style="margin:0 0 20px;color:#0f172a;font-size:16px;font-weight:700;">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">Recibimos tu solicitud. El equipo de <strong>${safe(d.center_name)}</strong> la revisará y te confirmará a la brevedad.</p>
  ${d.fecha || d.hora || d.doctor_name || d.servicios ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
    <tr><td style="padding:16px 20px;">
      ${d.fecha ? `<p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Fecha y hora</p><p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">${safe(d.fecha)}${d.hora?` · <strong>${safe(d.hora)}</strong>`:''}</p>` : ''}
      ${d.doctor_name ? `<p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Médico tratante</p><p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#0f172a;">${safe(d.doctor_name)}</p>` : ''}
      ${d.servicios ? `<p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Servicio</p><p style="margin:0;font-size:13px;color:#374151;">${safe(d.servicios)}</p>` : ''}
    </td></tr>
  </table>` : ''}
  ${d.center_phone ? `<p style="margin:0 0 24px;color:#374151;font-size:13px;">¿Preguntas? Escríbenos: <strong>${safe(d.center_phone)}</strong></p>` : ''}
</td></tr>
<tr><td style="padding:0 32px 28px;">
  <p style="margin:0;color:#94a3b8;font-size:11px;font-style:italic;">Este mensaje fue generado automáticamente por CitaDoc. No es necesario responder.</p>
</td></tr>`
  return centerBase(String(d.center_name||''), `Solicitud recibida en ${String(d.center_name||'')}`, 'linear-gradient(135deg,#0f172a,#1e3a5f)', '#93c5fd', 'rgba(147,197,253,.15)', '✓ Solicitud recibida', body)
}

function tplCenterAdminLead(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const confirmUrl = d.lead_id
    ? `https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/center-followup?action=confirm&lead_id=${safe(d.lead_id)}`
    : null
  const body = `
<tr><td style="padding:24px 32px 8px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${[['Paciente',String(d.patient_name||'')],['Teléfono',String(d.telefono||'—')],['Email',String(d.email||'—')],['Fecha',String(d.fecha||'Sin fecha')],['Hora',String(d.hora||'Sin hora')],['Servicios',String(d.servicios||'—')],['Total est.',String(d.total||'—')]].map(([l,v],i)=>`
    <tr><td style="padding:8px 0;${i>0?'border-top:1px solid #f1f5f9;':''}">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">${safe(l)}</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${safe(v)}</p>
    </td></tr>`).join('')}
  </table>
</td></tr>
${confirmUrl ? `<tr><td style="padding:0 32px 24px;">
  <a href="${confirmUrl}" style="display:block;background:#16a34a;color:#fff;text-align:center;padding:13px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-top:12px;">
    ✓ Confirmar asistencia del paciente
  </a>
  <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;text-align:center;">Un clic marca al paciente como atendido y envía el email de post-visita</p>
</td></tr>` : ''}`
  return centerBase(String(d.center_name||''), `Nueva reserva de ${String(d.patient_name||'')}`, 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', '#a5b4fc', 'rgba(165,180,252,.15)', '🔔 Nueva reserva', body)
}

function tplCenterReminder(d: Record<string,unknown>): string {
  const safe       = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const is3h       = d.es_3h === true
  const isConfirm  = !d.confirm_url  // sin botones = email de confirmación inicial
  const doctorName = safe(d.doctor_name || d.center_name || '')
  const confirmUrl = safe(d.confirm_url||'')
  const cancelUrl  = safe(d.cancel_url||'')
  const horasLabel = is3h ? '3 horas' : '12 horas'
  const headline   = isConfirm
    ? `Tu turno con <strong>${doctorName}</strong> está confirmado.`
    : `Faltan <strong>${horasLabel}</strong> para tu turno con <strong>${doctorName}</strong>.`
  const badge = isConfirm ? '📅 Turno confirmado' : is3h ? '⚡ Faltan 3 horas' : '⏰ Faltan 12 horas'

  const body = `
<tr><td style="padding:28px 32px 20px;text-align:center;">
  <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0;color:#0f172a;font-size:20px;font-weight:700;line-height:1.4;">${headline}</p>
</td></tr>

<tr><td style="padding:0 32px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;">
    <tr><td style="padding:18px 20px;">
      ${d.fecha ? `<p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Fecha</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">${safe(d.fecha)}</p>` : ''}
      ${d.hora ? `<p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Hora</p>
      <p style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;">${safe(d.hora)}</p>` : ''}
      ${d.servicios ? `<p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Servicio</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${safe(d.servicios)}</p>` : ''}
    </td></tr>
  </table>
</td></tr>

${confirmUrl ? `<tr><td style="padding:20px 32px 8px;">
  <a href="${confirmUrl}" style="display:block;background:#0f172a;color:#fff;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
    ✓ Confirmar mi asistencia
  </a>
</td></tr>
<tr><td style="padding:0 32px 8px;">
  <a href="${cancelUrl}" style="display:block;background:#f8fafc;color:#64748b;text-align:center;padding:12px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;border:1.5px solid #e2e8f0;">
    ✕ No puedo asistir — cancelar
  </a>
</td></tr>` : ''}
<tr><td style="padding:16px 32px 28px;text-align:center;">
  <p style="margin:0;color:#94a3b8;font-size:11px;">${confirmUrl ? 'Un clic confirma o cancela tu turno.' : 'Te esperamos.'}</p>
</td></tr>`

  return centerBase(String(d.center_name||''), badge, 'linear-gradient(135deg,#0f172a,#1e293b)', '#e2e8f0', 'rgba(226,232,240,.12)', badge, body)
}

function tplCenterNoShow(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const body = `
<tr><td style="padding:28px 32px;">
  <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">Notamos que no pudiste asistir a tu turno en <strong>${safe(d.center_name)}</strong>. ¡No hay problema! Podés reagendar cuando quieras.</p>
  ${d.booking_url ? `<tr></tr><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding-bottom:20px;"><a href="${safe(d.booking_url)}" style="display:block;background:#0f172a;color:#fff;text-align:center;padding:14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Reservar nuevo turno →</a></td></tr></table>` : ''}
  ${d.center_phone ? `<p style="margin:0;color:#374151;font-size:13px;">O contactanos directamente: <strong>${safe(d.center_phone)}</strong></p>` : ''}
</td></tr>`
  return centerBase(String(d.center_name||''), 'Te esperamos — reagendá tu turno', 'linear-gradient(135deg,#0f172a,#1e293b)', '#94a3b8', 'rgba(148,163,184,.15)', '👋 ¿Cómo estás?', body)
}

function tplCenterPostVisita(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const body = `
<tr><td style="padding:28px 32px;">
  <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;">Gracias por visitarnos, ${safe(d.patient_name)} ✨</p>
  <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">Fue un gusto atenderte en <strong>${safe(d.center_name)}</strong>. Esperamos que te hayas sentido bien y que el servicio haya superado tus expectativas.</p>
  ${d.booking_url ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr><td><a href="${safe(d.booking_url)}" style="display:block;background:#0f172a;color:#fff;text-align:center;padding:13px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">Reservar próximo turno</a></td></tr></table>` : ''}
  <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">Podés compartirnos cómo fue tu experiencia — tu opinión nos ayuda a seguir mejorando.</p>
</td></tr>`
  return centerBase(String(d.center_name||''), `Gracias por visitarnos`, 'linear-gradient(135deg,#064e3b,#065f46)', '#6ee7b7', 'rgba(110,231,183,.15)', '❤️ Post-visita', body)
}

function tplLabOrderConfirm(d: Record<string,unknown>): string {
  const safe  = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const exams = String(d.exam_list||'').split('||').filter(Boolean)
  const body  = `
<tr><td style="padding:28px 32px 20px;text-align:center">
  <p style="margin:0 0 6px;color:rgba(255,255,255,.5);font-size:12px;font-weight:600;letter-spacing:.5px">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0;color:#fff;font-size:21px;font-weight:700;line-height:1.35">Tu orden de laboratorio<br>está <strong>confirmada.</strong></p>
</td></tr>
<tr><td style="padding:0 32px 24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
    <tr><td style="padding:18px 20px 0">
      ${d.fecha_estudio ? `<p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Fecha del estudio</p>
      <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0f172a">${safe(d.fecha_estudio)}${d.hora_estudio ? ' · '+safe(d.hora_estudio) : ''}</p>` : ''}
      ${d.doctor_name ? `<p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Médico solicitante</p>
      <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#0f172a">${safe(d.doctor_name)}</p>` : ''}
      ${exams.length ? `<p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Estudios solicitados</p>
      ${exams.map(e => `<div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #f1f5f9;font-size:13px">
        <span style="font-weight:600;color:#0f172a">${safe(e.split('|')[0]||e)}</span>
        <span style="font-weight:700;color:#0b7c6e">${safe(e.split('|')[1]||'')}</span>
      </div>`).join('')}` : ''}
    </td></tr>
    <tr><td style="padding:14px 20px;background:#f0fdf4;border-top:2px solid #d1fae5">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:.5px">Total</span>
        <span style="font-size:22px;font-weight:800;color:#0b7c6e">${safe(d.total||'')}</span>
      </div>
    </td></tr>
  </table>
</td></tr>
${d.center_phone ? `<tr><td style="padding:0 32px 16px;text-align:center">
  <p style="margin:0;font-size:13px;color:rgba(255,255,255,.6)">¿Consultas? <strong style="color:#fff">${safe(d.center_phone)}</strong></p>
</td></tr>` : ''}
<tr><td style="padding:0 32px 28px;text-align:center">
  <p style="margin:0;color:rgba(255,255,255,.35);font-size:11px">Te esperamos · ${safe(d.center_name||'')}</p>
</td></tr>`
  return centerBase(String(d.center_name||''), 'Orden de laboratorio confirmada', 'linear-gradient(135deg,#052a27,#083d2f)', '#6ee7b7', 'rgba(110,231,183,.15)', '🔬 Laboratorio', body)
}

function tplLabOrderRealizado(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const body = `
<tr><td style="padding:28px 32px 20px;text-align:center">
  <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0;color:#0f172a;font-size:20px;font-weight:700;line-height:1.4">Gracias por realizarte<br><strong>tus estudios.</strong></p>
</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center">
  <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7">Fue un placer atenderte en <strong>${safe(d.center_name)}</strong>.<br>Cualquier consulta, estamos disponibles.</p>
  ${d.center_phone ? `<p style="margin:0;font-size:14px;font-weight:700;color:#0f172a">${safe(d.center_phone)}</p>` : ''}
</td></tr>
<tr><td style="padding:0 32px 28px;text-align:center">
  <p style="margin:0;color:#94a3b8;font-size:11px">${safe(d.center_name||'')} · CitaDoc</p>
</td></tr>`
  return centerBase(String(d.center_name||''), 'Gracias por tus estudios', 'linear-gradient(135deg,#052a27,#0a3d35)', '#6ee7b7', 'rgba(110,231,183,.12)', '✓ Completado', body)
}

function tplLabResult(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const body = `
<tr><td style="padding:28px 32px 20px;text-align:center">
  <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0;color:#0f172a;font-size:20px;font-weight:700;line-height:1.4">Tus resultados de<br><strong>laboratorio están listos.</strong></p>
</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center">
  <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7">Encontrás tus resultados adjuntos<br>en este correo de parte de <strong>${safe(d.center_name)}</strong>.</p>
  ${d.center_phone ? `<p style="margin:0;font-size:14px;font-weight:700;color:#0f172a">${safe(d.center_phone)}</p>` : ''}
</td></tr>
<tr><td style="padding:0 32px 28px;text-align:center">
  <p style="margin:0;color:#94a3b8;font-size:11px">${safe(d.center_name||'')} · CitaDoc</p>
</td></tr>`
  return centerBase(String(d.center_name||''), 'Resultados de laboratorio', 'linear-gradient(135deg,#052a27,#083d2f)', '#6ee7b7', 'rgba(110,231,183,.15)', '🔬 Resultados', body)
}

function tplLabOrderCancelado(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const bookingUrl = d.booking_url || ''
  const body = `
<tr><td style="padding:28px 32px 20px;text-align:center">
  <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600">Hola, ${safe(d.patient_name)} 👋</p>
  <p style="margin:0;color:#0f172a;font-size:20px;font-weight:700;line-height:1.4">Tu orden de laboratorio<br>fue cancelada.</p>
</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center">
  <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7">Entendemos que los planes cambian.<br>Podés reagendar cuando quieras.</p>
  ${bookingUrl ? `<a href="${safe(bookingUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700">Reagendar →</a>` : ''}
</td></tr>
<tr><td style="padding:0 32px 28px;text-align:center">
  <p style="margin:0;color:#94a3b8;font-size:11px">${safe(d.center_name||'')} · CitaDoc</p>
</td></tr>`
  return centerBase(String(d.center_name||''), 'Orden cancelada', 'linear-gradient(135deg,#0f172a,#1e293b)', '#e2e8f0', 'rgba(226,232,240,.1)', '📅 Cancelado', body)
}

function tplCenterCoupon(d: Record<string,unknown>): string {
  const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const code = d.coupon_code || 'CITADOC10'
  const discount = d.discount || '10% de descuento'
  const body = `
<tr><td style="padding:28px 32px;">
  <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;">Hola, ${safe(d.patient_name)} 🎁</p>
  <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">Tenemos un regalo especial para vos de parte de <strong>${safe(d.center_name)}</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fdf4ff,#ede9fe);border:2px solid #e9d5ff;border-radius:14px;margin-bottom:20px;">
    <tr><td style="padding:20px 24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:2px;">Tu cupón exclusivo</p>
      <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#4c1d95;letter-spacing:3px;">${safe(code)}</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#6b21a8;">${safe(discount)}</p>
    </td></tr>
  </table>
  ${d.booking_url ? `<a href="${safe(d.booking_url as string)}" style="display:block;background:#7c3aed;color:#fff;text-align:center;padding:13px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Reservar con descuento →</a>` : ''}
  ${d.expiry ? `<p style="margin:12px 0 0;font-size:11px;color:#94a3b8;text-align:center;">Válido hasta: ${safe(d.expiry)}</p>` : ''}
</td></tr>`
  return centerBase(String(d.center_name||''), `Un regalo de ${String(d.center_name||'')}`, 'linear-gradient(135deg,#4c1d95,#7c3aed)', '#e9d5ff', 'rgba(233,213,255,.15)', '🎁 Cupón de descuento', body)
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string, attachments?: {filename: string, content: string}[]) {
  if (!RESEND_API_KEY) { console.warn('[send-email] No RESEND_API_KEY'); return }
  // deno-lint-ignore no-explicit-any
  const body: Record<string, any> = { from: FROM, to: [to], subject, html }
  if (attachments?.length) body.attachments = attachments
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) console.warn('[send-email] Resend error:', res.status, await res.text())
  else console.log('[send-email] Sent to:', to, '|', subject)
}

async function pdfToBase64(url: string): Promise<string|null> {
  try {
    console.log('[pdf-attach] fetching:', url)
    const r = await fetch(url)
    console.log('[pdf-attach] status:', r.status, 'size:', r.headers.get('content-length'))
    if (!r.ok) { console.warn('[pdf-attach] fetch failed:', r.status); return null }
    const buf = await r.arrayBuffer()
    console.log('[pdf-attach] buf size:', buf.byteLength)
    if (buf.byteLength > 8_000_000) { console.warn('[pdf-attach] PDF too large, skipping attachment'); return null }
    const bytes = new Uint8Array(buf)
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const b64 = btoa(bin)
    console.log('[pdf-attach] b64 length:', b64.length)
    return b64
  } catch(e) { console.warn('[pdf-attach] error:', e); return null }
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const body = await req.json()
    const { type, to_email, ...data } = body

    if (!to_email) return new Response(JSON.stringify({ error: 'missing to_email' }), { status: 400, headers: CORS })

    // ── Auth: 3 niveles por identidad real, nunca por presencia de header ──────
    const authHeader = req.headers.get('Authorization')
    const publicKey  = req.headers.get('x-citadoc-public-key')
    const VALID_PUBLIC_KEY = Deno.env.get('PUBLIC_BOOKING_KEY') || 'citadoc-public-2026'

    const ip = getClientIp(req)

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim()
      const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

      if (token === SUPABASE_SRV) {
        // service_role -- acceso completo, sin rate limit (crons ya
        // acotados por su propia naturaleza -- 1x/hora o 1x/dia)
      } else {
        const sbAuth = createClient(Deno.env.get('SUPABASE_URL')!, SUPABASE_SRV, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data: userData, error: userErr } = await sbAuth.auth.getUser(token)
        if (userErr || !userData?.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
        }
        if (!USER_ALLOWED_TYPES.includes(type)) {
          return new Response(JSON.stringify({ error: 'Forbidden type for user access' }), { status: 403, headers: CORS })
        }
        const rl = await checkRateLimit('send_email_user', userData.user.id, ip)
        if (!rl.allowed) {
          return new Response(JSON.stringify({ error: rl.reason }), { status: 429, headers: CORS })
        }
      }
    } else {
      // Sin Authorization -- unica via es la public key, y solo para los tipos publicos
      if (publicKey !== VALID_PUBLIC_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
      }
      if (!PUBLIC_ALLOWED_TYPES.includes(type)) {
        return new Response(JSON.stringify({ error: 'Forbidden type for public access' }), { status: 403, headers: CORS })
      }
      const rl = await checkRateLimit('send_email_public', null, ip)
      if (!rl.allowed) {
        return new Response(JSON.stringify({ error: rl.reason }), { status: 429, headers: CORS })
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
        const attachments: {filename: string, content: string}[] = []
        const pdfMap = [
          { key: 'pdf_receta',       name: 'receta-medica.pdf' },
          { key: 'pdf_imagenes',     name: 'orden-imagenes.pdf' },
          { key: 'pdf_laboratorios', name: 'orden-laboratorios.pdf' },
          { key: 'pdf_indicaciones', name: 'indicaciones.pdf' },
          { key: 'pdf_url',          name: 'documentos-medicos.pdf' },
        ]
        for (const p of pdfMap) {
          if (data[p.key]) {
            const b64 = await pdfToBase64(data[p.key] as string)
            if (b64) attachments.push({ filename: p.name, content: b64 })
          }
        }
        await sendEmail(to_email, subject, tplIndicaciones(data as Record<string, unknown>), attachments.length ? attachments : undefined)
        break
      }

      case 'docs': {
        const subject = `Documentos de tu consulta — ${data.doctor_name || 'tu médico'}`
        await sendEmail(to_email, subject, tplDocs(data.html_body || ''))
        break
      }

      // Un documento clínico = un PDF firmado = un email. Usado por el
      // asistente de voz: cada acción (receta/laboratorio/imagenes) manda
      // su propio correo con su propio adjunto, nunca contenido inline.
      case 'voice_doc': {
        const KIND_LABEL: Record<string, string> = {
          receta:      'tu receta',
          laboratorio: 'tu orden de laboratorio',
          imagenes:    'tu orden de estudios de imagen',
          resumen:     'el resumen de tu consulta'
        }
        // 'kinds' es la forma normal (uno o varios documentos en un solo
        // PDF); 'kind' (singular) se mantiene por compatibilidad.
        const kinds: string[] = Array.isArray(data.kinds) ? data.kinds as string[] : (data.kind ? [String(data.kind)] : [])
        const labels = kinds.map(k => KIND_LABEL[k] || 'un documento')
        const label = labels.length > 1
          ? labels.slice(0, -1).join(', ') + ' y ' + labels[labels.length - 1]
          : (labels[0] || 'un documento')
        const subject = `Te llegó ${label} — ${data.doctor_name || 'tu médico'}`
        const attachments: {filename: string, content: string}[] = []
        if (data.pdf_url) {
          const b64 = await pdfToBase64(data.pdf_url as string)
          if (b64) attachments.push({ filename: `${kinds.join('-') || 'documento'}.pdf`, content: b64 })
        }
        await sendEmail(to_email, subject, tplVoiceDoc(label, data as Record<string, unknown>), attachments.length ? attachments : undefined)
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

      case 'reminder_3h': {
        const subject = `Tu cita con ${data.doctor_name || 'tu médico'} es en 3 horas`
        await sendEmail(to_email, subject, tplReminder3h(data))
        break
      }

      case 'web_generada': {
        const isReal = data.is_real === true || data.is_real === 'true'
        const subject = isReal
          ? `${data.nombre || 'Tu web'} — Tu página web médica ya está activa en CitaDoc`
          : `${data.nombre || 'Tu web'} — Tu demo médica está lista`
        await sendEmail(to_email, subject, tplWebGenerada({
          nombre:      data.nombre      || '',
          especialidad: data.especialidad || '',
          ciudad:      data.ciudad      || '',
          web_url:     data.web_url     || '',
          is_real:     isReal,
        }))
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

      case 'onboarding_day2': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu perfil médico te está esperando`
        await sendEmail(to_email, subject, tplOnboardingDay2(data.nombre || '', data.titulo || 'Dr.', data.slug || ''))
        break
      }

      case 'onboarding_day5': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, así están usando CitaDoc otros médicos`
        await sendEmail(to_email, subject, tplOnboardingDay5(data.nombre || '', data.titulo || 'Dr.', data.slug || ''))
        break
      }

      case 'reschedule_prompt': {
        const subject = `${data.doctor_nombre || 'Tu médico'} tiene disponibilidad — ¿reagendamos?`
        await sendEmail(to_email, subject, tplReschedulePrompt(data))
        break
      }

      case 'review_request':
      case 'post_consulta': {
        const subject = `¿Cómo fue tu consulta con ${data.doctor_nombre || 'tu médico'}?`
        await sendEmail(to_email, subject, tplPostConsulta(data))
        break
      }

      case 'weekly_report': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu semana en CitaDoc`
        await sendEmail(to_email, subject, tplWeeklyReport(data))
        break
      }

      case 'perfil_frio_foto': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu perfil necesita una foto`
        await sendEmail(to_email, subject, tplPerfilFrioFoto(data.nombre || '', data.titulo || 'Dr.'))
        break
      }

      case 'perfil_frio_horarios': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, configura tu horario y empieza a recibir citas`
        await sendEmail(to_email, subject, tplPerfilFrioHorarios(data.nombre || '', data.titulo || 'Dr.'))
        break
      }

      case 'perfil_frio_sin_citas': {
        const subject = `${data.titulo || 'Dr.'} ${data.nombre || ''}, tu primera cita online está a un paso`
        await sendEmail(to_email, subject, tplPerfilFrioSinCitas(data.nombre || '', data.titulo || 'Dr.', data.slug || ''))
        break
      }

      case 'growth_welcome': {
        const state = data.onboarding_state || 'NEW_EMPTY'
        const stateLabel: Record<string, string> = {
          NEW_EMPTY:   'Tu perfil está listo — activémoslo juntos',
          NEW_PARTIAL:  'Buen comienzo en CitaDoc',
          HIGH_INTENT:  'Tu perfil se ve muy bien',
          LIKELY_PRO:   'Perfil fuerte — empeza a recibir pacientes',
        }
        const subject = stateLabel[state] || 'Bienvenido a CitaDoc'
        await sendEmail(
          to_email,
          subject,
          tplGrowthWelcome(data.medico_nombre || '', state, data.bio_generada || null, data.medico_slug || '')
        )
        break
      }

      // ── CENTER FOLLOWUP TEMPLATES ────────────────────────────────────────────
      case 'center_confirm': {
        const subject = `Tu solicitud en ${data.center_name || 'el centro'} fue recibida ✓`
        await sendEmail(to_email, subject, tplCenterConfirm(data as Record<string,unknown>))
        break
      }
      case 'center_admin_lead': {
        const subject = `Nueva reserva — ${data.patient_name || 'Paciente'}`
        await sendEmail(to_email, subject, tplCenterAdminLead(data as Record<string,unknown>))
        break
      }
      case 'center_reminder': {
        const subject = `Recordatorio: tu turno es mañana — ${data.center_name || ''}`
        await sendEmail(to_email, subject, tplCenterReminder(data as Record<string,unknown>))
        break
      }
      case 'center_noshow': {
        const subject = `¿Cómo estás? Queremos reagendarte — ${data.center_name || ''}`
        await sendEmail(to_email, subject, tplCenterNoShow(data as Record<string,unknown>))
        break
      }
      case 'center_postvista': {
        const subject = `Gracias por visitarnos — ${data.center_name || ''}`
        await sendEmail(to_email, subject, tplCenterPostVisita(data as Record<string,unknown>))
        break
      }
      case 'center_coupon': {
        const subject = `🎁 Un regalo de ${data.center_name || 'tu centro médico'}`
        await sendEmail(to_email, subject, tplCenterCoupon(data as Record<string,unknown>))
        break
      }

      case 'lab_order_confirm': {
        const subject = `Orden de laboratorio confirmada — ${data.center_name||'tu centro médico'}`
        await sendEmail(to_email, subject, tplLabOrderConfirm(data as Record<string,unknown>))
        break
      }

      case 'lab_order_realizado': {
        const subject = `Gracias por tus estudios — ${data.center_name||'tu centro médico'}`
        await sendEmail(to_email, subject, tplLabOrderRealizado(data as Record<string,unknown>))
        break
      }

      case 'lab_order_cancelado': {
        const subject = `Tu orden fue cancelada — ${data.center_name||'tu centro médico'}`
        await sendEmail(to_email, subject, tplLabOrderCancelado(data as Record<string,unknown>))
        break
      }

      case 'lab_result': {
        const subject = `Tus resultados de laboratorio — ${data.center_name||'tu centro médico'}`
        const atts = (data.attachments as {filename:string,content:string}[]|undefined) || []
        await sendEmail(to_email, subject, tplLabResult(data as Record<string,unknown>), atts.length ? atts : undefined)
        break
      }

      // Solo alcanzable via service_role (abuse-detector) -- no esta en
      // USER_ALLOWED_TYPES ni PUBLIC_ALLOWED_TYPES a proposito. Nunca
      // incluye tokens/PDFs/body clinico, solo conteos y el nombre de la
      // senal -- ver abuse-detector para el detalle de cada chequeo.
      case 'security_alert': {
        const safe = (s: unknown) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        const level = safe(data.level || '')
        const label = safe(data.label || 'Actividad anómala')
        const subject = `[CitaDoc ALERTA ${level}] ${label}`
        const html = `<div style="font-family:Arial,sans-serif;padding:24px;color:#1a1a1a;max-width:600px">
          <h2 style="margin:0 0 12px">${label}</h2>
          <p style="margin:0 0 8px"><strong>Nivel:</strong> ${level}</p>
          <p style="margin:0 0 8px;white-space:pre-wrap">${safe(data.detail || '')}</p>
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px">Generado automáticamente por abuse-detector — ${new Date().toISOString()}</p>
        </div>`
        await sendEmail(to_email, subject, html)
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
