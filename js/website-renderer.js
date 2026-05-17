/**
 * CitaDoc — Website Renderer
 * Fase 6: renderWeb() se convierte en shell de orquestación.
 *
 * PIPELINE:
 *   doctor → buildWebsiteConfig → normalizeWebConfig
 *         → planWebsiteComposition → renderByPlan → website
 *
 * REGLA: el renderer NO decide layout, NO inventa spacing, NO elige orden.
 * REGLA: NO tocar booking engine, appointments, availability, dashboard.
 * REGLA: si renderWeb() contiene `if dna === x` — el sistema falló.
 */

/**
 * applySpecColors(config)
 * Aplica las CSS vars al documento desde el spec y el primary_color del médico.
 * El primary_color del médico SIEMPRE tiene prioridad — nace del logo real.
 */
function applySpecColors(config) {
  var pc = config.primary_color;
  var dnaColors = config.dnaColors || {};

  // Si hay color del médico, derivar palette desde él
  if (pc) {
    var hex = pc.replace('#','');
    var r = parseInt(hex.slice(0,2),16);
    var g = parseInt(hex.slice(2,4),16);
    var b = parseInt(hex.slice(4,6),16);
    var d = function(v,a){ return Math.max(0,Math.round(v*(1-a))).toString(16).padStart(2,'0'); };
    var l = function(v,a){ return Math.min(255,Math.round(v+(255-v)*a)).toString(16).padStart(2,'0'); };
    var dark   = '#'+d(r,.25)+d(g,.25)+d(b,.25);
    var bright = '#'+l(r,.15)+l(g,.15)+l(b,.15);

    document.documentElement.style.setProperty('--p',  pc);
    document.documentElement.style.setProperty('--navy', pc);
    document.documentElement.style.setProperty('--gm', dark);
    document.documentElement.style.setProperty('--gd', dark);
    document.documentElement.style.setProperty('--ga', pc);
    document.documentElement.style.setProperty('--gg', bright);
  }

  // Aplicar tokens del DNA spec como CSS vars
  if (dnaColors.background)  document.documentElement.style.setProperty('--bg',  dnaColors.background);
  if (dnaColors.surface)     document.documentElement.style.setProperty('--s',   dnaColors.surface);
  if (dnaColors.border)      document.documentElement.style.setProperty('--bo',  dnaColors.border);
  if (dnaColors.ink)         document.documentElement.style.setProperty('--ink', dnaColors.ink);
  if (dnaColors.inkMuted)    document.documentElement.style.setProperty('--ink2',dnaColors.inkMuted);
  if (dnaColors.muted)       document.documentElement.style.setProperty('--mu',  dnaColors.muted);
}

/**
 * applyInfrastructure(config, doctor, locs)
 * Puebla nav, footer, sticky bar, meta — infraestructura compartida.
 * No toca el contenido principal (eso es del plan).
 */
function applyInfrastructure(config, doctor, locs) {
  var nombre = (doctor.titulo||'Dr.')+' '+doctor.nombre+' '+doctor.apellido;
  var esp = (doctor.especialidades||[])[0]||'';
  var logo = config.logo_url || null;
  var waActive = doctor.whatsapp_activo && doctor.whatsapp;
  var waUrl = waActive
    ? 'https://wa.me/'+doctor.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+nombre+', quiero agendar.')
    : null;

  // Page meta
  document.title = config.seo_title || (nombre + (esp?' — '+esp:''));
  var pd = document.getElementById('pgDesc') || document.querySelector('meta[name="description"]');
  if (pd) pd.setAttribute('content', config.seo_description || nombre+' '+esp);

  // Nav
  var navBrand = document.getElementById('navBrand') || document.getElementById('wNavBrand');
  if (navBrand) {
    if (logo) {
      navBrand.innerHTML = '<img src="'+logo+'" alt="'+nombre+'" style="height:32px;max-width:120px;object-fit:contain;transition:filter .3s" id="navLogoImg">';
      // Logo color en scroll
      var nav = document.getElementById('nav');
      if (nav) {
        nav.addEventListener('scroll-change', function(e) {
          var img = document.getElementById('navLogoImg');
          if (img) img.style.filter = e.detail.solid ? 'none' : 'brightness(0) invert(1)';
        });
      }
    } else {
      var nameEl = navBrand.querySelector('#navName') || navBrand.querySelector('#wNavName');
      var espEl  = navBrand.querySelector('#navEsp')  || navBrand.querySelector('#wNavEsp');
      if (nameEl) nameEl.textContent = nombre;
      if (espEl)  espEl.textContent  = esp;
    }
  }

  // Footer
  var ftLeft = document.getElementById('ftLeft') || document.getElementById('wFooterLogo');
  if (ftLeft) {
    if (logo) {
      ftLeft.innerHTML = '<img src="'+logo+'" style="height:24px;max-width:90px;object-fit:contain;opacity:.55" alt="'+nombre+'">';
    } else {
      var ftBrand = document.getElementById('ftBrand') || document.getElementById('wFooterBrand');
      if (ftBrand) ftBrand.textContent = nombre + (esp?' · '+esp:'');
    }
  }

  // Sticky bar: WA y CALL
  var stickyWa   = document.getElementById('stickyWa');
  var stickyCall = document.getElementById('stickyCall');
  if (stickyWa) {
    if (waActive && waUrl) { stickyWa.onclick = function(){ window.open(waUrl,'_blank'); }; }
    else { stickyWa.style.display = 'none'; }
  }
  if (stickyCall) {
    if (doctor.telefono) { stickyCall.onclick = function(){ location = 'tel:'+doctor.telefono.replace(/\D/g,''); }; }
    else { stickyCall.style.display = 'none'; }
  }

  // Booking modal header
  var bkDr = document.getElementById('bkDr') || document.getElementById('bkDrName');
  var bkE  = document.getElementById('bkE')  || document.getElementById('bkEsp');
  if (bkDr) bkDr.textContent = 'Agendar con '+nombre;
  if (bkE)  bkE.textContent  = esp;

  // PWA
  document.title = config.seo_title || nombre + (esp?' — '+esp:'');
  var pwaTitle = document.getElementById('pwaTitle');
  if (pwaTitle) pwaTitle.setAttribute('content', nombre);
}

/**
 * renderWebsite(doctor, locs, wc, isPreview)
 * El nuevo renderWeb() — solo orquesta. No decide layout.
 *
 * @param {Object} doctor    - row de medicos
 * @param {Array}  locs      - doctor_locations
 * @param {Object} wc        - web_config raw de Supabase
 * @param {boolean} isPreview
 */
window.renderWebsite = function(doctor, locs, wc, isPreview) {

  // ── 0. Forzar ocultado de HTML legacy con CSS ────────────────────
  // Corre ANTES de todo lo demás para garantizar que el nav y secciones
  // antiguas desaparezcan independientemente de cualquier error posterior.
  if (!document.getElementById('_cd-legacy-hide')) {
    var s = document.createElement('style');
    s.id = '_cd-legacy-hide';
    s.textContent = [
      '#wNav, nav.nav',
      '#inicio, #servicios, #sobre-mi, #testimonios',
      '#contacto, #wLocsSection, #siteFooter',
      '#stickyBar, #stickyBookCta, .sticky-book-cta',
      '#mobileBottomNav, .mobile-bottom-nav',
    ].join(',') + '{ display: none !important; }';
    document.head.appendChild(s);
  }
  document.body.style.paddingTop = '0';

  // ── 1. Construir config desde DNA spec ─────────────────────────
  var webConfig;
  if (typeof window.buildWebsiteConfig === 'function') {
    webConfig = window.buildWebsiteConfig(doctor, wc);
    // Preservar contenido editorial del médico (headline, photo, etc.)
    if (wc) {
      var preservedFields = [
        'headline','subheadline','about_text','doctor_story','philosophy',
        'sobre_quote','doctor_photo_url','logo_url','primary_color',
        'services','testimonials','differentiators','eyebrow',
        'seo_title','seo_description','cta_primary','cta_final',
        'patient_experience','formacion','caso_clinico'
      ];
      preservedFields.forEach(function(f) {
        if (wc[f] !== undefined && wc[f] !== null) webConfig[f] = wc[f];
      });
    }
  } else {
    webConfig = wc || {};
  }

  // ── 2. Normalizar config ────────────────────────────────────────
  var config = typeof window.normalizeWebConfig === 'function'
    ? window.normalizeWebConfig(webConfig)
    : webConfig;

  // ── 3. Aplicar colores del spec + primary_color del médico ──────
  applySpecColors(config);

  // ── 4. Infraestructura compartida (nav, footer, sticky, meta) ───
  applyInfrastructure(config, doctor, locs);

  // ── 5. Planificar composición narrativa ─────────────────────────
  var compositionPlan = typeof window.planWebsiteComposition === 'function'
    ? window.planWebsiteComposition(config, doctor)
    : [];

  // ── 6. Ocultar TODO el HTML legacy ──────────────────────────────
  // El nuevo layout es self-contained. Ocultar agresivamente todo
  // lo que no sea #dna-main o el banner de demo.
  var KEEP_IDS = { 'dna-main': true, 'demoBanner': true, 'bkOverlay': true };

  // Por ID explícito
  var legacyIds = [
    'wNav', 'nav',
    'inicio', 'servicios', 'sobre-mi', 'testimonios',
    'contacto', 'wLocsSection', 'siteFooter',
    'stickyBar', 'stickyBookCta', 'mobileBottomNav',
  ];
  legacyIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Por selector — todos los hijos directos del body que no están en KEEP_IDS
  Array.prototype.forEach.call(document.body.children, function(el) {
    if (!KEEP_IDS[el.id]) el.style.display = 'none';
  });

  document.body.style.paddingTop = '0';

  // ── 7. Resolver container #dna-main ─────────────────────────────
  var main = document.getElementById('dna-main');
  if (!main) {
    main = document.createElement('main');
    main.id = 'dna-main';
    var footer = document.getElementById('siteFooter') || document.querySelector('footer');
    if (footer) document.body.insertBefore(main, footer);
    else document.body.appendChild(main);
  }

  // ── 8. Layout renderer directo si existe para este DNA ──────────
  // Mapeo de DNA legacy → nuevo sistema de layouts
  var DNA_LEGACY_MAP = {
    'clinic':    'surgical-authority',
    'sports':    'performance-athletic',
    'luxury':    'surgical-authority',
    'authority': 'surgical-authority',
    'warm':      'warm-human-care',
    'modern':    'performance-athletic',
    // layout_id legacy
    'clinic-editorial':   'surgical-authority',
    'performance-clinic': 'performance-athletic',
    'academic-prestige':  'surgical-authority',
    'soft-clinic-luxury': 'warm-human-care',
    'future-minimal':     'performance-athletic',
  };
  var dnaKey = config.dna || config.visual_dna || '';
  var resolvedKey = (window.LAYOUT_RENDERERS && window.LAYOUT_RENDERERS[dnaKey])
    ? dnaKey
    : DNA_LEGACY_MAP[dnaKey] || DNA_LEGACY_MAP[config.layout_id] || 'surgical-authority';

  if (window.LAYOUT_RENDERERS && window.LAYOUT_RENDERERS[resolvedKey]) {
    window.LAYOUT_RENDERERS[resolvedKey](config, doctor, locs, main);
    console.log('[Renderer] Layout:', dnaKey, '→', resolvedKey);
    return;
  }

  // ── 9. Materializar el plan (fallback) ───────────────────────────

  if (typeof window.renderByPlan === 'function') {
    window.renderByPlan(compositionPlan, config, doctor, locs, main);
  }
  console.log('[Renderer] Plan materializado:', dnaKey);

  // ── 7. Preview banner ───────────────────────────────────────────
  if (isPreview) {
    var banner = document.getElementById('wPreviewBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'wPreviewBanner';
      banner.innerHTML = '🔒 <strong>Vista previa</strong> — Tu sitio médico aún no está publicado';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:400;background:rgba(255,255,255,.93);backdrop-filter:blur(10px);border-bottom:1px solid rgba(0,0,0,.06);padding:.45rem 1rem;text-align:center;font-size:.72rem;font-weight:500;color:#374151;font-family:"DM Sans",sans-serif;letter-spacing:.01em';
      document.body.appendChild(banner);
      document.body.style.paddingTop = '32px';
    }
  }

  // ── 8. Reveal animations ────────────────────────────────────────
  requestAnimationFrame(function() {
    var ro = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          ro.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

    document.querySelectorAll('#dna-main .rv').forEach(function(el) {
      ro.observe(el);
    });
  });

  // ── 9. Log en desarrollo ────────────────────────────────────────
  console.log('[CitaDoc] DNA:', config.dna, '| Secciones:', compositionPlan.map(function(s){return s.type;}).join(' → '));
};
