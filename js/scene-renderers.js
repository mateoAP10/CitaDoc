/**
 * CitaDoc — Scene Renderers
 * Materialización visual premium. NO módulos. ESCENAS.
 *
 * REGLA: la foto ES el layout. El texto VIVE dentro de la escena.
 * REGLA: una escena perfecta antes de cuatro mediocres.
 * REGLA: si parece template → falta tensión visual.
 */

// ── CSS DE ESCENAS (inyectado una vez) ────────────────────────────────
var SCENE_CSS = `

/* ═══════════════════════════════════════════
   SCENE: HERO PREMIUM v3
   Carrusel cinematográfico · Logo flotante
   Headline corto · 2 CTAs thumb zone
═══════════════════════════════════════════ */

.scene-hero-v3 {
  position: relative;
  height: 100svh;
  min-height: 600px;
  overflow: hidden;
  background: #060a12;
  font-family: 'DM Sans', sans-serif;
  color: #fff;
}

/* ── CARRUSEL DE FOTOS ── */
.hero-carousel {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 15%;
  opacity: 0;
  transform: scale(1.08);
}

/* 1 foto: Ken Burns */
.hero-slide.solo {
  opacity: 1;
  animation: kenBurns 12s ease-in-out infinite alternate;
}

@keyframes kenBurns {
  from { transform: scale(1.0);  }
  to   { transform: scale(1.08); }
}

/* 2-3 fotos: fade cycle */
.hero-slide.s1 { animation: slideIn 18s infinite 0s;  }
.hero-slide.s2 { animation: slideIn 18s infinite 6s;  }
.hero-slide.s3 { animation: slideIn 18s infinite 12s; }

@keyframes slideIn {
  0%   { opacity: 0; transform: scale(1.0);  }
  8%   { opacity: 1; transform: scale(1.0);  }
  30%  { opacity: 1; transform: scale(1.06); }
  38%  { opacity: 0; transform: scale(1.08); }
  100% { opacity: 0; transform: scale(1.0);  }
}

/* ── OVERLAY CINEMÁTICO ── */
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      rgba(6,10,18,.18) 0%,
      rgba(6,10,18,.08) 30%,
      rgba(6,10,18,.72) 65%,
      rgba(6,10,18,.97) 100%
    ),
    linear-gradient(
      90deg,
      rgba(6,10,18,.55) 0%,
      rgba(6,10,18,.10) 50%,
      rgba(6,10,18,.0)  100%
    );
}

/* ── LOGO FLOTANTE ── */
.hero-logo {
  position: absolute;
  top: env(safe-area-inset-top, 0px);
  left: 0;
  right: 0;
  z-index: 20;
  padding: 24px 22px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-logo-img {
  height: 36px;
  max-width: 120px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: .9;
}

.hero-logo-wordmark {
  font-family: 'Fraunces', serif;
  font-size: .95rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -.01em;
  line-height: 1;
}

.hero-logo-esp {
  font-family: 'DM Sans', sans-serif;
  font-size: .52rem;
  color: rgba(255,255,255,.45);
  text-transform: uppercase;
  letter-spacing: .14em;
  margin-top: 2px;
}

/* ── CONTENIDO — flotando sobre la escena ── */
.hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 0 22px 130px;
}

.hero-kicker {
  display: inline-block;
  color: rgba(255,255,255,.55);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .2em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.hero-h1 {
  font-family: 'Fraunces', serif;
  font-size: clamp(42px, 11vw, 68px);
  line-height: .94;
  letter-spacing: -.05em;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
}

.hero-h1 em {
  font-style: italic;
  font-weight: 300;
  color: rgba(255,255,255,.75);
}

.hero-sub {
  font-size: 15px;
  color: rgba(255,255,255,.6);
  line-height: 1.55;
  font-weight: 400;
  max-width: 300px;
}

/* ── CTAs — fijos en thumb zone ── */
.hero-ctas {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  gap: 12px;
  padding: 16px 22px calc(env(safe-area-inset-bottom, 0px) + 16px);
  background: linear-gradient(to top, rgba(6,10,18,.8) 0%, transparent 100%);
}

.hero-cta-book {
  flex: 1;
  height: 54px;
  background: var(--scene-accent, #2563eb);
  color: #fff;
  border: none;
  border-radius: 16px;
  font-family: 'DM Sans', sans-serif;
  font-size: .92rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: .01em;
  transition: opacity .2s;
}
.hero-cta-book:hover { opacity: .9; }

.hero-cta-wa {
  flex: 0 0 140px;
  height: 54px;
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: none;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: .88rem;
  font-weight: 600;
  transition: background .2s;
}
.hero-cta-wa:hover { background: rgba(255,255,255,.16); }

/* Desktop */
@media (min-width: 900px) {
  .hero-content { padding: 0 64px 200px; max-width: 600px; }
  .hero-h1 { font-size: clamp(52px, 6vw, 88px); }
  .hero-ctas { padding: 20px 64px calc(env(safe-area-inset-bottom, 0px) + 20px); max-width: 480px; }
}

`;

// ── INYECTAR CSS UNA VEZ ──────────────────────────────────────────────
(function() {
  if (document.getElementById('scene-renderers-css')) return;
  var style = document.createElement('style');
  style.id = 'scene-renderers-css';
  style.textContent = SCENE_CSS;
  document.head.appendChild(style);
})();

// ── HELPERS ───────────────────────────────────────────────────────────
function _se(v) { return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _sNombre(m) { return (m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido; }
function _sWa(m, nombre) {
  if (!m.whatsapp_activo || !m.whatsapp) return null;
  return 'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+nombre+', quiero agendar una consulta.');
}

// ── DEFAULT PILLAR DATA POR ESPECIALIDAD ─────────────────────────────
var PILLAR_DEFAULTS = {
  'traumatología': [
    {t:'Diagnóstico preciso',    d:'Evaluación clínica e imagen.'},
    {t:'Técnica especializada',  d:'Procedimientos de vanguardia.'},
    {t:'Recuperación activa',    d:'Protocolo de rehabilitación.'},
    {t:'Resultados reales',      d:'Volvé a tu actividad normal.'}
  ],
  'ortopedia': [
    {t:'Evaluación integral',   d:'Diagnóstico completo.'},
    {t:'Cirugía de precisión',  d:'Técnicas mínimamente invasivas.'},
    {t:'Rehabilitación',        d:'Acompañamiento continuo.'},
    {t:'Alta calidad de vida',  d:'Movimiento sin dolor.'}
  ]
};

function _sPillars(wc, esp) {
  if (wc.differentiators && wc.differentiators.length >= 2) {
    return wc.differentiators.slice(0,4).map(function(d) {
      return {t: String(d).split(':')[0].trim(), d: String(d).split(':').slice(1).join(':').trim()||''};
    });
  }
  var k = Object.keys(PILLAR_DEFAULTS).find(function(k){ return (esp||'').toLowerCase().indexOf(k)>-1; });
  return PILLAR_DEFAULTS[k] || [
    {t:'Atención personalizada', d:'Plan individual para tu caso.'},
    {t:'Enfoque integral',       d:'Recuperación y prevención.'},
    {t:'Tecnología avanzada',    d:'Equipamiento moderno.'},
    {t:'Resultados comprobados', d:'Pacientes activos nuevamente.'}
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// ESCENA 1: HERO ATHLETIC
// Foto como arquitectura · overlay dual-axis · H1 gráfico · glass pillars
// ═══════════════════════════════════════════════════════════════════════
window.renderSceneHeroAthletic = function(sc, wc, m, locs) {
  var nombre = _sNombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var pc = wc.primary_color || m.primary_color || '#2563eb';
  var logo = wc.logo_url || null;
  var wa = _sWa(m, nombre);
  var kicker = (esp+(m.ciudad?' · '+m.ciudad:'')).toUpperCase();

  // Fotos para el carrusel
  var photos = [];
  if (wc.doctor_photo_url) photos.push(wc.doctor_photo_url);
  else if (m.foto_url) photos.push(m.foto_url);
  // Fotos adicionales si el médico las tiene en gallery
  if (wc.gallery && Array.isArray(wc.gallery)) photos = photos.concat(wc.gallery);
  photos = photos.slice(0,3);

  // Carrusel HTML
  var carouselHtml = '';
  if (photos.length === 1) {
    carouselHtml = '<img class="hero-slide solo" src="'+_se(photos[0])+'" alt="'+_se(nombre)+'">';
  } else {
    carouselHtml = photos.map(function(p, i) {
      return '<img class="hero-slide s'+(i+1)+'" src="'+_se(p)+'" alt="'+_se(nombre)+'">';
    }).join('');
  }

  // Headline
  var hl = wc.headline || 'Recupera tu movimiento.';
  var hlParts = hl.split(/[,\.]\s*/).filter(Boolean);
  var hl1 = hlParts[0] || hl;
  var hl2 = hlParts[1] || null;

  var sub = wc.subheadline || (esp + (m.ciudad ? ' · ' + m.ciudad : ''));

  // Logo / wordmark
  var logoHtml = logo
    ? '<img class="hero-logo-img" src="'+_se(logo)+'" alt="'+_se(nombre)+'">'
    : '<div><div class="hero-logo-wordmark">'+_se(nombre)+'</div><div class="hero-logo-esp">'+_se(esp)+'</div></div>';

  return '<section class="scene-hero-v3" id="inicio" style="--scene-accent:'+_se(pc)+'">'

    // Carrusel
    + '<div class="hero-carousel">'+carouselHtml+'</div>'

    // Overlay cinemático
    + '<div class="hero-overlay"></div>'

    // Logo flotante top
    + '<div class="hero-logo">'+logoHtml+'</div>'

    // Headline corto sobre el overlay
    + '<div class="hero-content">'
    + '<span class="hero-kicker">'+_se(kicker)+'</span>'
    + '<h1 class="hero-h1">'+_se(hl1)+(hl2?'<br><em>'+_se(hl2)+'</em>':'')+'</h1>'
    + '<p class="hero-sub">'+_se(sub)+'</p>'
    + '</div>'

    // CTAs fijos en thumb zone
    + '<div class="hero-ctas">'
    + '<button class="hero-cta-book" onclick="abrirBooking()">Agendar cita</button>'
    + (wa?'<a class="hero-cta-wa" href="'+wa+'" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>WhatsApp</a>':'')
    + '</div>'

    + '</section>';
};

// ── CONECTAR AL MODULE REGISTRY ───────────────────────────────────────
// Reemplaza el módulo genérico con la escena premium.
// El composition engine ya tiene 'hero-split-bold' en el plan de performance-athletic.
if (window.MODULE_RENDERERS) {
  window.MODULE_RENDERERS['hero-split-bold'] = window.renderSceneHeroAthletic;
  console.log('[Scenes] hero-split-bold → renderSceneHeroAthletic ✓');
}
