import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_TOKEN  = Deno.env.get('ADMIN_TOKEN') || '7citadoc7'
const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-admin-token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const AGENTS = [
  { id:'generate-website-config',  label:'Website Config',       cat:'IA',      desc:'Genera identidad visual y DNA del sitio médico' },
  { id:'generate-demo',            label:'Demo Generator',        cat:'IA',      desc:'Produce el demo web del médico' },
  { id:'medical-soap-extract',     label:'SOAP Extract',          cat:'IA',      desc:'Extrae SOAP notes de consultas clínicas' },
  { id:'patient-summary',          label:'Patient Summary',       cat:'IA',      desc:'Resume historial del paciente' },
  { id:'triage-especialidad',      label:'Triage',                cat:'IA',      desc:'Sugiere especialidad según síntomas del paciente' },
  { id:'generate-citadoc-content', label:'Content Gen',           cat:'IA',      desc:'Genera contenido para CitaDoc' },
  { id:'send-email',               label:'Send Email',            cat:'Sistema', desc:'Motor de emails: citas, trial, verificación, recordatorios' },
  { id:'trial-reminders',          label:'Trial Reminders',       cat:'Sistema', desc:'Recordatorios + expiración automática de trials', cron:'trial-reminders-daily' },
  { id:'appointment-reminders',    label:'Appointment Reminders', cat:'Sistema', desc:'Recordatorios de citas a pacientes', cron:'appointment-reminders' },
  { id:'search-doctors',           label:'Search Doctors',        cat:'Sistema', desc:'Motor de búsqueda de médicos por especialidad/ciudad' },
  { id:'cita-action',              label:'Cita Action',           cat:'Sistema', desc:'Confirmar, cancelar y reprogramar citas' },
  { id:'sitemap-medicos',          label:'Sitemap SEO',           cat:'Sistema', desc:'Genera sitemap dinámico de perfiles médicos' },
  { id:'admin-verify',             label:'Admin Verify',          cat:'Admin',   desc:'Verificación y aprobación de médicos' },
  { id:'payphone-webhook',         label:'PayPhone Webhook',      cat:'Admin',   desc:'Recibe confirmaciones de pago PayPhone' },
  { id:'analytics-reader',         label:'Analytics',             cat:'Admin',   desc:'Lee métricas del sitio médico' },
  { id:'scout-leads',              label:'Scout Leads',           cat:'Growth',  desc:'Detecta médicos potenciales para adquisición', cron:'daily-scout-leads' },
  { id:'growth-daily-batch',       label:'Growth Batch',          cat:'Growth',  desc:'Batch diario de contenido growth', cron:'growth-daily-content' },
  { id:'process-scheduled',        label:'Scheduled Posts',       cat:'Growth',  desc:'Publica posts programados en redes', cron:'process-scheduled-posts' },
  { id:'showcase-batch',           label:'Showcase Batch',        cat:'Growth',  desc:'Genera showcases automáticamente', cron:'auto-showcase-batch' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.headers.get('x-admin-token') !== ADMIN_TOKEN)
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })

  try {
    const { data: cronRows } = await sb.rpc('admin_get_cron_status')
    const cronMap: Record<string, unknown> = {}
    if (Array.isArray(cronRows)) for (const r of cronRows as any[]) cronMap[r.jobname] = r

    const agents = AGENTS.map(a => ({
      ...a,
      cron_data: (a as any).cron ? cronMap[(a as any).cron] || null : null,
    }))

    return new Response(JSON.stringify({ ok: true, agents }), { headers: CORS })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { headers: CORS })
  }
})
