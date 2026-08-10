/**
 * clinical-context/test.js
 *
 * Script standalone de prueba. No toca la app, no importa nada de Fase 1.
 * Ejecutar con: node clinical-context/test.js
 */

const { resolveClinicalContext } = require('./resolver');
const { buildVisualContext } = require('../visual-context/build');

function printCase(title, context) {
  console.log('\n=== ' + title + ' ===');
  console.log(JSON.stringify(context, null, 2));
}

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FALLÓ: ' + msg);
    process.exitCode = 1;
  } else {
    console.log('✓ ' + msg);
  }
}

// ── Caso 1: Carlos Andrés Molina — rodilla derecha ────────────────────────
const casoCarlos = resolveClinicalContext({
  motivo: 'Dolor de rodilla derecha de 3 semanas de evolución posterior a giro jugando fútbol. Refiere dolor principalmente en interlínea articular medial, acompañado de sensación ocasional de bloqueo y aumento del dolor al subir y bajar escaleras.',
  enfermedadActual: 'Paciente previamente independiente y físicamente activo. Refiere mecanismo de torsión con el pie apoyado durante actividad deportiva. Desde entonces presenta dolor medial de rodilla derecha, inicialmente 7/10, actualmente 5/10.',
  examenFisico: 'Marcha ligeramente antálgica. Dolor a la palpación de interlínea articular medial. Derrame articular leve. Flexión: 125°. Extensión: 0°. Lachman con punto final firme. McMurray medial positivo. Fuerza muscular conservada.',
  diagnostico: '',
  diagnosesEstructurados: [{ cie10: '', label: 'Dolor de rodilla derecha con sospecha clínica de lesión meniscal medial' }],
  planImages: [{ name: 'Resonancia magnética de rodilla derecha' }],
  planLabs: []
});
printCase('Caso 1 — Carlos Andrés Molina (rodilla derecha)', casoCarlos);

assert(casoCarlos.region && casoCarlos.region.code === 'knee', 'región = rodilla');
assert(casoCarlos.region && casoCarlos.region.side === 'right', 'lado = derecha');
assert(casoCarlos.zone && casoCarlos.zone.code === 'medial', 'zona = medial');
assert(casoCarlos.structures.some((s) => s.code === 'meniscus_medial'), 'estructura = menisco medial');
const mcmurray = casoCarlos.findings.find((f) => f.code === 'mcmurray');
assert(!!mcmurray && mcmurray.polarity === 'positivo', 'McMurray = positivo');
const lachman = casoCarlos.findings.find((f) => f.code === 'lachman');
assert(!!lachman && lachman.polarity === 'negativo' && lachman.relevant === false, 'Lachman = negativo/firme, no se convierte en hallazgo relevante');
assert(casoCarlos.impression.certainty === 'sospecha', 'diagnóstico = sospecha');
assert(casoCarlos.impression.structure === 'meniscus_medial', 'impresión apunta a menisco medial');
assert(casoCarlos.pendingStudies.some((s) => s.type === 'imagen' && /resonancia/i.test(s.name)), 'RM = estudio pendiente');
assert(casoCarlos.provenance.method === 'free_text_heuristic', 'provenance marca origen como heurística de texto libre');
assert(casoCarlos.provenance.inspectedFields.some((f) => f.field === 'diagnosesEstructurados' && f.kind === 'structured_label'), 'provenance distingue el campo semi-estructurado (soap_jsonb)');

const visualCarlos = buildVisualContext(casoCarlos);
printCase('Caso 1 — VisualContext (stub)', visualCarlos);
assert(visualCarlos._stub === true && visualCarlos.mostrarAnatomia === false, 'visual-context sigue siendo stub, no dibuja nada todavía');

// ── Caso 2 (negativo): sin ninguna región anatómica mencionada ────────────
const casoSinRegion = resolveClinicalContext({
  motivo: 'Control de rutina. Paciente asintomático, sin molestias actuales.',
  enfermedadActual: '',
  examenFisico: 'Examen físico general sin hallazgos relevantes.',
  diagnostico: 'Paciente sano',
  diagnosesEstructurados: [],
  planImages: [],
  planLabs: []
});
printCase('Caso 2 (negativo) — sin región anatómica', casoSinRegion);
assert(casoSinRegion.region === null, 'sin mención de región => region: null (no se adivina)');

// ── Caso 3 (negativo): diagnóstico ambiguo, sin lenguaje de certeza ───────
const casoAmbiguo = resolveClinicalContext({
  motivo: 'Dolor de rodilla derecha de inicio reciente.',
  enfermedadActual: '',
  examenFisico: 'Dolor a la palpación medial.',
  diagnostico: 'Dolor de rodilla derecha',
  diagnosesEstructurados: [],
  planImages: [],
  planLabs: []
});
printCase('Caso 3 (negativo) — diagnóstico ambiguo', casoAmbiguo);
assert(casoAmbiguo.impression.certainty !== 'confirmado', 'diagnóstico ambiguo NUNCA se convierte en confirmado');
assert(casoAmbiguo.impression.certainty === 'no_determinado', 'diagnóstico ambiguo => no_determinado');

console.log('\n--- fin de pruebas ---');
