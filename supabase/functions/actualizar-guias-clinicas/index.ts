import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin-auth.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const sb = createClient(SUPABASE_URL, SUPABASE_SRV)

const PUBMED_ESEARCH  = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
const PUBMED_ESUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'

// Default triage topics to fetch from PubMed
const DEFAULT_TERMS = [
  'triage urgencias abdominal pain',
  'emergency triage fever pediatric',
  'chest pain emergency triage',
  'acute headache emergency red flags',
  'urinary tract infection triage management',
  'acute gastroenteritis dehydration emergency',
  'anaphylaxis emergency management',
  'sepsis early recognition emergency',
]

// Map PubMed topic keywords to local categories
function guessCategoria(title: string, term: string): string {
  const t = (title + ' ' + term).toLowerCase()
  if (/abdom|abdomen|gastrointestinal/.test(t)) return 'abdomen'
  if (/respiratory|asthma|copd|bronch|pulmon|breath/.test(t)) return 'respiratorio'
  if (/cardiac|chest pain|coronary|heart|troponin|ecg/.test(t)) return 'cardiovascular'
  if (/headache|cephalea|migraine|cerebral|stroke|neuro/.test(t)) return 'neurologico'
  if (/fever|fiebre|pyrexia|temperature/.test(t)) return 'fiebre'
  if (/trauma|injury|fracture|wound/.test(t)) return 'trauma'
  if (/allerg|anaphylaxis|hypersensitivity/.test(t)) return 'alergico'
  if (/urinary|urine|uti|bladder|renal/.test(t)) return 'urinario'
  if (/gastro|diarr|vomit|nausea|dehydration/.test(t)) return 'gastroenteritis'
  return 'general'
}

async function searchPubMed(term: string): Promise<string[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: term,
    sort: 'date',
    retmax: '3',
    retmode: 'json',
    mindate: '2020',
    maxdate: '2024',
  })

  const res = await fetch(`${PUBMED_ESEARCH}?${params}`)
  if (!res.ok) {
    console.error(`esearch failed for term "${term}": ${res.status}`)
    return []
  }

  const data = await res.json()
  return (data?.esearchresult?.idlist || []) as string[]
}

async function fetchSummaries(pmids: string[]): Promise<Array<{
  pmid: string
  title: string
  pubdate: string
  authors: string
}>> {
  if (pmids.length === 0) return []

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  })

  const res = await fetch(`${PUBMED_ESUMMARY}?${params}`)
  if (!res.ok) {
    console.error(`esummary failed for pmids ${pmids.join(',')}: ${res.status}`)
    return []
  }

  const data = await res.json()
  const result = data?.result || {}

  return pmids
    .filter(id => result[id] && !result[id].error)
    .map(id => {
      const r = result[id]
      const authorName = r.authors?.[0]?.name || ''
      return {
        pmid: id,
        title: r.title || '',
        pubdate: r.pubdate || '',
        authors: authorName,
      }
    })
    .filter(s => s.title.length > 10) // skip empty/broken records
}

function parseYear(pubdate: string): number | null {
  const match = pubdate.match(/\d{4}/)
  return match ? parseInt(match[0], 10) : null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Auth check -- admin real O service_role (Scheduled Trigger / cron
  // server-to-server; nunca aceptar el service_role key desde HTML/JS)
  const auth = await requireAdmin(req, { allowServiceRole: true })
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: CORS })
  }

  let terminos: string[] = DEFAULT_TERMS
  try {
    const body = await req.json()
    if (Array.isArray(body.terminos) && body.terminos.length > 0) {
      terminos = body.terminos
    }
  } catch {
    // body parse failure → use defaults
  }

  const results = {
    procesados: 0,
    insertados: 0,
    omitidos: 0,
    errores: 0,
    articulos: [] as string[],
  }

  for (const term of terminos) {
    try {
      const pmids = await searchPubMed(term)
      if (pmids.length === 0) continue

      const summaries = await fetchSummaries(pmids)

      for (const s of summaries) {
        results.procesados++

        // Check if pmid already exists
        const { data: existing } = await sb
          .from('clinical_guidelines')
          .select('id')
          .eq('pubmed_id', s.pmid)
          .maybeSingle()

        if (existing) {
          results.omitidos++
          continue
        }

        const anio = parseYear(s.pubdate)
        const categoria = guessCategoria(s.title, term)
        const contenido = s.authors
          ? `${s.title} (${s.authors} et al., ${s.pubdate})`
          : s.title

        const { error } = await sb.from('clinical_guidelines').insert({
          titulo: s.title.slice(0, 300),
          fuente: 'PubMed',
          anio,
          categoria,
          contenido,
          tags: term.split(' ').filter(w => w.length > 3),
          pubmed_id: s.pmid,
          url: `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`,
        })

        if (error) {
          console.error(`insert error pmid ${s.pmid}:`, error.message)
          results.errores++
        } else {
          results.insertados++
          results.articulos.push(s.title.slice(0, 80))
        }
      }
    } catch (e) {
      console.error(`error processing term "${term}":`, e)
      results.errores++
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), { headers: CORS })
})
