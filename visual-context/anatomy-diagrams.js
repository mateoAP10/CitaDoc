/**
 * visual-context/anatomy-diagrams.js
 *
 * Registro de ilustraciones anatómicas. Cada región es UNA función que
 * recibe (zoneCode, certaintyTreatment) y devuelve un string SVG. Agregar
 * hombro/tobillo/columna es agregar una entrada aquí — nada más del sistema
 * cambia.
 *
 * v2 (CitaDoc 20.0): anatomía real y reconocible — fémur con cóndilos y
 * muesca intercondílea, rótula nidada, meniscos como estructuras propias en
 * la interlínea articular, tibia y fíbula con proporción real. Reemplaza la
 * v1 (rectángulos/óvalos geométricos), que no era reconocible como rodilla.
 *
 * Estilo deliberado: line-art editorial premium, no anatomía hiperrealista,
 * fondo prácticamente blanco. El teal es SOLO acento sobre la estructura
 * relevante, nunca relleno dominante del dibujo. Todo en estilos inline (no
 * custom properties CSS) porque este SVG se inserta en un div offscreen
 * para html2canvas — mismo patrón que usa Fase 1.
 *
 * Módulo universal — ver el comentario al inicio de clinical-context/taxonomy.js.
 */
(function (global, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  else { global.CitaDocVisual = global.CitaDocVisual || {}; global.CitaDocVisual.anatomyDiagrams = mod; }
})(typeof window !== 'undefined' ? window : this, function () {

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
  confirmado: { style: 'solido' },
  sospecha: { style: 'punteado' },
  hallazgo_clinico: { style: 'halo' },
  // descartado / no_determinado / null: sin tratamiento — no se resalta nada.
  default: null
};

// Forma del menisco: un pétalo/almendra, no una elipse genérica. La misma
// forma se usa para medial y lateral, solo cambia la posición (espejada).
const MENISCUS_MEDIAL_PATH = 'M 68,178 Q 92,168 96,179 Q 92,190 68,178 Z';
const MENISCUS_LATERAL_PATH = 'M 148,178 Q 124,168 120,179 Q 124,190 148,178 Z';

/**
 * @param {string} pathData - path del menisco (medial o lateral)
 * @param {object|null} treatment - CERTAINTY_TREATMENT[certeza] o null
 * @param {string} filterId - id único del filtro de blur (por si hay >1 SVG en la misma página)
 */
function meniscusZone(pathData, treatment, filterId) {
  if (!treatment) {
    // Sin tratamiento: se dibuja igual que el resto de la anatomía, sin
    // ningún énfasis. Nunca se oculta la estructura, solo se le quita el
    // destaque — así el paciente igual ve "ahí está el menisco".
    return `<path d="${pathData}" fill="none" stroke="${INK}" stroke-width="2" opacity=".55"/>`;
  }
  if (treatment.style === 'solido') {
    return `<path d="${pathData}" fill="${TEAL}" fill-opacity=".3" stroke="${TEAL}" stroke-width="2.2"/>`;
  }
  if (treatment.style === 'punteado') {
    return `<path d="${pathData}" fill="none" stroke="${TEAL_MID}" stroke-width="2.2" stroke-dasharray="3 2.6"/>`;
  }
  // halo (hallazgo_clinico): resplandor suave detrás + el contorno normal
  // encima, para que la forma se siga leyendo con claridad bajo el halo.
  return `<path d="${pathData}" fill="${TEAL_MID}" fill-opacity=".35" stroke="none" filter="url(#${filterId})"/>`
    + `<path d="${pathData}" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".5"/>`;
}

/**
 * @param {string|null} zoneCode - 'medial' | 'lateral' | null
 * @param {string|null} certainty - nivel de certeza (ver certainty.js de clinical-context)
 * @returns {string} SVG de la rodilla, viewBox 0 0 220 300
 */
function buildKneeDiagram(zoneCode, certainty) {
  const treatment = certainty ? (CERTAINTY_TREATMENT[certainty] || null) : null;
  const medialTreatment = zoneCode === 'medial' ? treatment : null;
  const lateralTreatment = zoneCode === 'lateral' ? treatment : null;
  const uid = Math.random().toString(36).slice(2, 8);
  const filterId = 'kneeHaloBlur-' + uid;
  const boneGradId = 'boneGrad-' + uid;
  const patellaGradId = 'patellaGrad-' + uid;
  const shadowId = 'boneShadow-' + uid;

  // Sombreado sutil de hueso: gris cálido muy claro, nunca color — es
  // dimensionalidad, no fotorrealismo. El teal sigue siendo el único acento.
  return `<svg width="220" height="300" viewBox="0 0 220 300" role="img" aria-label="Rodilla derecha, zona ${zoneCode || 'no especificada'}">
  <defs>
    <filter id="${filterId}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <linearGradient id="${boneGradId}" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#f6f6f4"/>
      <stop offset="100%" stop-color="#eae9e5"/>
    </linearGradient>
    <radialGradient id="${patellaGradId}" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e7e6e2"/>
    </radialGradient>
    <filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#0f1a18" flood-opacity=".16"/>
    </filter>
  </defs>
  <g filter="url(#${shadowId})">
  <path d="M 96,8 C 84,8 80,28 82,52 C 84,76 88,88 78,102 C 66,118 55,128 55,145 C 55,160 66,169 80,167 C 92,165 100,158 106,148 L 110,148 C 116,158 124,165 136,167 C 150,169 161,160 161,145 C 161,128 150,118 138,102 C 128,88 132,76 134,52 C 136,28 132,8 120,8 Z" fill="url(#${boneGradId})" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M 108,116 C 120,116 128,125 127,138 C 126,150 118,161 108,163 C 98,161 90,150 89,138 C 88,125 96,116 108,116 Z" fill="url(#${patellaGradId})" stroke="${INK}" stroke-width="2"/>
  <path d="M 66,183 Q 108,192 150,183" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".3"/>
  ${meniscusZone(MENISCUS_MEDIAL_PATH, medialTreatment, filterId)}
  ${meniscusZone(MENISCUS_LATERAL_PATH, lateralTreatment, filterId)}
  <path d="M 76,190 C 68,200 65,220 68,246 C 70,268 74,286 80,298 L 106,298 C 103,272 100,244 101,220 C 102,208 103,197 100,190 Z" fill="url(#${boneGradId})" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M 138,200 C 133,214 130,234 132,256 C 133,272 136,286 140,297 L 155,297 C 153,274 151,248 149,226 C 148,214 146,204 141,198 Z" fill="url(#${boneGradId})" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </g>
  <text x="82" y="215" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" font-weight="700" letter-spacing=".3" fill="${MUTED2}">MEDIAL</text>
  <text x="134" y="215" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" font-weight="700" letter-spacing=".3" fill="${MUTED2}">LATERAL</text>
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

return { ANATOMY_DIAGRAMS, CERTAINTY_TREATMENT, buildKneeDiagram, buildSideLocator };
});
