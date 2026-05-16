/**
 * CitaDoc — Composition Engine
 * Fase 4: planWebsiteComposition() — el plan narrativo del sitio.
 *
 * REGLA: este archivo NO renderiza, NO genera HTML, NO toca el DOM.
 * REGLA: el renderer NO decide qué sección sigue. Lo decide este engine.
 * REGLA: si dos DNAs producen el mismo orden psicológico, el sistema falló.
 *
 * Cada sección es un objeto {type, priority, config} que el renderer materializa.
 * El type es el identificador del módulo. El renderer tiene un módulo por type.
 */

/**
 * MÓDULOS DISPONIBLES
 * El renderer implementa uno por cada type.
 * Cada DNA usa un subconjunto distinto — nunca el mismo set.
 */
var SECTION_TYPES = {
  // ── SURGICAL AUTHORITY ─────────────────────────────
  'hero-editorial':            'Hero full-bleed, bloque blanco invade foto desde abajo, H1 serif dominante',
  'surgical-record':           'Ficha clínica con fuente mono — formación, técnica, sede, atención',
  'procedure-index':           'Tabla navy full-bleed: PROCEDIMIENTO / RECUPERACIÓN / TÉCNICA',
  'caso-clinico':              'Reporte editorial: imagen B&W + datos clínicos mono + texto reporte médico',
  'booking-minimal':           'CTA limpio: H2 serif + subtext mínimo + botón sin adornos',

  // ── PERFORMANCE ATHLETIC ───────────────────────────
  'hero-split-bold':           'Hero split 50/50: H1 enorme 900-weight, foto a sangre derecha sin overlay',
  'recovery-metrics':          'Strip horizontal: 4 métricas grandes — tiempo recuperación, técnica, éxito',
  'specialties-grid':          'Grid cards con ícono SVG + nombre + descripción — layout denso y energético',
  'recovery-philosophy':       'Foto acción (deportista) full-width + copy energético sobre movimiento',
  'about-performance':         'Médico con credenciales deportivas — foto color + bio de trayectoria activa',
  'booking-cta-strong':        'CTA agresivo: headline de movimiento + botón pill + stat social proof',

  // ── SOFT CLINICAL LUXURY ───────────────────────────
  'hero-soft-card':            'Hero split: foto en card con box-shadow 80px + border-radius 40px',
  'trust-convictions':         'Tres convicciones del médico — sin números, solo texto editorial refinado',
  'treatments-luxury':         'Cards con foto del tratamiento + nombre + descripción suave',
  'experience-section':        'Foto luminosa del consultorio + copy de experiencia y cuidado',
  'about-soft':                'Médico en luz natural + quote en serif italic + bio sensible',
  'booking-delicate':          'CTA delicado: serif headline suave + botón pill + link secundario discreto',

  // ── WARM HUMAN CARE ────────────────────────────────
  'hero-warm-split':           'Hero 38/62: más foto que texto — médico protagonista visual, no el headline',
  'first-visit-steps':         'Pasos 1-2-3: "Cómo es tu primera consulta" — reduce ansiedad del paciente',
  'specialties-simple':        'Lista clara sin cards: nombre de especialidad + descripción conversacional',
  'about-human':               'Médico sonriendo + quote emocional + bio en primera persona',
  'testimonials':              'Testimonios reales — solo este DNA los tiene por su psicología de confianza',
  'booking-warm':              'CTA cálido: headline emocional + botón + link WhatsApp prominente',

  // ── COMPARTIDOS (pueden aparecer en múltiples DNAs con config distinta) ──
  'sedes':                     'Sedes de atención — visualización varía por DNA',
  'footer':                    'Footer: logo + CitaDoc Health Network — siempre presente'
};

/**
 * Planes de composición por DNA.
 * Cada plan es la secuencia narrativa y psicológica completa del sitio.
 *
 * priority: 'dominant' | 'primary' | 'supporting' | 'ambient'
 *   dominant  → sección que define el primer impacto
 *   primary   → contenido de alta densidad informativa
 *   supporting → contexto y credibilidad
 *   ambient   → cierre suave, acción persistente
 */
var COMPOSITION_PLANS = {

  // ═══════════════════════════════════════════════════════════════════
  // SURGICAL AUTHORITY
  // Narrativa: "Este médico es una institución. No necesita convencerte."
  // Orden psicológico: identidad → evidencia clínica → procedimientos → caso real → acción silenciosa
  // ═══════════════════════════════════════════════════════════════════
  'surgical-authority': [
    {
      type:     'hero-editorial',
      priority: 'dominant',
      config: {
        textPosition:   'bottom-invasive',     // bloque blanco invade la foto desde abajo
        ctaCount:       1,                     // un solo CTA — sin WhatsApp en el hero
        showSubheadline: false                 // solo H1 + tag de especialidad — nada más
      }
    },
    {
      type:     'surgical-record',
      priority: 'primary',
      config: {
        fields: ['especialidad','formacion','registro','sede','atencion'],
        showBio: true,                         // texto de enfoque clínico al costado
        backgroundRole: 'surface'             // fondo --s para romper ritmo con el hero
      }
    },
    {
      type:     'procedure-index',
      priority: 'primary',
      config: {
        fullBleed:  true,                      // 100vw — navy — rompe el grid
        columns:    ['procedimiento','recuperacion','tecnica'],
        maxItems:   6
      }
    },
    {
      type:     'caso-clinico',
      priority: 'supporting',
      config: {
        imageStyle:   'grayscale',             // foto B&W — clínico, no decorativo
        dataFormat:   'monospace-report',      // datos en mono sobre la imagen
        textTone:     'clinical-editorial'     // texto de reporte médico, no copy de marketing
      }
    },
    {
      type:     'sedes',
      priority: 'supporting',
      config: { style: 'text-minimal' }        // solo texto — sin cards decorativas
    },
    {
      type:     'booking-minimal',
      priority: 'ambient',
      config: {
        headlineStyle: 'serif-quiet',          // headline en Fraunces, sin urgencia
        ctaVerb:       'Agendar consulta',     // no "¡Reservá ahora!" — solo "Agendar consulta"
        showWhatsApp:  false                   // WA solo en sticky bar
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // PERFORMANCE ATHLETIC
  // Narrativa: "Este médico te va a devolver el movimiento. Siente la energía."
  // Orden psicológico: impacto visual → credenciales de rendimiento → servicios → historia → acción fuerte
  // ═══════════════════════════════════════════════════════════════════
  'performance-athletic': [
    {
      type:     'hero-split-bold',
      priority: 'dominant',
      config: {
        headlineSize:    'maximum',            // H1 al máximo — 900 weight, comprimido
        ctaLayout:       'row',               // dos CTAs en fila — dinámico
        showWhatsApp:    true,                // WhatsApp visible en hero — este DNA lo permite
        decorativeAccent: true               // barra de color en borde inferior de la foto
      }
    },
    {
      type:     'recovery-metrics',
      priority: 'primary',
      config: {
        metrics: ['anos_experiencia','especialidades','tecnica','atencion'],
        layout:  'horizontal-strip',         // strip ancho sin padding lateral
        style:   'bold-numbers'              // números grandes, labels en mono
      }
    },
    {
      type:     'specialties-grid',
      priority: 'primary',
      config: {
        layout:       'card-grid',
        cardStyle:    'elevated',            // hover: lift + shadow
        iconStyle:    'svg-stroke',          // SVG outline — no emoji
        maxItems:     6
      }
    },
    {
      type:     'recovery-philosophy',
      priority: 'supporting',
      config: {
        imageRole:   'action-lifestyle',     // foto del médico en movimiento o con paciente activo
        copyTone:    'energetic-recovery',   // "Recuperá tu rendimiento", "Volvé a moverte"
        layout:      'split-image-text'
      }
    },
    {
      type:     'about-performance',
      priority: 'supporting',
      config: {
        photoStyle: 'color-vivid',
        showCreds:  true,                    // credenciales deportivas prominentes
        bioTone:    'active-trayectoria'
      }
    },
    {
      type:     'sedes',
      priority: 'supporting',
      config: { style: 'card-compact' }
    },
    {
      type:     'booking-cta-strong',
      priority: 'ambient',
      config: {
        ctaVerb:       'Recuperate hoy',
        headlineStyle: 'action-oriented',
        showSocialProof: true               // "Más de X pacientes recuperados"
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // SOFT CLINICAL LUXURY
  // Narrativa: "Esto es un ritual de cuidado. Mereces lo mejor."
  // Orden psicológico: calma visual → convicciones → tratamientos → experiencia → historia → acción delicada
  // ═══════════════════════════════════════════════════════════════════
  'soft-clinical-luxury': [
    {
      type:     'hero-soft-card',
      priority: 'dominant',
      config: {
        photoCard:       true,               // foto en card con shadow extremo
        ctaLayout:       'column',
        ctaVerb:         'Reservar consulta',
        eyebrowStyle:    'pill-refined',
        showSubheadline: true
      }
    },
    {
      type:     'trust-convictions',
      priority: 'primary',
      config: {
        format:  'three-statements',         // tres afirmaciones del médico — sin bullets, sin números
        tone:    'luxury-editorial',
        layout:  'centered-generous'        // centrado con mucho whitespace
      }
    },
    {
      type:     'treatments-luxury',
      priority: 'primary',
      config: {
        cardStyle:  'elevated-rounded',     // border-radius:20px, shadow suave
        showPhoto:  false,                  // sin foto en las cards — elegancia por texto
        maxItems:   4
      }
    },
    {
      type:     'experience-section',
      priority: 'supporting',
      config: {
        imageRole:  'consultorio-luminoso',  // foto del espacio, no del médico
        copyTone:   'sensorial-experience',  // describe cómo se siente la consulta
        layout:     'fullbleed-soft'
      }
    },
    {
      type:     'about-soft',
      priority: 'supporting',
      config: {
        photoStyle:  'color-warm-light',
        quoteStyle:  'serif-italic-blockquote',
        bioTone:     'sensitive-professional'
      }
    },
    {
      type:     'sedes',
      priority: 'supporting',
      config: { style: 'text-elegant' }
    },
    {
      type:     'booking-delicate',
      priority: 'ambient',
      config: {
        ctaVerb:        'Reservar mi consulta',
        headlineStyle:  'serif-soft',
        showWhatsApp:   false,
        secondaryLink:  true               // link discreto como alternativa
      }
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // WARM HUMAN CARE
  // Narrativa: "Este médico te entiende. Estás en buenas manos."
  // Orden psicológico: conexión → reducción de ansiedad → servicios simples → historia personal → confianza social → acción cálida
  // ═══════════════════════════════════════════════════════════════════
  'warm-human-care': [
    {
      type:     'hero-warm-split',
      priority: 'dominant',
      config: {
        gridRatio:       '38/62',            // más foto que texto — médico protagonista
        ctaLayout:       'column',
        ctaVerb:         'Agendá tu consulta',
        eyebrowStyle:    'pill-conversational',
        subheadlineStyle: 'friendly-direct'
      }
    },
    {
      type:     'first-visit-steps',
      priority: 'primary',                  // ALTA PRIORIDAD — reduce ansiedad del primer contacto
      config: {
        steps:   3,
        format:  'numbered-friendly',       // 01 · 02 · 03 con iconos suaves y texto conversacional
        tone:    'reassuring',
        layout:  'horizontal-mobile-stacked'
      }
    },
    {
      type:     'specialties-simple',
      priority: 'primary',
      config: {
        layout:   'clean-list',             // lista simple — no grid denso
        showDesc: true,
        tone:     'accessible-language'    // lenguaje paciente, no técnico
      }
    },
    {
      type:     'about-human',
      priority: 'supporting',
      config: {
        photoStyle:  'smiling-warm',        // médico sonriendo — no posando
        quoteStyle:  'first-person',        // "En mi consultorio..." — primera persona
        bioTone:     'empathetic-close'
      }
    },
    {
      type:     'testimonials',
      priority: 'supporting',              // SOLO en este DNA — psicología de confianza social
      config: {
        style:    'cards-simple',
        maxItems: 3,
        source:   'wc.testimonials'        // viene del web_config del médico
      }
    },
    {
      type:     'sedes',
      priority: 'supporting',
      config: { style: 'card-warm' }
    },
    {
      type:     'booking-warm',
      priority: 'ambient',
      config: {
        ctaVerb:         'Agendá tu consulta',
        headlineStyle:   'serif-empathetic',
        showWhatsApp:    true,             // WhatsApp prominente — este DNA lo necesita
        whatsAppLabel:   'Escribinos'     // no "WhatsApp" — más conversacional
      }
    }
  ]
};

/**
 * planWebsiteComposition(config, doctor)
 * Devuelve el plan narrativo completo del sitio.
 *
 * @param {Object} config  - web_config normalizado (de normalizeWebConfig)
 * @param {Object} doctor  - row de medicos
 * @returns {Array}        - plan de secciones ordenado
 */
window.planWebsiteComposition = function(config, doctor) {
  var dnaKey = config.dna || config.visual_dna || 'surgical-authority';
  var plan = COMPOSITION_PLANS[dnaKey];

  if (!plan) {
    console.warn('[Composition] No plan for DNA: ' + dnaKey + ' — defaulting to surgical-authority');
    plan = COMPOSITION_PLANS['surgical-authority'];
  }

  // Filtrar secciones que no aplican si el médico no tiene datos
  var filtered = plan.filter(function(section) {
    // Si no hay sedes, no mostrar sección de sedes
    if (section.type === 'sedes') return true; // se evalúa en runtime

    // Si no hay testimonios en web_config, no incluir testimonials
    if (section.type === 'testimonials') {
      return config.testimonials && config.testimonials.length > 0;
    }

    // Caso clínico solo si el médico tiene datos o foto
    if (section.type === 'caso-clinico') {
      return !!(config.doctor_photo_url || doctor.foto_url);
    }

    return true;
  });

  return filtered;
};

/**
 * getSectionTypes()
 * Devuelve todos los tipos de sección disponibles.
 * Útil para el renderer: verifica que tiene implementación para cada type.
 */
window.getSectionTypes = function() {
  return Object.keys(SECTION_TYPES);
};

/**
 * validateCompositionPlan(plan)
 * Verifica que el plan no repita types (síntoma de template mental).
 */
window.validateCompositionPlan = function(plan) {
  var types = plan.map(function(s) { return s.type; });
  var unique = types.filter(function(t, i) { return types.indexOf(t) === i; });

  if (unique.length !== types.length) {
    console.warn('[Composition] Plan tiene secciones duplicadas — revisar.');
    return false;
  }

  // Verificar diferenciación entre DNAs
  var allPlans = Object.keys(COMPOSITION_PLANS);
  var currentTypes = types.join(',');
  var duplicateDNA = allPlans.filter(function(dna) {
    var otherTypes = COMPOSITION_PLANS[dna].map(function(s) { return s.type; }).join(',');
    return otherTypes === currentTypes;
  });

  if (duplicateDNA.length > 1) {
    console.warn('[Composition] Dos DNAs tienen el mismo plan de secciones: ' + duplicateDNA.join(' / '));
    return false;
  }

  return true;
};

// Auto-validar al cargar
(function() {
  var dnas = Object.keys(COMPOSITION_PLANS);
  dnas.forEach(function(dna) {
    window.validateCompositionPlan(COMPOSITION_PLANS[dna]);
  });
})();
