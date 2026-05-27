/**
 * CitaDoc — Web Modules
 * Módulos reutilizables para composición dinámica de webs médicas.
 *
 * Uso:
 *   window.WebModules.hero(config, doctor, ws)
 *   window.WebModules.services(config, ws)
 *   window.WebModules.ctaButtons(config, doctor, ws)
 *   ...
 *
 * Cada módulo:
 *   - Acepta (config, doctor, ws) donde ws = web_settings
 *   - Retorna string HTML o '' si el módulo está desactivado
 *   - Es composable: los layouts lo llaman en el orden que quieran
 */

(function() {

'use strict';

function e(v) { return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function n(m) { return (m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido; }
function waUrl(m, nm) {
  if (!m.whatsapp_activo || !m.whatsapp) return null;
  return 'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+nm+', quiero agendar una consulta.');
}

// ─── HERO VARIANTS ────────────────────────────────────────────────────────────

function heroSplit(config, doctor, ws) {
  var nm = n(doctor);
  var esp = (doctor.especialidades||[])[0]||'';
  var photo = config.doctor_photo_url||doctor.foto_url||'';
  var logo = config.logo_url||null;
  var hl = config.headline||'Tu salud, en manos expertas.';
  var sub = config.subheadline||'Atención médica de excelencia.';
  var wa = waUrl(doctor, nm);

  var navBrand = logo
    ? '<img src="'+e(logo)+'" alt="'+e(nm)+'" style="height:32px;max-width:120px;object-fit:contain">'
    : '<div><div style="font-size:.92rem;font-weight:700;color:#fff">'+e(nm)+'</div><div style="font-size:.68rem;color:rgba(255,255,255,.55)">'+e(esp)+'</div></div>';

  return (
    '<div class="cdm-hero cdm-hero--split" data-ws-module="hero">'
    +'<div class="cdm-hero-content">'
    +'<nav class="cdm-nav" data-navbar="'+(ws.navbar_style||'transparent')+'">'+navBrand+'</nav>'
    +'<div class="cdm-hero-text">'
    +'<div class="cdm-hero-esp">'+e(esp)+'</div>'
    +'<h1 class="cdm-hero-h1">'+e(hl)+'</h1>'
    +'<p class="cdm-hero-sub">'+e(sub)+'</p>'
    +(ws.show_cta!==false?'<div class="cdm-hero-ctas" data-ws="cta">'
    +(ws.show_booking!==false?'<button class="cdm-btn-primary" data-ws="booking" onclick="abrirBooking&&abrirBooking()">Agendar consulta</button>':'')
    +(wa&&ws.show_whatsapp!==false?'<a class="cdm-btn-wa" data-ws="whatsapp" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>':'')
    +'</div>':'')
    +'</div>'
    +'</div>'
    +(photo?'<div class="cdm-hero-photo"><img src="'+e(photo)+'" alt="'+e(nm)+'" loading="eager"></div>':'')
    +'</div>'
  );
}

function heroCentered(config, doctor, ws) {
  var nm = n(doctor);
  var esp = (doctor.especialidades||[])[0]||'';
  var photo = config.doctor_photo_url||doctor.foto_url||'';
  var logo = config.logo_url||null;
  var hl = config.headline||'Tu salud, en manos expertas.';
  var sub = config.subheadline||'Atención médica de excelencia.';
  var wa = waUrl(doctor, nm);

  var navBrand = logo
    ? '<img src="'+e(logo)+'" alt="'+e(nm)+'" style="height:32px;object-fit:contain">'
    : '<span style="font-size:.92rem;font-weight:700;color:#fff">'+e(nm)+'</span>';

  return (
    '<div class="cdm-hero cdm-hero--centered" data-ws-module="hero">'
    +(photo?'<div class="cdm-hero-bg"><img src="'+e(photo)+'" alt="" loading="eager"><div class="cdm-hero-bg-overlay"></div></div>':'')
    +'<nav class="cdm-nav" style="position:relative;z-index:2">'+navBrand+'</nav>'
    +'<div class="cdm-hero-center">'
    +(photo?'<div class="cdm-hero-avatar"><img src="'+e(photo)+'" alt="'+e(nm)+'"></div>':'')
    +'<div class="cdm-hero-esp" style="color:rgba(255,255,255,.65)">'+e(esp)+'</div>'
    +'<h1 class="cdm-hero-h1" style="text-align:center">'+e(hl)+'</h1>'
    +'<p class="cdm-hero-sub" style="text-align:center;color:rgba(255,255,255,.7)">'+e(sub)+'</p>'
    +(ws.show_cta!==false?'<div class="cdm-hero-ctas" data-ws="cta" style="justify-content:center">'
    +(ws.show_booking!==false?'<button class="cdm-btn-primary" data-ws="booking" onclick="abrirBooking&&abrirBooking()">Agendar consulta</button>':'')
    +(wa&&ws.show_whatsapp!==false?'<a class="cdm-btn-wa" data-ws="whatsapp" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>':'')
    +'</div>':'')
    +'</div>'
    +'</div>'
  );
}

function heroFullscreen(config, doctor, ws) {
  var nm = n(doctor);
  var esp = (doctor.especialidades||[])[0]||'';
  var photo = config.doctor_photo_url||doctor.foto_url||'';
  var logo = config.logo_url||null;
  var hl = config.headline||'Tu salud, en manos expertas.';
  var sub = config.subheadline||'Atención médica de excelencia.';
  var wa = waUrl(doctor, nm);
  var pc = config.primary_color||'#16a34a';

  var navBrand = logo
    ? '<img src="'+e(logo)+'" alt="'+e(nm)+'" style="height:36px;object-fit:contain">'
    : '<span style="font-size:.95rem;font-weight:700;color:#fff">'+e(nm)+'</span>';

  return (
    '<div class="cdm-hero cdm-hero--fullscreen" data-ws-module="hero">'
    +(photo?'<img class="cdm-hero-fullbg" src="'+e(photo)+'" alt="">':'<div class="cdm-hero-fullbg" style="background:'+e(pc)+'"></div>')
    +'<div class="cdm-hero-fulloverlay"></div>'
    +'<nav class="cdm-nav cdm-nav--glass">'+navBrand+'</nav>'
    +'<div class="cdm-hero-fullcontent">'
    +'<span class="cdm-hero-esp-pill">'+e(esp)+'</span>'
    +'<h1 class="cdm-hero-h1 cdm-hero-h1--xl">'+e(hl)+'</h1>'
    +'<p class="cdm-hero-sub cdm-hero-sub--light">'+e(sub)+'</p>'
    +(ws.show_cta!==false?'<div class="cdm-hero-ctas" data-ws="cta">'
    +(ws.show_booking!==false?'<button class="cdm-btn-primary cdm-btn-primary--glass" data-ws="booking" onclick="abrirBooking&&abrirBooking()">Agendar consulta</button>':'')
    +(wa&&ws.show_whatsapp!==false?'<a class="cdm-btn-wa cdm-btn-wa--outline" data-ws="whatsapp" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>':'')
    +'</div>':'')
    +'</div>'
    +'</div>'
  );
}

// ─── SERVICES MODULE ──────────────────────────────────────────────────────────

function servicesModule(config, ws) {
  if (ws.show_services === false) return '';
  var srvs = config.services||config.servicios||[];
  if (!srvs.length) return '';
  var layout = ws.services_layout||'grid';

  var items = srvs.slice(0,8).map(function(s) {
    var icon = s.i||s.icon||'✦';
    var title = s.t||s.titulo||s.name||'';
    var desc = s.d||s.desc||s.description||'';
    return layout === 'list'
      ? '<div class="cdm-svc-list-item"><span class="cdm-svc-icon">'+e(icon)+'</span><div><div class="cdm-svc-title">'+e(title)+'</div>'+(desc?'<div class="cdm-svc-desc">'+e(desc)+'</div>':'')+'</div></div>'
      : '<div class="cdm-svc-card"><div class="cdm-svc-card-icon">'+e(icon)+'</div><div class="cdm-svc-card-title">'+e(title)+'</div>'+(desc?'<div class="cdm-svc-card-desc">'+e(desc)+'</div>':'')+'</div>';
  }).join('');

  return '<section class="cdm-services" data-ws="services" data-layout="'+layout+'">'
    +'<h2 class="cdm-section-title">Servicios</h2>'
    +'<div class="cdm-svc-'+(layout==='list'?'list':'grid')+'">'+items+'</div>'
    +'</section>';
}

// ─── CTA BUTTONS MODULE ───────────────────────────────────────────────────────

function ctaButtons(config, doctor, ws) {
  if (ws.show_cta === false) return '';
  var nm = n(doctor);
  var wa = waUrl(doctor, nm);
  return '<div class="cdm-ctas" data-ws="cta">'
    +(ws.show_booking!==false?'<button class="cdm-btn-primary" data-ws="booking" onclick="abrirBooking&&abrirBooking()">Agendar consulta</button>':'')
    +(wa&&ws.show_whatsapp!==false?'<a class="cdm-btn-wa" data-ws="whatsapp" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>':'')
    +'</div>';
}

// ─── GALLERY / CAROUSEL MODULE ────────────────────────────────────────────────

function galleryModule(config, ws) {
  if (ws.show_carousel === false) return '';
  var imgs = config.gallery||[];
  if (!imgs.length) return '';
  return '<section class="cdm-gallery" data-ws="carousel">'
    +'<h2 class="cdm-section-title">Galería</h2>'
    +'<div class="cdm-gallery-grid">'
    +imgs.slice(0,6).map(function(u){return'<img src="'+e(u)+'" alt="" loading="lazy">';}).join('')
    +'</div>'
    +'</section>';
}

// ─── SHARED CSS ───────────────────────────────────────────────────────────────

function injectModuleCSS() {
  if (document.getElementById('_cdm-css')) return;
  var s = document.createElement('style');
  s.id = '_cdm-css';
  s.textContent = `
/* CDM — CitaDoc Modules Base CSS */
.cdm-hero{position:relative;min-height:100svh;overflow:hidden;display:flex;flex-direction:column}

/* Hero Split */
.cdm-hero--split{flex-direction:row;min-height:100svh}
.cdm-hero--split .cdm-hero-content{flex:1;display:flex;flex-direction:column;padding:0;background:#0a1f14;z-index:1}
.cdm-hero--split .cdm-hero-photo{width:42%;flex-shrink:0;position:relative;overflow:hidden}
.cdm-hero--split .cdm-hero-photo img{width:100%;height:100%;object-fit:cover}
.cdm-hero--split .cdm-hero-text{flex:1;padding:2rem 1.5rem;display:flex;flex-direction:column;justify-content:center}

/* Hero Centered */
.cdm-hero--centered{background:#0a1f14;align-items:stretch}
.cdm-hero--centered .cdm-hero-bg{position:absolute;inset:0;z-index:0}
.cdm-hero--centered .cdm-hero-bg img{width:100%;height:100%;object-fit:cover}
.cdm-hero--centered .cdm-hero-bg-overlay{position:absolute;inset:0;background:rgba(10,31,20,.75)}
.cdm-hero--centered .cdm-hero-center{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center}
.cdm-hero--centered .cdm-hero-avatar{width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.2);margin-bottom:1rem;flex-shrink:0}
.cdm-hero--centered .cdm-hero-avatar img{width:100%;height:100%;object-fit:cover}

/* Hero Fullscreen */
.cdm-hero--fullscreen{min-height:100svh;justify-content:flex-end}
.cdm-hero-fullbg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.cdm-hero-fulloverlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.2) 60%,transparent 100%);z-index:1}
.cdm-hero--fullscreen .cdm-nav{position:relative;z-index:2}
.cdm-hero-fullcontent{position:relative;z-index:2;padding:2rem 1.5rem;padding-bottom:3rem}
.cdm-hero-esp-pill{display:inline-block;padding:.25rem .65rem;border:1px solid rgba(255,255,255,.3);border-radius:20px;font-size:.68rem;color:rgba(255,255,255,.7);margin-bottom:.75rem;font-weight:600;letter-spacing:.05em}

/* Shared nav */
.cdm-nav{padding:.9rem 1.2rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.cdm-nav--glass{background:rgba(0,0,0,.2);backdrop-filter:blur(12px)}

/* Hero text */
.cdm-hero-esp{font-size:.65rem;font-weight:700;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.5rem}
.cdm-hero-h1{font-size:clamp(1.6rem,5vw,2.6rem);font-weight:800;color:#fff;line-height:1.1;letter-spacing:-.02em;margin-bottom:.75rem}
.cdm-hero-h1--xl{font-size:clamp(1.8rem,6vw,3rem)}
.cdm-hero-sub{font-size:.88rem;color:rgba(255,255,255,.55);line-height:1.6;margin-bottom:1.5rem}
.cdm-hero-sub--light{color:rgba(255,255,255,.65)}

/* CTA buttons */
.cdm-hero-ctas,.cdm-ctas{display:flex;flex-direction:column;gap:.6rem;margin-top:.25rem}
.cdm-btn-primary{padding:.85rem 1.5rem;border-radius:12px;background:var(--p,#16a34a);border:none;color:#fff;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit;letter-spacing:.01em;transition:opacity .2s}
.cdm-btn-primary:hover{opacity:.88}
.cdm-btn-primary--glass{background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.3)}
.cdm-btn-wa{padding:.85rem 1.5rem;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#fff;font-weight:600;font-size:.88rem;cursor:pointer;font-family:inherit;text-decoration:none;display:flex;align-items:center;justify-content:center;transition:background .2s}
.cdm-btn-wa:hover{background:rgba(255,255,255,.18)}
.cdm-btn-wa--outline{background:transparent;border-color:rgba(255,255,255,.4)}

/* Services */
.cdm-services{padding:2.5rem 1.2rem}
.cdm-section-title{font-size:.6rem;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:1.1rem}
.cdm-svc-grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
.cdm-svc-list{display:grid;gap:.5rem}
.cdm-svc-card{padding:1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px}
.cdm-svc-card-icon{font-size:1.3rem;margin-bottom:.45rem}
.cdm-svc-card-title{font-size:.82rem;font-weight:700;color:#fff;margin-bottom:.2rem}
.cdm-svc-card-desc{font-size:.7rem;color:rgba(255,255,255,.4);line-height:1.5}
.cdm-svc-list-item{display:flex;align-items:flex-start;gap:.75rem;padding:.75rem;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.07)}
.cdm-svc-icon{font-size:1.1rem;flex-shrink:0;margin-top:.05rem}
.cdm-svc-title{font-size:.84rem;font-weight:700;color:#fff}
.cdm-svc-desc{font-size:.7rem;color:rgba(255,255,255,.4);line-height:1.5;margin-top:.2rem}

/* Gallery */
.cdm-gallery{padding:2rem 1.2rem}
.cdm-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;margin-top:.75rem}
.cdm-gallery-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}
  `;
  document.head.appendChild(s);
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

window.WebModules = {
  // Hero dispatch — picks variant from ws.hero_layout
  hero: function(config, doctor, ws) {
    injectModuleCSS();
    var layout = (ws && ws.hero_layout) || 'split';
    if (layout === 'centered')   return heroCentered(config, doctor, ws||{});
    if (layout === 'fullscreen') return heroFullscreen(config, doctor, ws||{});
    return heroSplit(config, doctor, ws||{});
  },
  // Individual hero variants (for direct use)
  heroSplit:       heroSplit,
  heroCentered:    heroCentered,
  heroFullscreen:  heroFullscreen,
  // Content modules
  services:    servicesModule,
  gallery:     galleryModule,
  ctaButtons:  ctaButtons,
  // CSS injection
  injectCSS:   injectModuleCSS,
};

console.log('[WebModules] ✓ hero(split|centered|fullscreen) | services(grid|list) | gallery | cta');

})();
