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
   SCENE: ATHLETIC HERO v2
   Foto fullscreen · overlay cinematográfico
   Texto flotando · CTA en thumb zone
═══════════════════════════════════════════ */

.scene-athletic-v2 {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  background: #050816;
  font-family: 'DM Sans', sans-serif;
  color: #fff;
}

.scene-athletic-v2-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 72% center;
  transform: scale(1.04);
  display: block;
  z-index: 0;
}

.scene-athletic-v2-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      rgba(5,8,22,.10) 0%,
      rgba(5,8,22,.20) 38%,
      rgba(5,8,22,.92) 100%
    ),
    linear-gradient(
      90deg,
      rgba(5,8,22,.78) 0%,
      rgba(5,8,22,.16) 52%,
      rgba(5,8,22,0) 100%
    );
}

.scene-athletic-v2-content {
  position: relative;
  z-index: 20;
  padding: 112px 24px 0;
}

.scene-athletic-v2-kicker {
  display: block;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.scene-athletic-v2-title {
  font-family: 'Fraunces', serif;
  margin-top: 18px;
  font-size: clamp(62px, 16vw, 108px);
  line-height: .90;
  letter-spacing: -.07em;
  font-weight: 900;
  color: #fff;
  max-width: 320px;
}

.scene-athletic-v2-title span {
  color: var(--scene-accent, #2563eb);
  display: block;
}

.scene-athletic-v2-description {
  margin-top: 22px;
  max-width: 280px;
  color: rgba(255,255,255,.72);
  font-size: 17px;
  line-height: 1.7;
  font-weight: 400;
}

.scene-athletic-v2-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  gap: 14px;
  padding: 24px 20px calc(env(safe-area-inset-bottom, 0px) + 18px);
}

.scene-athletic-v2-primary,
.scene-athletic-v2-secondary {
  flex: 1;
  text-align: center;
  padding: 18px;
  border-radius: 18px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-athletic-v2-primary {
  background: var(--scene-accent, #2563eb);
  color: #fff;
}

.scene-athletic-v2-secondary {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.08);
  color: #fff;
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
  var hl = wc.headline || 'Recupera tu movimiento';
  var hlParts = hl.split(/[,\n]/).map(function(s){return s.trim();}).filter(Boolean);
  var hl1 = hlParts[0]||hl;
  var hl2 = hlParts[1]||null;
  var sub = wc.subheadline || ('Rehabilitación avanzada para atletas, lesiones deportivas y recuperación funcional.');

  return '<section class="scene-athletic-v2" id="inicio" style="--scene-accent:'+_se(pc)+'">'
    + '<img src="'+_se(photo)+'" class="scene-athletic-v2-image" alt="'+_se(nombre)+'">'
    + '<div class="scene-athletic-v2-overlay"></div>'
    + '<div class="scene-athletic-v2-content">'
    + '<span class="scene-athletic-v2-kicker">'+_se(kicker)+'</span>'
    + '<h1 class="scene-athletic-v2-title">'+_se(hl1)+(hl2?'<span>'+_se(hl2)+'</span>':'')+'</h1>'
    + '<p class="scene-athletic-v2-description">'+_se(sub)+'</p>'
    + '</div>'
    + '<div class="scene-athletic-v2-bottom">'
    + '<button class="scene-athletic-v2-primary" onclick="abrirBooking()">Agendar cita</button>'
    + (wa?'<a class="scene-athletic-v2-secondary" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>':'')
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
