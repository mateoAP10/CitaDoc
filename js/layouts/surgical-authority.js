/**
 * CitaDoc — Layout: Surgical Authority
 * Renderer completo. Aislado. Sin legacy.
 *
 * Uso: renderLayoutSurgical(config, doctor, locs, container)
 * DNA: 'surgical-authority'
 * Referencia visual: master-scene-layout2.html
 */

(function(){

// ── CSS COMPLETO DEL LAYOUT ───────────────────────────────────────────
var CSS = `
.sa2-page{
  min-height:100svh;
  background:#F5F0E8;
  font-family:'DM Sans',sans-serif;
  color:#1A1A1A;
  padding-bottom:calc(90px + env(safe-area-inset-bottom,0px));
}
.sa2-nav{
  display:flex;align-items:center;justify-content:space-between;
  padding:calc(env(safe-area-inset-top,0px)+18px) 20px 16px;
}
.sa2-brand{display:flex;flex-direction:column;gap:2px}
.sa2-name{font-family:'Fraunces',serif;font-size:1rem;font-weight:400;color:#1A1A1A;letter-spacing:-.02em;line-height:1}
.sa2-esp{font-size:.52rem;color:#9A8F82;text-transform:uppercase;letter-spacing:.12em;font-weight:500}
.sa2-logo-img{height:28px;max-width:110px;object-fit:contain}
.sa2-nav-creds{display:flex;align-items:center;gap:8px}
.sa2-cred-badge{height:26px;padding:0 10px;border:1px solid #D4C9B8;border-radius:4px;font-size:.55rem;font-weight:700;color:#9A8F82;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center}
.sa2-photo{margin:8px 16px 0;border-radius:16px;overflow:hidden;position:relative}
.sa2-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center 10%;display:block;filter:grayscale(60%) contrast(1.05) brightness(0.95)}
.sa2-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(245,240,232,.6) 100%)}
.sa2-content{padding:24px 20px 0;flex:1}
.sa2-doctor-name{font-family:'Fraunces',serif;font-size:clamp(20px,5.5vw,26px);font-weight:400;color:#1A1A1A;letter-spacing:-.03em;line-height:1;margin-bottom:4px}
.sa2-doctor-title{font-size:.6rem;font-weight:600;color:#9A8F82;text-transform:uppercase;letter-spacing:.14em;margin-bottom:18px}
.sa2-spec-tag{display:inline-flex;align-items:center;gap:.4rem;font-size:.58rem;font-weight:700;color:#9A8F82;letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px}
.sa2-spec-tag::before{content:'';width:16px;height:1px;background:#C4B9A8;display:block}
.sa2-headline{font-family:'Fraunces',serif;font-size:clamp(26px,7.5vw,34px);font-weight:400;line-height:1.15;letter-spacing:-.03em;color:#1A1A1A;margin-bottom:14px}
.sa2-headline em{font-style:italic;font-weight:300;color:#5C5248}
.sa2-subtext{font-size:13.5px;color:#7A7268;line-height:1.7;margin-bottom:22px;max-width:320px;font-weight:400}
.sa2-precio{display:none;align-items:center;gap:.5rem;margin-bottom:20px;font-size:12.5px;color:#C4B9A8;font-weight:500}
.sa2-precio-dot{width:3px;height:3px;border-radius:50%;background:#C4B9A8;flex-shrink:0}
.sa2-precio-val{color:#9A8F82;font-weight:600}
.sa2-ctas{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}
.sa2-btn-book{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:10px;background:#1A1A1A;border:none;color:#F5F0E8;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.01em;transition:opacity .2s;width:100%}
.sa2-btn-book:hover{opacity:.88}
.sa2-btn-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:50px;border-radius:10px;background:transparent;border:1px solid #C4B9A8;color:#5C5248;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;transition:background .2s;width:100%}
.sa2-btn-wa:hover{background:#EDE8DF}
.sa2-sections{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.sa2-item{border-radius:10px;overflow:hidden;background:#EDE8DF}
.sa2-item summary{display:flex;align-items:center;padding:14px 16px;cursor:pointer;list-style:none;transition:background .2s}
.sa2-item summary:hover{background:#E5DFD5}
.sa2-item-num{font-size:.6rem;font-weight:700;color:#B0A898;letter-spacing:.1em;margin-right:10px;flex-shrink:0}
.sa2-item-label{font-size:13px;font-weight:600;color:#5C5248;letter-spacing:.01em;flex:1}
.sa2-item-arrow{color:#9A8F82;font-size:14px;flex-shrink:0;transition:transform .25s}
details[open] .sa2-item-arrow{transform:rotate(90deg)}
.sa2-item-body{padding:12px 16px 16px;font-size:13px;color:#7A7268;line-height:1.65;border-top:1px solid #DDD5C8}
.sa2-item-body p{margin-bottom:6px}
.sa2-item-body p:last-child{margin-bottom:0}
.sa2-img-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.sa2-img-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;filter:grayscale(40%)}
.sa2-creds-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;border-top:1px solid #DDD5C8;padding-top:20px}
.sa2-cred-item{display:flex;align-items:flex-start;gap:10px;font-size:12.5px;color:#7A7268;line-height:1.5}
.sa2-cred-line{width:1px;min-height:14px;background:#C4B9A8;flex-shrink:0;margin-top:.2rem}
.sa2-location{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#B0A898;font-weight:500}
.sa2-citadoc-footer{padding:20px 0 8px;display:flex;align-items:center;justify-content:center;gap:.5rem;border-top:1px solid #DDD5C8;margin-top:16px}
.sa2-citadoc-icon{width:18px;height:18px;border-radius:5px;background:#1A1A1A;display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:800;color:#F5F0E8;flex-shrink:0}
.sa2-citadoc-text{font-size:.65rem;color:#B0A898;letter-spacing:.02em}
.sa2-citadoc-text a{color:#9A8F82;text-decoration:none;font-weight:600}
.sa2-edit-section{margin:16px 0 0}
.sa2-edit-toggle{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;font-size:.68rem;font-weight:600;color:#B0A898;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border:none;background:none;width:100%;font-family:'DM Sans',sans-serif}
.sa2-edit-panel{display:none;background:#EDE8DF;border-radius:12px;padding:16px;margin-top:8px}
.sa2-edit-panel.open{display:block}
.sa2-edit-title{font-size:.6rem;font-weight:700;color:#9A8F82;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px}
.sa2-edit-links{display:flex;flex-direction:column;gap:8px}
.sa2-edit-link{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#F5F0E8;border-radius:8px;text-decoration:none;transition:background .2s}
.sa2-edit-link:hover{background:#EDE8DF}
.sa2-edit-link span:first-child{font-size:13px;font-weight:600;color:#5C5248}
.sa2-edit-link span:last-child{font-size:11px;color:#B0A898}
.sa2-bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;background:#F5F0E8;border-top:1px solid #DDD5C8;padding:10px 0 calc(env(safe-area-inset-bottom,0px)+8px);display:grid;grid-template-columns:repeat(5,1fr)}
.sa2-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;text-decoration:none;padding:4px 0}
.sa2-nav-icon{font-size:17px;color:#B0A898;line-height:1;display:flex;align-items:center;justify-content:center}
.sa2-nav-label{font-size:9.5px;font-weight:500;color:#B0A898;letter-spacing:.01em}
.sa2-nav-item.active .sa2-nav-icon,.sa2-nav-item.active .sa2-nav-label{color:#1A1A1A}
.sa2-nav-cta .sa2-nav-icon{width:38px;height:38px;background:#1A1A1A;border-radius:12px;display:flex;align-items:center;justify-content:center}
.sa2-nav-cta .sa2-nav-icon svg{color:#F5F0E8}
.sa2-nav-cta .sa2-nav-label{color:#1A1A1A}
`;

// ── INYECTAR CSS ──────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('sa2-css')) return;
  var s = document.createElement('style');
  s.id = 'sa2-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ── HELPERS ───────────────────────────────────────────────────────────
function e(v){ return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nombre(m){ return (m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido; }
function waUrl(m, n) {
  if (!m.whatsapp_activo || !m.whatsapp) return null;
  return 'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', quiero agendar una consulta.');
}
var SVG_CAL = '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
var SVG_WA  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#25C05D"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>';
var SVG_LOC = '<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';

function navIcon(path){
  return '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">'+path+'</svg>';
}

// ── RENDERER PRINCIPAL ────────────────────────────────────────────────
window.renderLayoutSurgical = function(config, doctor, locs, container) {
  injectCSS();

  var m = doctor;
  var wc = config;
  var n = nombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var ciudad = m.ciudad||'';
  var photo = wc.doctor_photo_url||m.foto_url||'';
  var logo = wc.logo_url||null;
  var wa = waUrl(m, n);
  var hl = wc.headline||'Precisión que cambia vidas.';
  var hlParts = hl.replace(/\.$/, '').split(',');
  var hl1 = hlParts[0].trim();
  var hl2 = hlParts[1] ? hlParts[1].trim() : null;
  var sub = wc.subheadline||'Cirugía especializada con los más altos estándares clínicos.';
  var srvs = wc.services||[];
  var diffs = wc.differentiators||[];
  var precio = m.precio||null;
  var dashUrl = '/citadoc-dashboard.html';
  var isDraft = new URLSearchParams(location.search).get('preview') === 'draft';

  // NAV — logo o wordmark
  var navBrand = logo
    ? '<img class="sa2-logo-img" src="'+e(logo)+'" alt="'+e(n)+'">'
    : '<div class="sa2-brand"><span class="sa2-name">'+e(n)+'</span><span class="sa2-esp">'+e(esp+(ciudad?' · '+ciudad:''))+'</span></div>';

  var credBadge = m.senescyt ? '<span class="sa2-cred-badge">SENESCYT</span>' : '<span class="sa2-cred-badge">AO</span><span class="sa2-cred-badge">AAOS</span>';

  // SERVICIOS
  var srvHTML = srvs.length
    ? srvs.slice(0,6).map(function(s){return'<p>'+e(s.t||s.titulo||s.name||String(s))+'</p>';}).join('')
    : '<p>Artroscopía de rodilla y hombro</p><p>Ligamentoplastia LCA</p><p>Prótesis de cadera y rodilla</p><p>Fracturas y trauma de alta complejidad</p>';

  // FORMACIÓN
  var frmHTML = diffs.length
    ? diffs.slice(0,5).map(function(d){return'<p>'+e(d)+'</p>';}).join('')
    : '<p>Fellowship en artroscopia con técnicas mínimamente invasivas</p><p>Máster en lesiones deportivas y retorno al deporte</p>';

  // PRECIO
  var precioHTML = precio
    ? '<div class="sa2-precio" style="display:inline-flex"><span class="sa2-precio-dot"></span>Consulta<span class="sa2-precio-dot"></span><span class="sa2-precio-val">$'+precio+'</span></div>'
    : '';

  // EDIT PANEL — solo si preview draft
  var editHTML = isDraft ? '<div class="sa2-edit-section">'
    + '<button class="sa2-edit-toggle" onclick="var p=this.nextElementSibling;p.classList.toggle(\'open\');this.textContent=p.classList.contains(\'open\')?\'✕ Cerrar edición\':\'⚙ Editar manual\'">⚙ Editar manual</button>'
    + '<div class="sa2-edit-panel">'
    + '<div class="sa2-edit-title">Editar desde Mi Sitio Web</div>'
    + '<div class="sa2-edit-links">'
    + ['📋 Servicios ofrecidos','🎓 Formación y logros','📸 Imágenes','✏️ Texto y headline','🎨 Colores y logo'].map(function(label){
        return '<a class="sa2-edit-link" href="'+dashUrl+'?panel=sitio" target="_blank" rel="noopener"><span>'+label+'</span><span>↗</span></a>';
      }).join('')
    + '</div></div></div>' : '';

  // HTML COMPLETO
  var html = '<div class="sa2-page">'

    // NAV
    + '<nav class="sa2-nav">'+navBrand+'<div class="sa2-nav-creds">'+credBadge+'</div></nav>'

    // FOTO
    + '<div class="sa2-photo">'+(photo?'<img src="'+e(photo)+'" alt="'+e(n)+'">':'')+'</div>'

    // CONTENIDO
    + '<div class="sa2-content">'

    // Nombre
    + '<div class="sa2-doctor-name">'+e(n)+'</div>'
    + '<div class="sa2-doctor-title">'+e(esp+(ciudad?' · '+ciudad:''))+'</div>'

    // Specialty tag
    + '<div class="sa2-spec-tag">'+e(esp)+'</div>'

    // Headline
    + '<h1 class="sa2-headline">'+e(hl1)+(hl2?'<em>'+e(hl2)+'</em>':'')+'</h1>'
    + '<p class="sa2-subtext">'+e(sub)+'</p>'

    // Precio
    + precioHTML

    // CTAs
    + '<div class="sa2-ctas">'
    + '<button class="sa2-btn-book" onclick="abrirBooking&&abrirBooking()">'+SVG_CAL+' Agendar consulta</button>'
    + (wa?'<a class="sa2-btn-wa" href="'+wa+'" target="_blank" rel="noopener">'+SVG_WA+' WhatsApp</a>':'')
    + '</div>'

    // 3 Secciones colapsables
    + '<div class="sa2-sections">'
    + '<details class="sa2-item"><summary class="sa2-item-summary sa2-item"><span class="sa2-item-num">01</span><span class="sa2-item-label">Servicios ofrecidos</span><span class="sa2-item-arrow">›</span></summary><div class="sa2-item-body">'+srvHTML+'</div></details>'
    + '<details class="sa2-item"><summary class="sa2-item-summary sa2-item"><span class="sa2-item-num">02</span><span class="sa2-item-label">Formación y logros académicos</span><span class="sa2-item-arrow">›</span></summary><div class="sa2-item-body">'+frmHTML+'</div></details>'
    + '<details class="sa2-item"><summary class="sa2-item-summary sa2-item"><span class="sa2-item-num">03</span><span class="sa2-item-label">Imágenes</span><span class="sa2-item-arrow">›</span></summary><div class="sa2-item-body"><div class="sa2-img-grid">'+(photo?'<img src="'+e(photo)+'" alt=""><img src="'+e(photo)+'" alt="">':'')+'</div></div></details>'
    + '</div>'

    // Credentials list
    + (diffs.length?'<div class="sa2-creds-list">'+diffs.slice(0,3).map(function(d){return'<div class="sa2-cred-item"><div class="sa2-cred-line"></div>'+e(d)+'</div>';}).join('')+'</div>':'')

    // Location
    + (ciudad?'<div class="sa2-location">'+SVG_LOC+'<span>'+e(ciudad)+'</span></div>':'')

    // CitaDoc
    + (locs&&locs.length?'<div style="margin-bottom:18px;border-top:1px solid #DDD5C8;padding-top:18px"><div class="sa2-citadoc-text" style="font-size:.52rem;font-weight:700;color:#9A8F82;text-transform:uppercase;letter-spacing:.18em;margin-bottom:12px">Consultorio</div>'+locs.map(function(l){return'<div style="margin-bottom:10px"><div style="font-size:.88rem;font-weight:700;color:#1A1A1A;margin-bottom:2px">'+(l.nombre||'Consultorio')+'</div><div style="font-size:.75rem;color:#7A7268;line-height:1.5">'+(l.direccion||'')+(l.ciudad?', '+l.ciudad:'')+'</div>'+(l.maps_url?'<a href="'+l.maps_url+'" target="_blank" rel="noopener" style="font-size:.68rem;color:#9A8F82;font-weight:600;text-decoration:none;display:inline-block;margin-top:.25rem">Ver en mapa →</a>':'')+'</div>';}).join('')+'</div>':'')
    + '<div class="sa2-citadoc-footer"><div class="sa2-citadoc-icon">C</div><span class="sa2-citadoc-text">Powered by <a href="https://citadoc.lat" target="_blank" rel="noopener">CitaDoc Health Network</a></span></div>'

    // Editar manual (solo en draft)
    + editHTML

    + '</div>' // end content
    + '</div>' // end page

    // Bottom nav
    + '<nav class="sa2-bottom-nav">'
    + '<a class="sa2-nav-item active" href="#inicio">'+navIcon('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>')+'<span class="sa2-nav-label">Inicio</span></a>'
    + '<a class="sa2-nav-item" href="#servicios">'+navIcon('<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>')+'<span class="sa2-nav-label">Servicios</span></a>'
    + '<a class="sa2-nav-item sa2-nav-cta" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()"><div class="sa2-nav-icon">'+SVG_CAL+'</div><span class="sa2-nav-label">Agendar</span></a>'
    + '<a class="sa2-nav-item" href="'+(wa||'#')+'" target="_blank">'+navIcon('<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>')+'<span class="sa2-nav-label">WhatsApp</span></a>'
    + '<a class="sa2-nav-item" href="#sobre-mi">'+navIcon('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>')+'<span class="sa2-nav-label">Sobre mí</span></a>'
    + '</nav>';

  container.innerHTML = html;
};

// ── CONECTAR AL PIPELINE ──────────────────────────────────────────────
// website-renderer.js llama a este layout cuando DNA === 'surgical-authority'
window.LAYOUT_RENDERERS = window.LAYOUT_RENDERERS || {};
window.LAYOUT_RENDERERS['surgical-authority'] = window.renderLayoutSurgical;

console.log('[Layouts] surgical-authority renderer registrado ✓');

})();
