/**
 * clinical-context/resolver.js
 *
 * Texto clínico (y lo poco que ya viene semi-estructurado, como
 * soap_jsonb.assessment.diagnoses) → ClinicalContext estructurado.
 *
 * Es el ÚNICO lugar donde se hace matching de texto. Es genérico: recorre
 * la taxonomía en loop, no tiene ni una sola condición del tipo
 * `if (texto.includes('rodilla'))`. Agregar una región nueva no requiere
 * tocar este archivo.
 *
 * Regla de oro: si el matching es ambiguo o no hay evidencia suficiente,
 * el resultado es null / conservador. Nunca se inventa ni se "redondea
 * hacia arriba" en certeza.
 *
 * Módulo universal — ver el comentario al inicio de taxonomy.js.
 */
(function (global, factory) {
  var taxonomyMod, certaintyMod;
  if (typeof module === 'object' && module.exports) {
    taxonomyMod = require('./taxonomy');
    certaintyMod = require('./certainty');
  } else {
    taxonomyMod = global.CitaDocClinical.taxonomy;
    certaintyMod = global.CitaDocClinical.certainty;
  }
  var mod = factory(taxonomyMod, certaintyMod);
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  else { global.CitaDocClinical.resolver = mod; }
})(typeof window !== 'undefined' ? window : this, function (taxonomyMod, certaintyMod) {

var ANATOMY_TAXONOMY = taxonomyMod.ANATOMY_TAXONOMY;
var normalizeText = taxonomyMod.normalizeText;
var determineCertainty = certaintyMod.determineCertainty;

/** ¿El synonym aparece como palabra/frase completa dentro del texto? */
function containsSynonym(normalizedText, synonym) {
  const normSyn = normalizeText(synonym);
  const escaped = normSyn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + escaped + '\\b');
  return re.test(normalizedText);
}

/** Busca, dentro de una lista de items con .synonyms, cuáles matchean el texto. */
function matchItems(normalizedText, items) {
  const hits = [];
  for (const item of items || []) {
    const matched = (item.synonyms || []).find((syn) => containsSynonym(normalizedText, syn));
    if (matched) hits.push({ item, matchedSynonym: matched });
  }
  return hits;
}

function detectPolarity(windowText) {
  const norm = normalizeText(windowText);
  const isNegative = ANATOMY_TAXONOMY.negativePolarityMarkers.some((m) => norm.includes(normalizeText(m)));
  const isPositive = ANATOMY_TAXONOMY.positivePolarityMarkers.some((m) => norm.includes(normalizeText(m)));
  if (isPositive && !isNegative) return 'positivo';
  if (isNegative && !isPositive) return 'negativo';
  return 'no_determinado';
}

/** Devuelve la primera sentencia del texto original que contiene el synonym. */
function findSentenceContaining(rawText, synonym) {
  const sentences = rawText.split(/(?<=[.\n])/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (containsSynonym(normalizeText(s), synonym)) return s;
  }
  return null;
}

/**
 * @param {object} input
 * @param {string} input.motivo
 * @param {string} input.enfermedadActual
 * @param {string} input.examenFisico
 * @param {string} input.diagnostico          - texto libre de diagnóstico
 * @param {Array}  input.diagnosesEstructurados - [{cie10, label}] (soap_jsonb.assessment.diagnoses)
 * @param {Array}  input.planImages           - [{name}]
 * @param {Array}  input.planLabs             - [{name}]
 * @returns {object} ClinicalContext
 */
function resolveClinicalContext(input) {
  const raw = {
    motivo: input.motivo || '',
    enfermedadActual: input.enfermedadActual || '',
    examenFisico: input.examenFisico || '',
    diagnostico: input.diagnostico || ''
  };
  const diagnosesEstructurados = input.diagnosesEstructurados || [];
  const planImages = input.planImages || [];
  const planLabs = input.planLabs || [];

  const diagnosisLabels = diagnosesEstructurados.map((d) => d.label).filter(Boolean);
  const diagnosisText = [raw.diagnostico, ...diagnosisLabels].filter(Boolean).join('. ');

  const fullText = [raw.motivo, raw.enfermedadActual, raw.examenFisico, diagnosisText].filter(Boolean).join('. ');
  const fullTextNorm = normalizeText(fullText);

  const inspectedFields = [];
  if (raw.motivo) inspectedFields.push({ field: 'motivo', kind: 'free_text' });
  if (raw.enfermedadActual) inspectedFields.push({ field: 'enfermedadActual', kind: 'free_text' });
  if (raw.examenFisico) inspectedFields.push({ field: 'examenFisico', kind: 'free_text' });
  if (raw.diagnostico) inspectedFields.push({ field: 'diagnostico', kind: 'free_text' });
  if (diagnosisLabels.length) inspectedFields.push({ field: 'diagnosesEstructurados', kind: 'structured_label' });

  // ── 1. Región ──────────────────────────────────────────────────────────
  const regionHits = ANATOMY_TAXONOMY.regions.filter((r) =>
    (r.synonyms || []).some((syn) => containsSynonym(fullTextNorm, syn))
  );
  const regionAmbiguous = regionHits.length > 1;
  const resolvedRegion = regionHits.length === 1 ? regionHits[0] : null;

  let region = null;
  let zone = null;
  let structures = [];
  const findings = [];

  if (resolvedRegion) {
    // ── 2. Lado ────────────────────────────────────────────────────────
    let side = null;
    if (resolvedRegion.hasSide) {
      const sideEntries = Object.entries(ANATOMY_TAXONOMY.sideMarkers);
      const sideHits = sideEntries.filter(([, syns]) => syns.some((s) => containsSynonym(fullTextNorm, s)));
      side = sideHits.length === 1 ? sideHits[0][0] : null; // ambiguo (0 o >1) => null
    }
    region = { code: resolvedRegion.code, label: resolvedRegion.label, side };

    // ── 3. Zona ────────────────────────────────────────────────────────
    const zoneHits = matchItems(fullTextNorm, resolvedRegion.zones);
    if (zoneHits.length === 1) {
      zone = { code: zoneHits[0].item.code, label: zoneHits[0].item.label };
    }

    // ── 4. Estructuras ─────────────────────────────────────────────────
    const structureHits = matchItems(fullTextNorm, resolvedRegion.structures);
    structures = structureHits.map((h) => ({ code: h.item.code, label: h.item.label }));

    // ── 5. Pruebas especiales (findings con polaridad) ────────────────
    const examNorm = normalizeText(raw.examenFisico);
    for (const test of resolvedRegion.specialTests || []) {
      const matchedSyn = (test.synonyms || []).find((syn) => containsSynonym(examNorm, syn));
      if (!matchedSyn) continue;
      const sentence = findSentenceContaining(raw.examenFisico, matchedSyn) || raw.examenFisico;
      const polarity = detectPolarity(sentence);
      let structureCode = test.structure || null;
      if (!structureCode && test.structureByZone && zone) {
        structureCode = test.structureByZone[zone.code] || null;
      }
      findings.push({
        tag: 'test_especial',
        code: test.code,
        label: test.label,
        text: sentence.trim(),
        polarity,
        structure: structureCode,
        // Un test especial solo eleva una estructura a "hallazgo relevante"
        // si su polaridad es positiva. Positivo/dudoso => sí; negativo/firme => no.
        relevant: polarity === 'positivo'
      });
    }
  }

  // ── 6. Hallazgos genéricos (dolor, derrame, bloqueo...) ───────────────
  const seenFindingCodes = new Set();
  const generalText = [raw.motivo, raw.enfermedadActual, raw.examenFisico].filter(Boolean).join('. ');
  for (const fk of ANATOMY_TAXONOMY.findingKeywords) {
    if (seenFindingCodes.has(fk.code)) continue;
    const matchedSyn = fk.synonyms.find((syn) => containsSynonym(normalizeText(generalText), syn));
    if (!matchedSyn) continue;
    const sentence = findSentenceContaining(generalText, matchedSyn);
    if (!sentence) continue;
    seenFindingCodes.add(fk.code);
    findings.push({
      tag: 'hallazgo_general',
      code: fk.code,
      label: null,
      text: sentence.trim(),
      polarity: null,
      structure: zone ? null : null,
      relevant: true
    });
  }

  // ── 7. Impresión diagnóstica + certeza ─────────────────────────────────
  const hasAnyDiagnosisText = diagnosisText.trim().length > 0;
  const certainty = determineCertainty(diagnosisText, hasAnyDiagnosisText);

  // La estructura "sospechada" se prioriza desde el texto de diagnóstico
  // (no desde examen físico) porque es ahí donde el médico expresa su
  // impresión. Si no hay match ahí, se usa la primera estructura detectada
  // en cualquier parte del texto (fallback conservador, no autoritativo).
  let impressionStructure = null;
  if (resolvedRegion && hasAnyDiagnosisText) {
    const diagNorm = normalizeText(diagnosisText);
    const diagStructHit = matchItems(diagNorm, resolvedRegion.structures)[0];
    impressionStructure = diagStructHit ? diagStructHit.item.code : (structures[0] ? structures[0].code : null);
  } else if (structures.length) {
    impressionStructure = structures[0].code;
  }

  const impression = hasAnyDiagnosisText || certainty !== 'hallazgo_clinico'
    ? { text: diagnosisText || null, certainty, structure: impressionStructure }
    : { text: null, certainty, structure: impressionStructure };

  // ── 8. Estudios pendientes ─────────────────────────────────────────────
  const pendingStudies = [];
  function checkPendingStudy(list, type) {
    for (const study of list) {
      const name = study && study.name;
      if (!name) continue;
      const nameNorm = normalizeText(name);
      const matchesRegion = resolvedRegion ? (resolvedRegion.synonyms || []).some((s) => containsSynonym(nameNorm, s)) : false;
      if (matchesRegion) {
        pendingStudies.push({ type, name });
      }
    }
  }
  checkPendingStudy(planImages, 'imagen');
  checkPendingStudy(planLabs, 'laboratorio');

  // ── 9. Provenance ──────────────────────────────────────────────────────
  const provenance = {
    method: 'free_text_heuristic',
    inspectedFields,
    regionAmbiguous,
    regionCandidates: regionHits.map((r) => r.code),
    note: 'region/lado/zona/estructura fueron inferidos de texto libre, no de un campo estructurado del formulario de consulta. impression.certainty solo se marca "confirmado" con lenguaje explícito en el texto.'
  };

  return { region, zone, structures, findings, impression, pendingStudies, provenance };
}

return { resolveClinicalContext, containsSynonym, matchItems };
});
