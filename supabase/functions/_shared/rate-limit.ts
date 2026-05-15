import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limits per feature per minute
const LIMITS: Record<string, { per_min: number; per_hour: number }> = {
  voice_extraction:   { per_min: 10, per_hour: 60 },
  summary_generation: { per_min: 3,  per_hour: 20 },
  default:            { per_min: 20, per_hour: 100 }
}

export async function checkRateLimit(
  feature: string,
  doctorId: string | null,
  ip: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = LIMITS[feature] || LIMITS.default
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const windowMin  = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString()
  const windowHour = new Date(Math.floor(now.getTime() / 3600000) * 3600000).toISOString()
  const key = doctorId || ip

  // Check minute window
  const { data: minData } = await supabase
    .from('ai_rate_limits')
    .select('request_count')
    .eq('feature', feature)
    .eq(doctorId ? 'doctor_id' : 'ip', key)
    .eq('window_start', windowMin)
    .maybeSingle()

  if (minData && minData.request_count >= limits.per_min) {
    return { allowed: false, reason: `Rate limit: max ${limits.per_min} requests/min for ${feature}` }
  }

  // Check hour window
  const { data: hourRows } = await supabase
    .from('ai_rate_limits')
    .select('request_count')
    .eq('feature', feature)
    .eq(doctorId ? 'doctor_id' : 'ip', key)
    .gte('window_start', windowHour)

  const hourTotal = (hourRows || []).reduce((s, r) => s + r.request_count, 0)
  if (hourTotal >= limits.per_hour) {
    return { allowed: false, reason: `Rate limit: max ${limits.per_hour} requests/hour for ${feature}` }
  }

  // Increment counter (upsert)
  await supabase.from('ai_rate_limits').upsert({
    doctor_id:     doctorId || null,
    ip:            doctorId ? null : ip,
    feature,
    window_start:  windowMin,
    request_count: (minData?.request_count || 0) + 1
  }, { onConflict: 'doctor_id,feature,window_start', ignoreDuplicates: false })

  return { allowed: true }
}
