/**
 * CitaDoc — DNA Specs System
 * Fuente de verdad visual del Website Engine.
 *
 * REGLA: Este archivo NO renderiza, NO genera HTML, NO toca el DOM.
 * SOLO define las reglas que el renderer ejecuta sin improvisar.
 *
 * El renderer lee DNA_SPECS[dna] y materializa.
 * El renderer NO decide. Solo ejecuta.
 */

window.DNA_SPECS = {

  // ═══════════════════════════════════════════════════════════════
  // DNA 1 — SURGICAL AUTHORITY
  // Neurocirugía · Cirugía · Cardiología · Oncología · Ortopedia
  // Feeling: precisión clínica · autoridad · lujo silencioso
  // ═══════════════════════════════════════════════════════════════
  'surgical-authority': {

    // 1. COMPOSITION
    composition: {
      heroLayout:       'fullbleed-overlay',      // foto full-bleed, texto sobre overlay
      sectionRhythm:    'asymmetric-editorial',    // secciones con peso visual distinto, no simétrico
      layoutDensity:    'high-air',               // mucho whitespace, pocas secciones
      storytelling:     false,                    // NO narrativa emocional — autoridad fría
      visualTension:    'silent',                 // tensión por contraste, no por energía
      sectionOrder: [
        'hero',
        'surgical-record',   // ficha clínica con mono font — sección signature
        'procedure-index',   // tabla PROCEDIMIENTO / RECUPERACIÓN / TÉCNICA — full-bleed navy
        'caso-clinico',      // reporte editorial con foto B&W — ningún template lo tiene
        'sedes',
        'cta-minimal'
      ]
    },

    // 2. TYPOGRAPHY
    typography: {
      typographyScale:      'luxury-editorial',
      headlineFontFamily:   'Fraunces',
      headlineWeight:       700,
      headlineSizeClamp:    'clamp(2.8rem, 5vw, 6rem)',
      headlineLineHeight:   0.88,
      headlineLetterSpacing: '-.055em',
      headlineTextTransform: 'none',
      headlineEmStyle: {
        display:       'inline',
        fontStyle:     'italic',
        fontWeight:    300,
        colorRole:     'white-muted',   // rgba(255,255,255,.65)
        textTransform: 'none'
      },
      bodyFontFamily:   'DM Sans',
      bodySize:         '.88rem',
      bodyLineHeight:   1.82,
      bodyWeight:       400,
      monoUsage:        'record-keys-only',  // solo en claves de ficha clínica
      monoFont:         "ui-monospace, 'SF Mono', monospace",
      eyebrowShape:         'rectangle-sharp',
      eyebrowLetterSpacing: '.2em',
      eyebrowTextTransform: 'uppercase',
      eyebrowFontSize:      '.57rem'
    },

    // 3. SPACING
    spacing: {
      spacingScale:       'large',
      containerWidth:     '7%',               // padding lateral sections
      verticalBreathing:  '6rem',             // padding top/bottom secciones desktop
      verticalMobile:     '5rem',
      sectionGap:         'border-bottom',    // separador entre secciones
      heroBodyPadding:    '0 7% calc(6.5rem + env(safe-area-inset-bottom))'
    },

    // 4. IMAGERY
    imagery: {
      imageryPriority:     'authority-portrait',    // médico es protagonista dominante
      portraitStyle:       'clinical-bw',           // about: foto en B&W
      overlayStyle:        'dual-axis-navy',         // gradiente izquierda + bottom en navy
      overlayValue:        'linear-gradient(90deg,rgba(8,25,45,.97) 0%,rgba(8,25,45,.8) 35%,rgba(8,25,45,.28) 58%,transparent 76%), linear-gradient(0deg,rgba(8,25,45,.7) 0%,transparent 50%)',
      imageCropping:       'object-position: center 10%',
      heroImageDominance:  'full',            // foto ocupa todo el hero en mobile
      photoFilter:         'contrast(1.1) brightness(0.85) saturate(1.1)',
      kenBurns:            false,
      logoVisibleInHero:   true              // wordmark sobre el eyebrow
    },

    // 5. CTA SYSTEM
    cta: {
      ctaPsychology:        'quiet-confidence',     // no agresivo — autoridad silenciosa
      ctaLayout:            'column',               // CTAs en columna, no en fila
      ctaMaxWidth:          '300px',
      ctaPrimaryHeight:     '56px',
      ctaPrimaryRadius:     '14px',
      ctaPrimaryWeight:     700,
      ctaPrimaryTransform:  'none',
      ctaPrimarySpacing:    '0',
      ctaSecondaryStyle:    'ghost-transparent',    // rgba(255,255,255,.07) + border rgba white
      ctaPersistence:       'sticky-three-col'      // sticky bar: Agendar | WA | Llamar
    },

    // 6. MOBILE
    mobile: {
      mobileBehavior:   'immersive-scroll',   // scroll lento, secciones respiran
      bottomBarStyle:   'three-col-minimal',  // [Agendar flex:1] [WA 90px] [Call 90px]
      bottomBarHeight:  '52px',
      thumbZoneBias:    'bottom',             // CTAs en zona de pulgar
      scrollVelocity:   'slow',              // sensación de lectura editorial
      heroMobileType:   'fullbleed-invasion', // foto full + bloque blanco invade con margin-top negativo
      heroInvasionPx:   '-72px'             // cuánto invade el bloque blanco sobre la foto
    },

    // 7. SERVICES / MODULES
    modules: {
      servicesLayout:     'procedure-index',      // tabla: número / nombre / recuperación / técnica
      cardStyle:          'hard-minimal',          // sin border-radius, sin sombras decorativas
      cardBorderRadius:   '0',
      moduleDensity:      'sparse',               // pocos módulos, cada uno con peso
      navigationBehavior: 'minimal-floating',      // nav transparente → solid al scroll
      signatureSection:   'surgical-record',       // ficha clínica con mono font — DNA signature
      fullBleedSection:   'procedure-index',       // navy 100vw que rompe el ritmo
      uniqueSection:      'caso-clinico'           // reporte editorial — ningún template lo tiene
    },

    // 8. COLORS (tokens semánticos — el primary_color del médico overridea accentPrimary)
    colors: {
      background:            '#FFFFFF',
      surface:               '#F7F8FA',
      border:                '#E5E7EB',
      ink:                   '#0D1B2A',
      inkMuted:              '#1E293B',
      muted:                 '#475569',
      accentPrimary:         '#0B2341',   // override por logo del médico
      accentDark:            '#08192D',
      accentBright:          '#1D4ED8',
      heroBackground:        '#08192D',
      heroTextPrimary:       '#FFFFFF',
      heroTextMuted:         'rgba(255,255,255,.65)',
      navScrolledBg:         'rgba(8,25,45,.96)',
      navInitialTextColor:   '#FFFFFF'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DNA 2 — PERFORMANCE ATHLETIC
  // Traumatología · Ortopedia · Fisioterapia · Medicina deportiva
  // Feeling: energía · movimiento · recuperación · rendimiento
  // ═══════════════════════════════════════════════════════════════
  'performance-athletic': {

    // 1. COMPOSITION
    composition: {
      heroLayout:       'split-50-50',           // foto derecha full-height, texto izquierda blanco
      sectionRhythm:    'alternating-energy',     // fondos alternos: blanco / surface
      layoutDensity:    'medium',                 // densidad media — información densa pero respira
      storytelling:     true,                     // sí narrativa: "tu recuperación", "volvé a moverte"
      visualTension:    'dynamic',               // energía visual en composición y tipografía
      sectionOrder: [
        'hero',
        'performance-metrics',   // 4 stats: pacientes / años / especialidades / recuperación
        'specialties-grid',      // grid cards con ícono + nombre + descripción
        'recovery-philosophy',   // sección con foto acción (deportista) + copy energético
        'about',
        'sedes',
        'cta-strong'
      ]
    },

    // 2. TYPOGRAPHY
    typography: {
      typographyScale:      'bold-impact',
      headlineFontFamily:   'Fraunces',
      headlineWeight:       900,
      headlineSizeClamp:    'clamp(3rem, 6.5vw, 8.5rem)',
      headlineLineHeight:   0.85,
      headlineLetterSpacing: '-.07em',
      headlineTextTransform: 'none',
      headlineEmStyle: {
        display:       'block',
        fontStyle:     'normal',
        fontWeight:    900,
        colorRole:     'accent',    // color primario del médico
        textTransform: 'none'
      },
      bodyFontFamily:   'DM Sans',
      bodySize:         '.9rem',
      bodyLineHeight:   1.72,
      bodyWeight:       400,
      monoUsage:        'none',
      eyebrowShape:         'pill-sm',
      eyebrowLetterSpacing: '.25em',
      eyebrowTextTransform: 'uppercase',
      eyebrowFontSize:      '.58rem'
    },

    // 3. SPACING
    spacing: {
      spacingScale:       'medium',
      containerWidth:     '6%',
      verticalBreathing:  '5rem',
      verticalMobile:     '3.5rem',
      sectionGap:         'background-alternating',
      heroBodyPadding:    'clamp(80px,10vh,120px) 5% 80px 8%'
    },

    // 4. IMAGERY
    imagery: {
      imageryPriority:     'action-lifestyle',      // foto del médico + imágenes de movimiento
      portraitStyle:       'color-vivid',           // foto en color, contraste alto
      overlayStyle:        'none',                  // split hero: sin overlay en desktop
      overlayValue:        null,
      imageCropping:       'object-position: center 8%',
      heroImageDominance:  'half',                  // foto en 50% derecha del hero
      photoFilter:         'contrast(1.12) brightness(0.97) saturate(1.18)',
      kenBurns:            false,
      logoVisibleInHero:   false,
      decorativeAccent: {
        bottomBar:   true,        // barra de color en el borde inferior de la foto
        barHeight:   '5px',
        gradientLine: true        // línea gradiente horizontal debajo de los CTAs
      }
    },

    // 5. CTA SYSTEM
    cta: {
      ctaPsychology:        'energetic-action',     // verbos de movimiento: Recuperate, Volvé
      ctaLayout:            'row',                  // CTAs en fila — más app-like
      ctaMaxWidth:          'none',
      ctaPrimaryHeight:     '56px',
      ctaPrimaryRadius:     '50px',                 // pill — más dinámico que el rectangular surgical
      ctaPrimaryWeight:     700,
      ctaPrimaryTransform:  'none',
      ctaPrimarySpacing:    '0',
      ctaSecondaryStyle:    'ghost-border',
      ctaPersistence:       'sticky-three-col'
    },

    // 6. MOBILE
    mobile: {
      mobileBehavior:   'app-feel',         // se siente como app deportiva nativa
      bottomBarStyle:   'three-col-energetic',
      bottomBarHeight:  '52px',
      thumbZoneBias:    'bottom',
      scrollVelocity:   'medium',
      heroMobileType:   'split-stacked',    // en mobile: foto arriba, texto abajo (no fullbleed)
      heroInvasionPx:   null
    },

    // 7. SERVICES / MODULES
    modules: {
      servicesLayout:     'specialty-cards',        // grid de cards con ícono
      cardStyle:          'elevated-rounded',        // border-radius:20px, hover lift
      cardBorderRadius:   '20px',
      moduleDensity:      'medium',
      navigationBehavior: 'solid-scrolled',
      signatureSection:   'performance-metrics',    // 4 stats clínicos grandes
      fullBleedSection:   null,
      uniqueSection:      'recovery-philosophy'     // foto deportista + copy de recuperación
    },

    // 8. COLORS
    colors: {
      background:            '#FFFFFF',
      surface:               '#EEF3FF',
      border:                '#DBEAFE',
      ink:                   '#0D1B2A',
      inkMuted:              '#1E3A5F',
      muted:                 '#4B5563',
      accentPrimary:         '#0E3B99',
      accentDark:            '#0B2D55',
      accentBright:          '#2563EB',
      heroBackground:        '#FFFFFF',
      heroTextPrimary:       '#0D1B2A',
      heroTextMuted:         '#4B5563',
      navScrolledBg:         'rgba(255,255,255,.97)',
      navInitialTextColor:   '#0D1B2A'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DNA 3 — SOFT CLINICAL LUXURY
  // Odontología estética · Dermatología · Cirugía plástica · Estética
  // Feeling: calma · premium · elegancia femenina · cuidado
  // ═══════════════════════════════════════════════════════════════
  'soft-clinical-luxury': {

    // 1. COMPOSITION
    composition: {
      heroLayout:       'split-photo-card',       // foto en card con box-shadow — diferencia clave
      sectionRhythm:    'gentle-flow',            // transiciones suaves, secciones fluidas
      layoutDensity:    'generous-air',           // máximo whitespace, máxima elegancia
      storytelling:     true,                     // narrativa: "tu confianza", "tu sonrisa", "tu cuidado"
      visualTension:    'soft-luxury',            // tensión a través de refinamiento, no contraste
      sectionOrder: [
        'hero',
        'trust-strip',        // 3 puntos de confianza sin números — solo texto
        'treatments',         // cards redondeadas con fotografía suave
        'experience',         // foto luminosa del consultorio + copy de experiencia
        'about',
        'sedes',
        'cta-delicate'
      ]
    },

    // 2. TYPOGRAPHY
    typography: {
      typographyScale:      'refined-serif',
      headlineFontFamily:   'Fraunces',
      headlineWeight:       700,
      headlineSizeClamp:    'clamp(2.2rem, 4vw, 4.8rem)',
      headlineLineHeight:   1.04,
      headlineLetterSpacing: '-.025em',
      headlineTextTransform: 'none',
      headlineEmStyle: {
        display:       'block',
        fontStyle:     'italic',
        fontWeight:    300,
        colorRole:     'accent-muted',   // tono suave del color primario
        textTransform: 'none'
      },
      bodyFontFamily:   'DM Sans',
      bodySize:         '.9rem',
      bodyLineHeight:   1.85,
      bodyWeight:       300,             // más liviano — sensación suave
      monoUsage:        'none',
      eyebrowShape:         'pill-rounded',
      eyebrowLetterSpacing: '.22em',
      eyebrowTextTransform: 'uppercase',
      eyebrowFontSize:      '.57rem'
    },

    // 3. SPACING
    spacing: {
      spacingScale:       'generous',
      containerWidth:     '7%',
      verticalBreathing:  '6rem',
      verticalMobile:     '4rem',
      sectionGap:         'border-bottom',
      heroBodyPadding:    'clamp(80px,10vh,120px) 5% 80px 8%'
    },

    // 4. IMAGERY
    imagery: {
      imageryPriority:     'luminous-portrait',      // foto luminosa, cálida, aspiracional
      portraitStyle:       'color-soft',             // foto en color, contraste bajo, calidez alta
      overlayStyle:        'none',                   // split desktop: sin overlay
      overlayValue:        null,
      imageCropping:       'object-position: center 10%',
      heroImageDominance:  'card-wrapped',           // foto en card con border-radius y sombra
      photoFilter:         'contrast(1.0) brightness(1.07) saturate(0.88)',
      kenBurns:            false,
      logoVisibleInHero:   false,
      photoCard: {
        containerPadding: '50px 50px 50px 20px',
        borderRadius:     '40px',
        maxHeight:        '640px',
        boxShadow:        '0 32px 80px rgba(0,0,0,.12)',
        overflow:         'hidden'
      }
    },

    // 5. CTA SYSTEM
    cta: {
      ctaPsychology:        'delicate-invitation',   // "Reservá tu consulta" — no agresivo
      ctaLayout:            'column',
      ctaMaxWidth:          '320px',
      ctaPrimaryHeight:     '54px',
      ctaPrimaryRadius:     '50px',
      ctaPrimaryWeight:     600,
      ctaPrimaryTransform:  'none',
      ctaPrimarySpacing:    '0',
      ctaSecondaryStyle:    'ghost-tinted',          // fondo suave del color primario
      ctaPersistence:       'sticky-three-col'
    },

    // 6. MOBILE
    mobile: {
      mobileBehavior:   'spa-scroll',        // scroll suave, transiciones lentas
      bottomBarStyle:   'three-col-soft',
      bottomBarHeight:  '52px',
      thumbZoneBias:    'bottom',
      scrollVelocity:   'slow',
      heroMobileType:   'split-stacked',
      heroInvasionPx:   null
    },

    // 7. SERVICES / MODULES
    modules: {
      servicesLayout:     'treatment-cards',         // cards con foto + nombre + descripción
      cardStyle:          'elevated-soft',            // border-radius:20px, sombra suave
      cardBorderRadius:   '20px',
      moduleDensity:      'low',                     // pocos módulos, cada uno con protagonismo
      navigationBehavior: 'minimal-floating',
      signatureSection:   'experience',              // foto del consultorio + copy de experiencia
      fullBleedSection:   null,
      uniqueSection:      'trust-strip'              // 3 convicciones del médico — sin números
    },

    // 8. COLORS
    colors: {
      background:            '#FAF8FC',
      surface:               '#EDE7F6',
      border:                '#E9E0F0',
      ink:                   '#2B2430',
      inkMuted:              '#4A3D54',
      muted:                 '#7C6D8A',
      accentPrimary:         '#A78BC7',
      accentDark:            '#7C5FA5',
      accentBright:          '#B59AD5',
      heroBackground:        '#FAF8FC',
      heroTextPrimary:       '#2B2430',
      heroTextMuted:         '#7C6D8A',
      navScrolledBg:         'rgba(250,248,252,.97)',
      navInitialTextColor:   '#2B2430'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DNA 4 — WARM HUMAN CARE
  // Pediatría · Medicina familiar · Psicología · Ginecología
  // Feeling: humano · cercano · seguro · cálido
  // ═══════════════════════════════════════════════════════════════
  'warm-human-care': {

    // 1. COMPOSITION
    composition: {
      heroLayout:       'split-38-62',            // 38% texto / 62% foto — médico más presente
      sectionRhythm:    'conversational',         // secciones que "hablan" con el paciente
      layoutDensity:    'medium-low',             // respira, no denso — accesible
      storytelling:     true,                     // narrativa emocional: "tu familia", "te acompañamos"
      visualTension:    'warm-trust',             // tensión a través de calidez y cercanía
      sectionOrder: [
        'hero',
        'first-visit',          // "Cómo es tu primera consulta" — pasos 1-2-3 — sección signature
        'specialties-list',     // lista simple con descripción — no cards densas
        'about',
        'testimonials',         // testimonios reales — solo en este DNA
        'sedes',
        'cta-warm'
      ]
    },

    // 2. TYPOGRAPHY
    typography: {
      typographyScale:      'human-readable',
      headlineFontFamily:   'Fraunces',
      headlineWeight:       700,
      headlineSizeClamp:    'clamp(1.9rem, 3.5vw, 3.8rem)',
      headlineLineHeight:   1.05,
      headlineLetterSpacing: '-.02em',
      headlineTextTransform: 'none',
      headlineEmStyle: {
        display:       'block',
        fontStyle:     'italic',
        fontWeight:    400,
        colorRole:     'accent',
        textTransform: 'none'
      },
      bodyFontFamily:   'DM Sans',
      bodySize:         '.92rem',
      bodyLineHeight:   1.90,               // máximo line-height — más legible, más cálido
      bodyWeight:       400,
      monoUsage:        'none',
      eyebrowShape:         'pill-rounded',
      eyebrowLetterSpacing: '.06em',
      eyebrowTextTransform: 'none',         // sin uppercase — más conversacional
      eyebrowFontSize:      '.6rem'
    },

    // 3. SPACING
    spacing: {
      spacingScale:       'medium-low',
      containerWidth:     '6%',
      verticalBreathing:  '3.5rem',         // menos air — más accesible, menos distante
      verticalMobile:     '3rem',
      sectionGap:         'background-alternating',
      heroBodyPadding:    '80px 6% 80px 7%'
    },

    // 4. IMAGERY
    imagery: {
      imageryPriority:     'human-warmth',          // médico sonriendo — no posando
      portraitStyle:       'color-warm',             // foto en color, calidez alta
      overlayStyle:        'subtle-warmth',
      overlayValue:        'linear-gradient(270deg,transparent 40%,rgba(255,251,245,.08) 100%)',
      imageCropping:       'object-position: center 12%',
      heroImageDominance:  'prominent',              // 62% del hero — médico protagonista visual
      photoFilter:         'contrast(1.0) brightness(1.04) saturate(1.05)',
      kenBurns:            false,
      logoVisibleInHero:   false
    },

    // 5. CTA SYSTEM
    cta: {
      ctaPsychology:        'friendly-action',       // "Agendá tu consulta" — tono cercano
      ctaLayout:            'column',
      ctaMaxWidth:          '280px',
      ctaPrimaryHeight:     '54px',
      ctaPrimaryRadius:     '50px',
      ctaPrimaryWeight:     600,
      ctaPrimaryTransform:  'none',
      ctaPrimarySpacing:    '.01em',
      ctaSecondaryStyle:    'ghost-border',
      ctaPersistence:       'sticky-three-col'
    },

    // 6. MOBILE
    mobile: {
      mobileBehavior:   'friendly-app',      // se siente app amigable, no editorial
      bottomBarStyle:   'three-col-warm',
      bottomBarHeight:  '52px',
      thumbZoneBias:    'bottom',
      scrollVelocity:   'medium',
      heroMobileType:   'split-stacked',     // en mobile: foto arriba, texto abajo
      heroInvasionPx:   null
    },

    // 7. SERVICES / MODULES
    modules: {
      servicesLayout:     'simple-list',             // lista clara con descripción — no cards
      cardStyle:          'soft-rounded',
      cardBorderRadius:   '14px',
      moduleDensity:      'low',
      navigationBehavior: 'solid-scrolled',
      signatureSection:   'first-visit',             // "Cómo es tu primera consulta" — sección única
      fullBleedSection:   null,
      uniqueSection:      'testimonials'             // testimonios — solo warm human care los tiene
    },

    // 8. COLORS
    colors: {
      background:            '#FFFBF5',
      surface:               '#FFF7ED',
      border:                '#FED7AA',
      ink:                   '#1C0A00',
      inkMuted:              '#3B1506',
      muted:                 '#92400E',
      accentPrimary:         '#C2410C',
      accentDark:            '#7C2D12',
      accentBright:          '#EA580C',
      heroBackground:        '#FFFBF5',
      heroTextPrimary:       '#1C0A00',
      heroTextMuted:         '#92400E',
      navScrolledBg:         'rgba(255,251,245,.97)',
      navInitialTextColor:   '#1C0A00'
    }
  }

};

/**
 * Validación: si dos DNAs comparten heroLayout + sectionRhythm + ctaLayout + servicesLayout
 * es señal de que el sistema falló.
 *
 * DNA 1: fullbleed-overlay    / asymmetric-editorial  / column / procedure-index   ← único
 * DNA 2: split-50-50          / alternating-energy    / row    / specialty-cards   ← único
 * DNA 3: split-photo-card     / gentle-flow           / column / treatment-cards   ← único
 * DNA 4: split-38-62          / conversational        / column / simple-list       ← único
 *
 * Los 4 son estructuralmente distintos.
 */

/**
 * Helper: obtener spec por DNA key
 * Uso: const spec = getDNASpec('surgical-authority');
 */
window.getDNASpec = function(dnaKey) {
  var spec = window.DNA_SPECS[dnaKey];
  if (!spec) {
    console.warn('[DNA] spec not found for: ' + dnaKey + ' — defaulting to surgical-authority');
    return window.DNA_SPECS['surgical-authority'];
  }
  return spec;
};

/**
 * Helper: clasificar DNA automáticamente por especialidad
 * El identity engine (Fase 9) refinará esto con logo + foto + tono
 */
window.classifyDNA = function(especialidad) {
  var e = (especialidad || '').toLowerCase();

  var surgical = ['cirugía','cirugia','neurocirugía','neuocirugia','cardiología','cardiologia','oncología','oncologia','hepatología','hepatologia','vascular','transplante'];
  var performance = ['traumatología','traumatologia','ortopedia','fisioterapia','deport','rehabilitación','rehabilitacion','kinesiología','kinesiologia','fisiatría','fisiatria'];
  var softLuxury = ['odontología','odontologia','dental','dermatología','dermatologia','estética','estetica','plástica','plastica','nutrición','nutricion','periodoncia'];
  var warmHuman = ['pediatría','pediatria','pediatra','familiar','psicología','psicologia','psiquiatría','psiquiatria','ginecología','ginecologia','geriatría','geriatria','terapia'];

  if (surgical.some(function(k){ return e.indexOf(k) !== -1; }))   return 'surgical-authority';
  if (performance.some(function(k){ return e.indexOf(k) !== -1; })) return 'performance-athletic';
  if (softLuxury.some(function(k){ return e.indexOf(k) !== -1; })) return 'soft-clinical-luxury';
  if (warmHuman.some(function(k){ return e.indexOf(k) !== -1; }))  return 'warm-human-care';

  return 'surgical-authority'; // fallback premium
};
