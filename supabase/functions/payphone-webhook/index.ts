import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    // PayPhone envía: transactionId, clientTransactionId, amount, currency,
    // transactionStatus, message, phoneNumber, email, reference, etc.
    const {
      clientTransactionId,
      transactionStatus,
      amount,
      currency,
      reference,
      email
    } = payload

    if (transactionStatus !== 'Approved') {
      return new Response(JSON.stringify({ ok: true, note: 'not-approved' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Extraer plan y medico_id del reference
    // reference format: "CitaDoc PRO — <medico_id>" o "CitaDoc PRO+WEB — <medico_id>"
    let medicoId = null
    let plan = 'pro'

    if (reference && typeof reference === 'string') {
      const match = reference.match(/CitaDoc\s+(PRO\+WEB|PRO)\s*[-–—]\s*(.+)/i)
      if (match) {
        plan = match[1].toLowerCase().replace('+', '_') // 'pro_web' o 'pro'
        medicoId = match[2].trim()
      }
    }

    if (!medicoId && clientTransactionId) {
      // fallback: extraer de clientTransactionId "citadoc-pro_web-123456"
      const txMatch = clientTransactionId.match(/citadoc-(pro_web|pro)-(\d+)/)
      if (txMatch) {
        plan = txMatch[1]
        medicoId = txMatch[2]
      }
    }

    if (!medicoId) {
      return new Response(JSON.stringify({ error: 'missing medico_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseServiceKey)

    const update: Record<string, unknown> = {
      plan: plan,
      plan_activo: true,
      updated_at: new Date().toISOString()
    }

    if (plan === 'pro_web') {
      update.web_status = 'active'
    }

    const { error } = await sb
      .from('medicos')
      .update(update)
      .eq('id', medicoId)

    if (error) {
      console.error('Supabase update error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true, plan, medicoId }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('Webhook error:', e)
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
