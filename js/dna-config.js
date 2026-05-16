/**
 * CitaDoc — DNA Config Generator
 * Fase 3: convierte DNA_SPECS[dna] en web_config estructurado.
 *
 * PIPELINE:
 *   doctor identity → classifyDNA → getDNASpec → generateWebConfig → save → renderer consume
 *
 * REGLA: el renderer NO inventa valores. Los lee de web_config.
 * REGLA: web_config NO se escribe manualmente. Se genera desde el spec.
 * REGLA: los campos existentes (headline, photo, etc.) se preservan — backward compatible.
 */

/**
 * Genera el web_config completo desde el DNA spec.
 * Mergeado con el config existente — no destruye datos previos.
 *
 * @param {string} dnaKey          - 'surgical-authority' | 'performance-athletic' | ...
 * @param {Object} doctor          - row de medicos desde Supabase
 * @param {Object} existingConfig  - web_config actual del médico (puede estar vacío)
 * @returns {Object}               - web_config expandido listo para guardar
 */
window.generateWebConfigFromDNA = function(dnaKey, doctor, existingConfig) {
  if (!window.DNA_SPECS) {
    console.error('[DNA Config] DNA_SPECS no cargado. Incluir js/dna-specs.js antes.');
    return existingConfig || {};
  }

  var spec = window.getDNASpec(dnaKey);
  var base = existingConfig || {};

  return {

    // ── CAMPOS EXISTENTES PRESERVADOS (backward compatible) ──────
    headline:           base.headline           || null,
    subheadline:        base.subheadline        || null,
    about_text:         base.about_text         || null,
    doctor_story:       base.doctor_story       || null,
    philosophy:         base.philosophy         || null,
    sobre_quote:        base.sobre_quote        || null,
    doctor_photo_url:   base.doctor_photo_url   || null,
    logo_url:           base.logo_url           || null,
    primary_color:      base.primary_color      || spec.colors.accentPrimary,
    services:           base.services           || [],
    testimonials:       base.testimonials       || [],
    differentiators:    base.differentiators    || [],
    seo_title:          base.seo_title          || null,
    seo_description:    base.seo_description    || null,
    cta_primary:        base.cta_primary        || null,
    cta_final:          base.cta_final          || null,
    patient_experience: base.patient_experience || null,
    eyebrow:            base.eyebrow            || null,
    web_status:         base.web_status         || 'draft',

    // ── IDENTITY — qué DNA es este sitio ─────────────────────────
    dna:                dnaKey,
    visual_dna:         dnaKey,  // alias para compatibilidad con renderer actual

    // ── COMPOSITION ───────────────────────────────────────────────
    heroLayout:         spec.composition.heroLayout,
    sectionRhythm:      spec.composition.sectionRhythm,
    layoutDensity:      spec.composition.layoutDensity,
    storytelling:       spec.composition.storytelling,
    visualTension:      spec.composition.visualTension,
    sectionOrder:       spec.composition.sectionOrder,

    // ── TYPOGRAPHY ────────────────────────────────────────────────
    typographyScale:      spec.typography.typographyScale,
    headlineWeight:       spec.typography.headlineWeight,
    headlineLineHeight:   spec.typography.headlineLineHeight,
    headlineLetterSpacing:spec.typography.headlineLetterSpacing,
    headlineSizeClamp:    spec.typography.headlineSizeClamp,
    headlineEmStyle:      spec.typography.headlineEmStyle,
    monoUsage:            spec.typography.monoUsage,
    eyebrowShape:         spec.typography.eyebrowShape,
    eyebrowLetterSpacing: spec.typography.eyebrowLetterSpacing,

    // ── SPACING ───────────────────────────────────────────────────
    spacingScale:         spec.spacing.spacingScale,
    containerWidth:       spec.spacing.containerWidth,
    verticalBreathing:    spec.spacing.verticalBreathing,
    sectionGap:           spec.spacing.sectionGap,

    // ── IMAGERY ───────────────────────────────────────────────────
    imageryStyle:         spec.imagery.imageryPriority,
    portraitStyle:        spec.imagery.portraitStyle,
    overlayStyle:         spec.imagery.overlayStyle,
    overlayValue:         spec.imagery.overlayValue,
    heroImageDominance:   spec.imagery.heroImageDominance,
    photoFilter:          spec.imagery.photoFilter,
    logoVisibleInHero:    spec.imagery.logoVisibleInHero,
    photoCard:            spec.imagery.photoCard || null,

    // ── CTA SYSTEM ────────────────────────────────────────────────
    ctaPsychology:          spec.cta.ctaPsychology,
    ctaLayout:              spec.cta.ctaLayout,
    ctaMaxWidth:            spec.cta.ctaMaxWidth,
    ctaPrimaryHeight:       spec.cta.ctaPrimaryHeight,
    ctaPrimaryBorderRadius: spec.cta.ctaPrimaryRadius,
    ctaSecondaryStyle:      spec.cta.ctaSecondaryStyle,
    ctaPersistence:         spec.cta.ctaPersistence,

    // ── MOBILE ────────────────────────────────────────────────────
    mobileBehavior:   spec.mobile.mobileBehavior,
    bottomBarStyle:   spec.mobile.bottomBarStyle,
    bottomBarHeight:  spec.mobile.bottomBarHeight,
    scrollVelocity:   spec.mobile.scrollVelocity,
    heroMobileType:   spec.mobile.heroMobileType,
    heroInvasionPx:   spec.mobile.heroInvasionPx,

    // ── MODULES ───────────────────────────────────────────────────
    servicesLayout:      spec.modules.servicesLayout,
    cardStyle:           spec.modules.cardStyle,
    cardBorderRadius:    spec.modules.cardBorderRadius,
    moduleDensity:       spec.modules.moduleDensity,
    navigationBehavior:  spec.modules.navigationBehavior,
    signatureSection:    spec.modules.signatureSection,
    fullBleedSection:    spec.modules.fullBleedSection,
    uniqueSection:       spec.modules.uniqueSection,

    // ── COLORS (tokens — override por logo analysis en Fase 9) ────
    dnaColors: spec.colors,

    // ── META ──────────────────────────────────────────────────────
    _generatedAt: new Date().toISOString(),
    _dnaVersion:  '1.0'
  };
};

/**
 * Pipeline completo: doctor → DNA → web_config
 * Punto de entrada del Website Identity Engine.
 *
 * @param {Object} doctor          - row completo de medicos
 * @param {Object} existingConfig  - web_config existente (preserved)
 * @returns {Object}               - web_config listo para guardar en DB
 */
window.buildWebsiteConfig = function(doctor, existingConfig) {
  // 1. Clasificar DNA por especialidad (Fase 9 refinará con logo + foto)
  var esp = (doctor.especialidades || [])[0] || '';
  var dnaKey = window.classifyDNA(esp);

  // 2. Si el médico ya tiene un DNA asignado, respetarlo
  if (existingConfig && existingConfig.dna) {
    dnaKey = existingConfig.dna;
  }

  // 3. Generar config desde el spec
  return window.generateWebConfigFromDNA(dnaKey, doctor, existingConfig);
};

/**
 * Aplicar web_config al renderer.
 * Extrae los valores que el renderer necesita del config expandido.
 * Mantiene backward compatibility — si un campo no existe, usa el spec como fallback.
 *
 * @param {Object} wc    - web_config desde Supabase
 * @returns {Object}     - objeto normalizado que el renderer consume
 */
window.normalizeWebConfig = function(wc) {
  if (!wc) return {};
  var dnaKey = wc.dna || wc.visual_dna || 'surgical-authority';
  var spec = window.getDNASpec(dnaKey);

  // Campos con fallback al spec si el config no los tiene
  return {
    // Identity
    dna:              dnaKey,
    visual_dna:       dnaKey,

    // Content (del médico — no del spec)
    headline:         wc.headline,
    subheadline:      wc.subheadline,
    about_text:       wc.about_text || wc.doctor_story,
    philosophy:       wc.philosophy || wc.sobre_quote,
    primary_color:    wc.primary_color || spec.colors.accentPrimary,
    doctor_photo_url: wc.doctor_photo_url,
    logo_url:         wc.logo_url,
    services:         wc.services || [],
    cta_final:        wc.cta_final,

    // Composition — del config si existe, sino del spec
    heroLayout:       wc.heroLayout       || spec.composition.heroLayout,
    sectionRhythm:    wc.sectionRhythm    || spec.composition.sectionRhythm,
    layoutDensity:    wc.layoutDensity    || spec.composition.layoutDensity,
    sectionOrder:     wc.sectionOrder     || spec.composition.sectionOrder,
    storytelling:     wc.storytelling     !== undefined ? wc.storytelling : spec.composition.storytelling,

    // Typography
    headlineWeight:       wc.headlineWeight       || spec.typography.headlineWeight,
    headlineLineHeight:   wc.headlineLineHeight    || spec.typography.headlineLineHeight,
    headlineSizeClamp:    wc.headlineSizeClamp     || spec.typography.headlineSizeClamp,
    headlineLetterSpacing:wc.headlineLetterSpacing || spec.typography.headlineLetterSpacing,
    headlineEmStyle:      wc.headlineEmStyle       || spec.typography.headlineEmStyle,
    monoUsage:            wc.monoUsage             || spec.typography.monoUsage,

    // Spacing
    verticalBreathing: wc.verticalBreathing || spec.spacing.verticalBreathing,
    containerWidth:    wc.containerWidth    || spec.spacing.containerWidth,
    sectionGap:        wc.sectionGap        || spec.spacing.sectionGap,

    // Imagery
    overlayValue:       wc.overlayValue      || spec.imagery.overlayValue,
    photoFilter:        wc.photoFilter       || spec.imagery.photoFilter,
    portraitStyle:      wc.portraitStyle     || spec.imagery.portraitStyle,
    logoVisibleInHero:  wc.logoVisibleInHero !== undefined ? wc.logoVisibleInHero : spec.imagery.logoVisibleInHero,

    // CTA
    ctaLayout:              wc.ctaLayout              || spec.cta.ctaLayout,
    ctaPrimaryBorderRadius: wc.ctaPrimaryBorderRadius || spec.cta.ctaPrimaryRadius,
    ctaMaxWidth:            wc.ctaMaxWidth            || spec.cta.ctaMaxWidth,
    ctaSecondaryStyle:      wc.ctaSecondaryStyle      || spec.cta.ctaSecondaryStyle,

    // Mobile
    heroMobileType: wc.heroMobileType || spec.mobile.heroMobileType,
    heroInvasionPx: wc.heroInvasionPx || spec.mobile.heroInvasionPx,
    scrollVelocity: wc.scrollVelocity || spec.mobile.scrollVelocity,

    // Modules
    servicesLayout:   wc.servicesLayout   || spec.modules.servicesLayout,
    cardStyle:        wc.cardStyle        || spec.modules.cardStyle,
    cardBorderRadius: wc.cardBorderRadius || spec.modules.cardBorderRadius,
    signatureSection: wc.signatureSection || spec.modules.signatureSection,
    uniqueSection:    wc.uniqueSection    || spec.modules.uniqueSection,

    // Colors
    dnaColors: wc.dnaColors || spec.colors
  };
};
