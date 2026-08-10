/**
 * clinical-context/taxonomy.js
 *
 * Diccionario de anatomía clínica. Esto es DATA, no lógica: agregar una región
 * nueva (hombro, tobillo, columna...) es agregar una entrada aquí, nunca
 * escribir un detector nuevo en resolver.js.
 *
 * Cada región puede declarar:
 *  - synonyms: cómo aparece mencionada en texto libre (motivo, examen físico, dx)
 *  - hasSide: si aplica lateralidad (derecha/izquierda)
 *  - zones: subregiones (medial, lateral, anterior, posterior...)
 *  - structures: estructuras anatómicas relevantes, opcionalmente ancladas a una zone
 *  - specialTests: pruebas semiológicas típicas de esa región, con la estructura
 *    que exploran (fija o dependiente de la zone detectada)
 */

const ANATOMY_TAXONOMY = {
  regions: [
    {
      code: 'knee',
      label: 'Rodilla',
      synonyms: ['rodilla'],
      hasSide: true,
      zones: [
        { code: 'medial', label: 'Medial', synonyms: ['medial'] },
        { code: 'lateral', label: 'Lateral', synonyms: ['lateral'] },
        { code: 'anterior', label: 'Anterior', synonyms: ['cara anterior', 'región anterior', 'zona anterior', 'aspecto anterior', 'compartimento anterior'] },
        { code: 'posterior', label: 'Posterior', synonyms: ['cara posterior', 'región posterior', 'zona posterior', 'aspecto posterior', 'poplíteo', 'popliteo'] }
      ],
      structures: [
        { code: 'meniscus_medial', label: 'Menisco medial', synonyms: ['menisco medial', 'meniscal medial'], zone: 'medial' },
        { code: 'meniscus_lateral', label: 'Menisco lateral', synonyms: ['menisco lateral', 'meniscal lateral'], zone: 'lateral' },
        { code: 'acl', label: 'Ligamento cruzado anterior', synonyms: ['ligamento cruzado anterior', 'lca'] },
        { code: 'pcl', label: 'Ligamento cruzado posterior', synonyms: ['ligamento cruzado posterior', 'lcp'] },
        { code: 'mcl', label: 'Ligamento colateral medial', synonyms: ['ligamento colateral medial', 'lcm'], zone: 'medial' },
        { code: 'lcl', label: 'Ligamento colateral lateral', synonyms: ['ligamento colateral lateral', 'lcl'], zone: 'lateral' }
      ],
      specialTests: [
        { code: 'mcmurray', label: 'McMurray', synonyms: ['mcmurray'], structureByZone: { medial: 'meniscus_medial', lateral: 'meniscus_lateral' } },
        { code: 'lachman', label: 'Lachman', synonyms: ['lachman'], structure: 'acl' },
        { code: 'cajon_anterior', label: 'Cajón anterior', synonyms: ['cajón anterior', 'cajon anterior'], structure: 'acl' },
        { code: 'cajon_posterior', label: 'Cajón posterior', synonyms: ['cajón posterior', 'cajon posterior'], structure: 'pcl' }
      ]
    },
    {
      code: 'shoulder',
      label: 'Hombro',
      synonyms: ['hombro'],
      hasSide: true,
      zones: [
        { code: 'anterior', label: 'Anterior', synonyms: ['cara anterior', 'región anterior', 'zona anterior'] },
        { code: 'posterior', label: 'Posterior', synonyms: ['cara posterior', 'región posterior', 'zona posterior'] }
      ],
      structures: [
        { code: 'rotator_cuff', label: 'Manguito rotador', synonyms: ['manguito rotador'] },
        { code: 'labrum', label: 'Labrum glenoideo', synonyms: ['labrum', 'rodete glenoideo'] }
      ],
      specialTests: [
        { code: 'jobe', label: 'Jobe', synonyms: ['jobe'], structure: 'rotator_cuff' },
        { code: 'neer', label: 'Neer', synonyms: ['neer'], structure: 'rotator_cuff' }
      ]
    },
    {
      code: 'ankle',
      label: 'Tobillo',
      synonyms: ['tobillo'],
      hasSide: true,
      zones: [
        { code: 'lateral', label: 'Lateral', synonyms: ['lateral'] },
        { code: 'medial', label: 'Medial', synonyms: ['medial'] }
      ],
      structures: [
        { code: 'atfl', label: 'Ligamento peroneoastragalino anterior', synonyms: ['peroneoastragalino anterior', 'atfl'] },
        { code: 'deltoid_ligament', label: 'Ligamento deltoideo', synonyms: ['ligamento deltoideo'] }
      ],
      specialTests: [
        { code: 'cajon_anterior_tobillo', label: 'Cajón anterior de tobillo', synonyms: ['cajón anterior', 'cajon anterior'], structure: 'atfl' }
      ]
    },
    {
      code: 'lumbar_spine',
      label: 'Columna lumbar',
      synonyms: ['columna lumbar', 'región lumbar', 'region lumbar', 'zona lumbar'],
      hasSide: false,
      zones: [],
      structures: [
        { code: 'nerve_root', label: 'Raíz nerviosa', synonyms: ['radiculopatía', 'radiculopatia', 'ciática', 'ciatica'] }
      ],
      specialTests: [
        { code: 'lasegue', label: 'Lasègue', synonyms: ['lasegue', 'lasègue'], structure: 'nerve_root' }
      ]
    }
  ],

  sideMarkers: {
    right: ['derecha', 'derecho'],
    left: ['izquierda', 'izquierdo'],
    bilateral: ['bilateral', 'ambos lados', 'ambas rodillas', 'ambos hombros']
  },

  // Vocabulario genérico de hallazgos, no atado a una región específica.
  findingKeywords: [
    { code: 'dolor', synonyms: ['dolor'] },
    { code: 'derrame', synonyms: ['derrame articular', 'derrame'] },
    { code: 'bloqueo', synonyms: ['bloqueo articular', 'bloqueo'] },
    { code: 'inestabilidad', synonyms: ['inestabilidad'] },
    { code: 'inflamacion', synonyms: ['inflamación', 'inflamacion', 'edema'] }
  ],

  // Palabras que indican que un hallazgo semiológico fue NEGATIVO/normal,
  // es decir que NO debe interpretarse como lesión.
  negativePolarityMarkers: ['negativo', 'negativa', 'firme', 'estable', 'sin dolor', 'conservad'],
  positivePolarityMarkers: ['positivo', 'positiva', 'dudoso', 'dudosa', 'laxo', 'laxa']
};

/** Minúsculas + sin tildes, para matching insensible a acentos. */
function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

module.exports = { ANATOMY_TAXONOMY, normalizeText };
