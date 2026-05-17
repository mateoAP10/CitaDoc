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
   SCENE: ATHLETIC HERO
   Foto como arquitectura. Texto como capa.
═══════════════════════════════════════════ */

.scene-athletic-hero {
  position: relative;
  min-height: 100svh;
  min-height: 100vh;
  overflow: hidden;
  background: #050816;
  color: white;
  font-family: 'DM Sans', sans-serif;
}

/* ── FOTO COMO ARQUITECTURA ── */
.scene-athletic-media {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.scene-athletic-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 72% center;
  transform: scale(1.02);
  display: block;
}

/* ── OVERLAY CINEMÁTICO DUAL-AXIS ── */
.scene-athletic-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      90deg,
      rgba(5,8,22,.96) 0%,
      rgba(5,8,22,.82) 28%,
      rgba(5,8,22,.34) 58%,
      rgba(5,8,22,.08) 100%
    ),
    linear-gradient(
      180deg,
      rgba(5,8,22,.12) 0%,
      rgba(5,8,22,.16) 42%,
      rgba(5,8,22,.74) 100%
    );
}

/* ── CONTENIDO — vive sobre las capas ── */
.scene-athletic-content {
  position: relative;
  z-index: 10;
  max-width: 720px;
  padding: 120px 64px 80px;
}

/* ── KICKER ── */
.scene-athletic-kicker {
  display: inline-block;
  color: var(--scene-accent, #60a5fa);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .22em;
  text-transform: uppercase;
  margin-bottom: 24px;
}

/* ── H1 COMO ELEMENTO GRÁFICO ── */
.scene-athletic-title {
  font-family: 'Fraunces', serif;
  font-size: clamp(52px, 8vw, 108px);
  line-height: .92;
  letter-spacing: -.06em;
  font-weight: 900;
  color: #fff;
  margin-bottom: 28px;
  max-width: 780px;
}

.scene-athletic-title span {
  color: var(--scene-accent, #2563eb);
  display: block;
}

/* ── SUBTÍTULO ── */
.scene-athletic-subtitle {
  max-width: 520px;
  font-size: 18px;
  line-height: 1.72;
  color: rgba(255,255,255,.76);
  margin-bottom: 42px;
  font-weight: 300;
}

/* ── ACCIONES — desktop ── */
.scene-athletic-actions {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 64px;
}

.scene-btn-primary {
  background: var(--scene-accent, #2563eb);
  color: #fff;
  padding: 18px 32px;
  border-radius: 999px;
  border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  transition: transform .22s ease, opacity .22s ease;
}
.scene-btn-primary:hover { transform: translateY(-2px); opacity: .92; }

.scene-btn-ghost {
  color: rgba(255,255,255,.82);
  font-family: 'DM Sans', sans-serif;
  font-size: .96rem;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: opacity .2s;
}
.scene-btn-ghost:hover { opacity: 1; }

/* ── GLASS PILLARS ── */
.scene-athletic-pillars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-width: 960px;
}

.scene-pillar {
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  padding: 20px;
  border-radius: 20px;
  transition: background .2s;
}
.scene-pillar:hover { background: rgba(255,255,255,.08); }

.scene-pillar-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  line-height: 1.3;
}

.scene-pillar-desc {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255,255,255,.62);
}

/* ── BOTTOM BAR — iPhone native ── */
.scene-athletic-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  gap: 12px;
  padding: 20px 20px calc(env(safe-area-inset-bottom, 18px) + 16px);
}

.scene-bottom-primary {
  flex: 1;
  text-align: center;
  padding: 17px 16px;
  border-radius: 16px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
  font-size: .92rem;
  background: var(--scene-accent, #2563eb);
  color: #fff;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-bottom-secondary {
  flex: 1;
  text-align: center;
  padding: 17px 16px;
  border-radius: 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  background: rgba(255,255,255,.12);
  color: #fff;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  font-size: .92rem;
  border: 1px solid rgba(255,255,255,.14);
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .scene-athletic-content {
    padding: 90px 24px 0;
  }
  .scene-athletic-title {
    font-size: clamp(52px, 14vw, 76px);
    line-height: .93;
  }
  .scene-athletic-subtitle {
    font-size: 16px;
    line-height: 1.65;
    max-width: 100%;
    margin-bottom: 24px;
  }
  .scene-athletic-actions {
    display: none; /* reemplazado por bottom bar */
  }
  .scene-athletic-pillars {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 120px; /* espacio para bottom bar */
  }
  .scene-athletic-image {
    object-position: 65% center; /* acercar cara en mobile */
  }
}

/* ── DESKTOP: ocultar bottom bar ── */
@media (min-width: 769px) {
  .scene-athletic-bottom { display: none; }
  .scene-athletic-pillars { grid-template-columns: repeat(4,1fr); }
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
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var pc = wc.primary_color || m.primary_color || '#2563eb';
  var wa = _sWa(m, nombre);
  var kicker = (esp+(m.ciudad?' · '+m.ciudad:'')).toUpperCase();

  // Titular: split en 2 líneas
  var hl = wc.headline || 'Recupera tu movimiento';
  var hlParts = hl.split(/[,\.\—–-]/).map(function(s){return s.trim();}).filter(Boolean);
  var hl1 = hlParts[0]||hl;
  var hl2 = hlParts[1]||null;

  var sub = wc.subheadline || ('Tratamientos especializados en '+esp+'. Diagnóstico preciso, recuperación efectiva.');
  var pillars = _sPillars(wc, esp);

  var pillarsHtml = pillars.map(function(p) {
    return '<div class="scene-pillar">'
      + '<div class="scene-pillar-title">'+_se(p.t)+'</div>'
      + (p.d ? '<div class="scene-pillar-desc">'+_se(p.d)+'</div>' : '')
      + '</div>';
  }).join('');

  // Accent color inyectado como CSS var en el elemento
  var accentStyle = 'style="--scene-accent:'+_se(pc)+'"';

  return '<section class="scene-athletic-hero" id="inicio" '+accentStyle+'>'

    // Foto como arquitectura
    + '<div class="scene-athletic-media">'
    + (photo ? '<img src="'+_se(photo)+'" class="scene-athletic-image" alt="'+_se(nombre)+'">' : '')
    + '</div>'

    // Overlay dual-axis cinemático
    + '<div class="scene-athletic-overlay"></div>'

    // Contenido — vive sobre las capas
    + '<div class="scene-athletic-content">'
    + '<span class="scene-athletic-kicker">'+_se(kicker)+'</span>'
    + '<h1 class="scene-athletic-title">'
    + _se(hl1)
    + (hl2 ? '<span>'+_se(hl2)+'</span>' : '')
    + '</h1>'
    + '<p class="scene-athletic-subtitle">'+_se(sub)+'</p>'

    // CTAs desktop
    + '<div class="scene-athletic-actions">'
    + '<button class="scene-btn-primary" onclick="abrirBooking()">'
    + '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
    + 'Agendar consulta'
    + '</button>'
    + (wa ? '<a class="scene-btn-ghost" href="'+wa+'" target="_blank" rel="noopener">WhatsApp →</a>' : '')
    + '</div>'

    // Glass pillars
    + '<div class="scene-athletic-pillars">'+pillarsHtml+'</div>'
    + '</div>'

    // Bottom bar iPhone
    + '<div class="scene-athletic-bottom">'
    + '<button class="scene-bottom-primary" onclick="abrirBooking()">Agendar cita</button>'
    + (wa ? '<a class="scene-bottom-secondary" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>' : '')
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
