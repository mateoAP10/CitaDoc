/**
 * visual-context/build.js
 *
 * STUB — Fase 2, segunda mitad (todavía no implementada).
 *
 * Este módulo recibirá un ClinicalContext (ver clinical-context/resolver.js)
 * y decidirá qué se puede mostrar visualmente: qué diagrama anatómico usar
 * (si existe uno registrado para esa región), qué zona resaltar, y qué
 * bloques de narrativa ("qué encontramos" / "qué sospechamos" / "qué falta"
 * / "qué sigue") construir según el nivel de certeza.
 *
 * A propósito NO está conectado a construirResumenPDFHtml() todavía. Se
 * valida primero que el motor clínico (resolver.js) interprete
 * correctamente antes de darle capacidad visual.
 *
 * Cuando se implemente:
 *  - anatomyDiagrams: registro { [regionCode]: (zoneCode) => svgString }.
 *    Sin entrada registrada para una región => no se dibuja nada, nunca se
 *    improvisa un diagrama.
 *  - narrativeTemplates: diccionario por nivel de certeza (confirmado /
 *    sospecha / hallazgo_clinico / no_determinado / descartado), no strings
 *    sueltos dentro de la lógica.
 */

function buildVisualContext(clinicalContext) {
  return {
    diagramaSvg: null,
    zonaResaltada: (clinicalContext && clinicalContext.zone && clinicalContext.zone.code) || null,
    bloquesNarrativa: [],
    mostrarAnatomia: false,
    _stub: true
  };
}

module.exports = { buildVisualContext };
