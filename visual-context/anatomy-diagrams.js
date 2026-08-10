/**
 * visual-context/anatomy-diagrams.js
 *
 * Registro de ilustraciones anatómicas. Cada región es UNA función que
 * recibe (zoneCode, certaintyTreatment) y devuelve un string SVG. Agregar
 * hombro/tobillo/columna es agregar una entrada aquí — nada más del sistema
 * cambia.
 *
 * Estilo deliberado: line-art editorial, no anatomía hiperrealista. Todo en
 * estilos inline (no custom properties CSS) porque este SVG se inserta en
 * un div offscreen para html2canvas — mismo patrón que usa Fase 1.
 */

const INK = '#2c3a38';
const TEAL = '#0b7c6e';
const TEAL_MID = '#0e9d8c';
const TEAL_DARK = '#085f54';
const MUTED2 = '#a0b0ae';

/**
 * Traduce un nivel de certeza al tratamiento visual de la zona destacada.
 * Esta es la única fuente de verdad de "cómo se ve" cada certeza —
 * confirmado nunca puede verse igual que sospecha, por diseño de datos,
 * no por disciplina del que escribe el SVG.
 */
const CERTAINTY_TREATMENT = {
  confirmado: { fill: TEAL, fillOpacity: 0.28, stroke: TEAL, strokeWidth: 2, dasharray: null, blur: false },
  sospecha: { fill: 'none', fillOpacity: 0, stroke: TEAL_MID, strokeWidth: 1.7, dasharray: '3 2.6', blur: false },
  hallazgo_clinico: { fill: TEAL_MID, fillOpacity: 0.22, stroke: 'none', strokeWidth: 0, dasharray: null, blur: true },
  // descartado / no_determinado / null: no hay tratamiento — no se resalta nada.
  default: null
};

function ellipseZone(cx, cy, rx, ry, treatment) {
  if (!treatment) {
    // Sin tratamiento (descartado / no_determinado): se dibuja como el resto
    // de la anatomía, sin ningún énfasis. Nunca se oculta la estructura,
    // solo se le quita el destaque.
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx - 1}" ry="${ry - 1}" fill="none" stroke="${INK}" stroke-width="2" opacity=".55"/>`;
  }
  const filter = treatment.blur ? ' filter="url(#kneeHaloBlur)"' : '';
  const dash = treatment.dasharray ? ` stroke-dasharray="${treatment.dasharray}"` : '';
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${treatment.fill}" fill-opacity="${treatment.fillOpacity}" stroke="${treatment.stroke}" stroke-width="${treatment.strokeWidth}"${dash}${filter}/>`;
}

/**
 * @param {string|null} zoneCode - 'medial' | 'lateral' | null
 * @param {string|null} certainty - nivel de certeza (ver certainty.js de clinical-context)
 * @returns {string} SVG de la rodilla, viewBox 0 0 160 210
 */
function buildKneeDiagram(zoneCode, certainty) {
  const treatment = certainty ? (CERTAINTY_TREATMENT[certainty] || null) : null;
  const medialTreatment = zoneCode === 'medial' ? treatment : null;
  const lateralTreatment = zoneCode === 'lateral' ? treatment : null;

  return `<svg width="190" height="210" viewBox="0 0 160 210" role="img" aria-label="Rodilla, zona ${zoneCode || 'no especificada'}">
  <defs><filter id="kneeHaloBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
  <rect x="52" y="10" width="56" height="72" rx="20" fill="none" stroke="${INK}" stroke-width="2" opacity=".42"/>
  <circle cx="80" cy="98" r="10" fill="none" stroke="${INK}" stroke-width="2" opacity=".42"/>
  <rect x="60" y="112" width="26" height="78" rx="11" fill="none" stroke="${INK}" stroke-width="2" opacity=".42"/>
  <rect x="90" y="118" width="13" height="68" rx="6" fill="none" stroke="${INK}" stroke-width="2" opacity=".42"/>
  <line x1="44" y1="100" x2="116" y2="100" stroke="${INK}" stroke-width="1.3" opacity=".3"/>
  ${ellipseZone(62, 100, 17, 7, medialTreatment)}
  ${ellipseZone(98, 100, 15, 5.5, lateralTreatment)}
  <text x="62" y="205" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" font-weight="700" letter-spacing=".3" fill="${MUTED2}">MEDIAL</text>
  <text x="98" y="205" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7.5" font-weight="700" letter-spacing=".3" fill="${MUTED2}">LATERAL</text>
</svg>`;
}

/**
 * Pictograma localizador de lateralidad — dos piernas, la del lado
 * correspondiente marcada con un anillo. Existe para que el lado se VEA,
 * no solo se lea en texto (feedback explícito: "no podemos depender de que
 * el paciente interprete izquierda/derecha en un dibujo").
 * @param {'right'|'left'|null} side
 */
function buildSideLocator(side) {
  const ring = side === 'right'
    ? `<circle cx="43" cy="24" r="12" fill="none" stroke="${TEAL}" stroke-width="2"/>`
    : side === 'left'
      ? `<circle cx="17" cy="24" r="12" fill="none" stroke="${TEAL}" stroke-width="2"/>`
      : '';
  return `<svg width="60" height="50" viewBox="0 0 60 50">
  <rect x="10" y="6" width="14" height="34" rx="6" fill="none" stroke="${MUTED2}" stroke-width="2"/>
  <rect x="36" y="6" width="14" height="34" rx="6" fill="none" stroke="${MUTED2}" stroke-width="2"/>
  ${ring}
</svg>`;
}

const ANATOMY_DIAGRAMS = {
  knee: { buildDiagram: buildKneeDiagram, buildLocator: buildSideLocator, label: 'Rodilla' }
};

module.exports = { ANATOMY_DIAGRAMS, CERTAINTY_TREATMENT, buildKneeDiagram, buildSideLocator };
