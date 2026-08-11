/**
 * visual-context/test.js
 *
 * Script standalone. No toca el PDF ni construirResumenPDFHtml().
 * Ejecutar con: node visual-context/test.js
 */

const { resolveClinicalContext } = require('../clinical-context/resolver');
const { buildVisualContext } = require('./build');

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FALLÓ: ' + msg);
    process.exitCode = 1;
  } else {
    console.log('✓ ' + msg);
  }
}

const casoCarlos = resolveClinicalContext({
  motivo: 'Dolor de rodilla derecha de 3 semanas de evolución posterior a giro jugando fútbol. Refiere dolor principalmente en interlínea articular medial, acompañado de sensación ocasional de bloqueo y aumento del dolor al subir y bajar escaleras.',
  enfermedadActual: 'Paciente previamente independiente y físicamente activo. Desde entonces presenta dolor medial de rodilla derecha.',
  examenFisico: 'Marcha ligeramente antálgica. Dolor a la palpación de interlínea articular medial. Derrame articular leve. Lachman con punto final firme. McMurray medial positivo.',
  diagnostico: '',
  diagnosesEstructurados: [{ cie10: '', label: 'Dolor de rodilla derecha con sospecha clínica de lesión meniscal medial' }],
  planImages: [{ name: 'Resonancia magnética de rodilla derecha' }],
  planLabs: []
});

const visual = buildVisualContext(casoCarlos);
console.log(JSON.stringify({ ...visual, diagramaSvg: '(svg, ' + visual.diagramaSvg.length + ' chars)', locatorSvg: '(svg, ' + visual.locatorSvg.length + ' chars)' }, null, 2));

assert(visual.mostrarAnatomia === true, 'mostrarAnatomia = true para caso con región resuelta');
assert(visual.region.code === 'knee' && visual.region.side === 'right', 'región/lado correctos en VisualContext');
assert(visual.zonaResaltada === 'medial', 'zona resaltada = medial');
assert(visual.certaintyState === 'sospecha', 'certeza = sospecha');
assert(visual.diagramaSvg.includes('stroke-dasharray="3 2.6"'), 'el SVG de la rodilla usa el tratamiento PUNTEADO para sospecha (no relleno sólido)');
assert(!visual.diagramaSvg.includes('fill="#0b7c6e" fill-opacity=".3"'), 'el SVG NO usa el tratamiento de "confirmado" — sospecha nunca se ve como diagnóstico confirmado');
assert(visual.diagramaSvg.includes('MEDIAL') && visual.diagramaSvg.includes('LATERAL'), 'el diagrama sigue etiquetando medial/lateral explícitamente en texto');
assert(visual.narrativeChain.some((n) => n.key === 'region'), 'cadena narrativa incluye región');
assert(visual.narrativeChain.some((n) => n.key === 'impresion' && n.label === 'Sospecha'), 'nodo de impresión etiquetado "Sospecha", no "Diagnóstico"');
assert(!visual.narrativeChain.some((n) => n.key === 'mecanismo'), 'cadena NO incluye "mecanismo" — no es un campo real de ClinicalContext');
assert(!visual.narrativeChain.some((n) => n.key === 'plan'), 'cadena NO incluye "plan" — no es un campo real de ClinicalContext');
assert(visual.callouts.some((c) => c.key === 'impresion' && c.tag === 'Sospecha, no confirmado'), 'callout de impresión trae el tag "Sospecha, no confirmado"');

var hallazgosCallout = visual.callouts.filter(function(c){ return c.key === 'hallazgos'; })[0];
assert(!!hallazgosCallout && Array.isArray(hallazgosCallout.items), 'el callout de hallazgos trae "items" para renderizar como bullets');
assert(hallazgosCallout.items.some(function(it){ return it.nombre === 'McMurray' && it.estado === 'Positivo'; }), 'bullet McMurray: Positivo');
assert(hallazgosCallout.items.some(function(it){ return it.nombre === 'Lachman' && it.estado === 'Negativo'; }), 'bullet Lachman: Negativo (documentado, aunque no eleve sospecha)');
assert(hallazgosCallout.items.some(function(it){ return it.nombre === 'Derrame' && it.estado === 'Presente'; }), 'bullet Derrame: Presente');
assert(!hallazgosCallout.items.some(function(it){ return it.estado === 'Ausente'; }), 'nunca se muestra "Ausente" — solo lo documentado, nunca una negación inferida');

// ── Negativo: caso sin región resuelta → sin anatomía, sin invención ──────
const casoSinRegion = resolveClinicalContext({ motivo: 'Control de rutina, paciente asintomático.' });
const visualSinRegion = buildVisualContext(casoSinRegion);
assert(visualSinRegion.mostrarAnatomia === false, 'sin región resuelta => mostrarAnatomia false');
assert(visualSinRegion.diagramaSvg === null, 'sin región resuelta => sin SVG inventado');

// ── Negativo: región reconocida pero sin diagrama registrado (hombro) ─────
const casoHombro = resolveClinicalContext({
  motivo: 'Dolor de hombro derecho tras caída.',
  examenFisico: 'Jobe positivo.',
  diagnostico: 'Sospecha de lesión del manguito rotador'
});
const visualHombro = buildVisualContext(casoHombro);
console.log('\n=== Caso hombro (región reconocida, sin diagrama registrado todavía) ===');
console.log(JSON.stringify({ region: casoHombro.region }, null, 2));
assert(casoHombro.region && casoHombro.region.code === 'shoulder', 'el resolvedor SÍ reconoce hombro (taxonomía ya lo soporta)');
assert(visualHombro.mostrarAnatomia === false, 'pero visual-context se degrada con gracia: sin diagrama de hombro registrado, no dibuja nada inventado');

console.log('\n--- fin de pruebas ---');
