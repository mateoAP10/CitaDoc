/**
 * visual-context/build.js
 *
 * ClinicalContext (clinical-context/resolver.js) → VisualContext.
 *
 * Decide QUÉ se puede mostrar visualmente y CÓMO, sin decidir nada clínico
 * por su cuenta: certeza, hallazgos, estructura y estudio pendiente vienen
 * ya resueltos por clinical-context. Este módulo solo traduce eso a un
 * diagrama + una narrativa.
 *
 * Todavía NO conectado a construirResumenPDFHtml(). Es la pieza que falta
 * antes de la integración real, aprobada como dirección de arte pero sin
 * tocar el pipeline de Fase 1.
 *
 * Dos huecos honestos, a propósito no rellenados con invención:
 *  - "Mecanismo" (cómo ocurrió la lesión) no es un campo de ClinicalContext
 *    hoy — resolver.js no lo extrae. No aparece en la cadena narrativa.
 *  - "Plan" tampoco es parte de ClinicalContext (vive en la consulta, no en
 *    el resolvedor clínico). La sección Plan de Fase 1 sigue existiendo tal
 *    cual — este módulo no la duplica ni la reemplaza.
 *
 * Módulo universal — ver el comentario al inicio de clinical-context/taxonomy.js.
 */
(function (global, factory) {
  var anatomyDiagramsMod = (typeof module === 'object' && module.exports) ? require('./anatomy-diagrams') : global.CitaDocVisual.anatomyDiagrams;
  var mod = factory(anatomyDiagramsMod);
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  else { global.CitaDocVisual.build = mod; }
})(typeof window !== 'undefined' ? window : this, function (anatomyDiagramsMod) {

var ANATOMY_DIAGRAMS = anatomyDiagramsMod.ANATOMY_DIAGRAMS;

// Presentación de códigos de hallazgo genérico a una palabra corta. Esto NO
// reinterpreta significado clínico — solo le pone una etiqueta legible a un
// código que clinical-context ya extrajo (dolor, derrame, bloqueo...).
const FINDING_LABELS = {
  dolor: 'Dolor',
  derrame: 'Derrame',
  bloqueo: 'Bloqueo',
  inestabilidad: 'Inestabilidad',
  inflamacion: 'Inflamación'
};

const CERTAINTY_NODE_LABEL = {
  confirmado: 'Diagnóstico',
  sospecha: 'Sospecha',
  descartado: 'Descartado',
  hallazgo_clinico: 'Impresión',
  no_determinado: 'Impresión'
};

function findingShortLabel(finding) {
  if (finding.label) {
    // test especial (McMurray, Lachman...) — solo se agrega el "+" si fue
    // el hallazgo el que elevó la relevancia (polaridad positiva).
    return finding.polarity === 'positivo' ? finding.label + '+' : finding.label;
  }
  return FINDING_LABELS[finding.code] || finding.code;
}

function buildNarrativeChain(clinicalContext) {
  const chain = [];
  const { region, zone, findings, impression, pendingStudies } = clinicalContext;

  if (!region) return chain;

  chain.push({ key: 'region', label: 'Región', value: region.label + (region.side === 'right' ? ' derecha' : region.side === 'left' ? ' izquierda' : ''), done: true });

  if (zone) {
    chain.push({ key: 'zona', label: 'Zona', value: zone.label, done: true });
  }

  const relevantFindings = findings.filter((f) => f.relevant);
  if (relevantFindings.length) {
    chain.push({ key: 'hallazgos', label: 'Hallazgos', value: relevantFindings.slice(0, 3).map(findingShortLabel).join(' + '), done: true });
  }

  if (impression && impression.text) {
    const certaintyLabel = CERTAINTY_NODE_LABEL[impression.certainty] || 'Impresión';
    // Buscamos el label real de la estructura (ej. "Menisco medial") en las
    // structures ya resueltas por clinical-context — nunca derivamos el
    // texto a mostrar del code interno (ej. "meniscus_medial").
    const matchedStructure = (clinicalContext.structures || []).find((s) => s.code === impression.structure);
    chain.push({ key: 'impresion', label: certaintyLabel, value: (matchedStructure && matchedStructure.label) || impression.text, done: true });
  }

  if (pendingStudies && pendingStudies.length) {
    chain.push({ key: 'estudio', label: 'Estudio', value: pendingStudies[0].name, done: false });
  }

  return chain;
}

function buildCallouts(clinicalContext) {
  const callouts = [];
  const { findings, impression, pendingStudies } = clinicalContext;

  const relevantFindings = findings.filter((f) => f.relevant);
  if (relevantFindings.length) {
    callouts.push({
      key: 'hallazgos',
      label: 'Qué encontramos',
      text: relevantFindings.map(findingShortLabel).join(' · ')
    });
  }

  if (impression && impression.text) {
    const certainty = impression.certainty;
    const label = certainty === 'confirmado' ? 'Diagnóstico' : certainty === 'descartado' ? 'Descartado' : 'Qué sospechamos';
    callouts.push({
      key: 'impresion',
      label,
      text: impression.text, // verbatim — nunca se reescribe lenguaje clínico
      certainty,
      tag: certainty === 'sospecha' ? 'Sospecha, no confirmado' : certainty === 'confirmado' ? 'Confirmado' : null
    });
  }

  if (pendingStudies && pendingStudies.length) {
    callouts.push({
      key: 'estudio',
      label: 'Cómo lo evaluaremos',
      text: pendingStudies.map((s) => s.name).join(' · ') + ' — pendiente'
    });
  }

  return callouts;
}

/**
 * @param {object} clinicalContext - salida de resolveClinicalContext()
 * @returns {object} VisualContext
 */
function buildVisualContext(clinicalContext) {
  const disabled = {
    mostrarAnatomia: false,
    region: null,
    diagramaSvg: null,
    locatorSvg: null,
    zonaResaltada: null,
    certaintyState: null,
    narrativeChain: [],
    callouts: [],
    _stub: false
  };

  if (!clinicalContext || !clinicalContext.region) return disabled;

  const diagramEntry = ANATOMY_DIAGRAMS[clinicalContext.region.code];
  if (!diagramEntry) {
    // Región resuelta pero sin diagrama registrado todavía (hombro, tobillo,
    // columna...). Se degrada con gracia: nada de anatomía, cero invención.
    return disabled;
  }

  const zoneCode = clinicalContext.zone ? clinicalContext.zone.code : null;
  const certainty = clinicalContext.impression ? clinicalContext.impression.certainty : null;

  return {
    mostrarAnatomia: true,
    region: clinicalContext.region,
    diagramaSvg: diagramEntry.buildDiagram(zoneCode, certainty),
    locatorSvg: diagramEntry.buildLocator(clinicalContext.region.side),
    zonaResaltada: zoneCode,
    certaintyState: certainty,
    narrativeChain: buildNarrativeChain(clinicalContext),
    callouts: buildCallouts(clinicalContext),
    _stub: false
  };
}

return { buildVisualContext };
});
