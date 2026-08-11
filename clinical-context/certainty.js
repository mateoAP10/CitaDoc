/**
 * clinical-context/certainty.js
 *
 * Determina el nivel de certeza de una impresión diagnóstica a partir del
 * lenguaje usado por el médico. Regla no negociable: ante ambigüedad, se
 * elige SIEMPRE el nivel más conservador. "confirmado" nunca es el default,
 * solo se asigna con marcador explícito en el texto.
 *
 * Módulo universal — ver el comentario al inicio de taxonomy.js.
 */
(function (global, factory) {
  var taxonomy = (typeof module === 'object' && module.exports) ? require('./taxonomy') : global.CitaDocClinical.taxonomy;
  var mod = factory(taxonomy);
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  else { global.CitaDocClinical.certainty = mod; }
})(typeof window !== 'undefined' ? window : this, function (taxonomyMod) {

var normalizeText = taxonomyMod.normalizeText;

const CERTAINTY_LEVELS = {
  CONFIRMADO: 'confirmado',
  SOSPECHA: 'sospecha',
  DESCARTADO: 'descartado',
  HALLAZGO_CLINICO: 'hallazgo_clinico',
  NO_DETERMINADO: 'no_determinado'
};

// Orden importa: se evalúa de arriba a abajo y se toma el primer match.
// "descartado" y "sospecha" se revisan antes que "confirmado" porque frases
// como "sin sospecha de lesión" o "se descarta" contienen ruido que no debe
// leerse como confirmación de nada.
const CERTAINTY_MARKERS = [
  { level: CERTAINTY_LEVELS.DESCARTADO, patterns: [/se descarta/, /descarta[dr]/, /sin evidencia de/, /no se evidencia/, /niega/] },
  { level: CERTAINTY_LEVELS.SOSPECHA, patterns: [/sospech/, /compatible con/, /probable/, /posible/, /orienta a/, /sugestivo de/, /sugiere/] },
  { level: CERTAINTY_LEVELS.CONFIRMADO, patterns: [/se confirma/, /confirmad[oa]/, /diagnostico definitivo/, /diagnóstico definitivo/] }
];

/**
 * @param {string} text - texto de la impresión diagnóstica / diagnóstico libre.
 * @param {boolean} hasAnyDiagnosisText - si existe algún texto de diagnóstico
 *   o impresión (aunque no matchee ningún marcador). Permite distinguir
 *   "hay diagnóstico pero sin certeza expresada" (no_determinado) de
 *   "no hay diagnóstico, solo hallazgos de examen" (hallazgo_clinico).
 */
function determineCertainty(text, hasAnyDiagnosisText) {
  const normalized = normalizeText(text);

  for (const marker of CERTAINTY_MARKERS) {
    if (marker.patterns.some((p) => p.test(normalized))) {
      return marker.level;
    }
  }

  if (hasAnyDiagnosisText) {
    // Hay una impresión/diagnóstico escrito, pero el texto no usa ningún
    // lenguaje de certeza reconocible. No asumimos nada — ni confirmado
    // ni sospecha. Se marca explícitamente como no determinado.
    return CERTAINTY_LEVELS.NO_DETERMINADO;
  }

  // No hay ninguna impresión diagnóstica en absoluto, solo hallazgos de
  // examen físico. Ese es el nivel más bajo de compromiso posible.
  return CERTAINTY_LEVELS.HALLAZGO_CLINICO;
}

return { CERTAINTY_LEVELS, CERTAINTY_MARKERS, determineCertainty };
});
