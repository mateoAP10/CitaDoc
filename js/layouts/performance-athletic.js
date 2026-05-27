/**
 * CitaDoc — Layout: Performance Athletic
 * DNA: 'performance-athletic'
 * Referencia: master-scene-v2.html + LAYOUT1.png
 * Sensación: energía · movimiento · recuperación · rendimiento
 */
(function(){

var CSS = `
.pa2-page{min-height:100svh;background:#111827;font-family:'DM Sans',sans-serif;color:#fff;padding-bottom:calc(90px + env(safe-area-inset-bottom,0px))}
.pa2-hero{position:relative;height:62svh;min-height:360px;overflow:hidden;background:#060d18}
.pa2-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:72% center;display:block;animation:pa2zoom 14s ease-in-out infinite alternate}
@keyframes pa2zoom{from{transform:scale(1.02)}to{transform:scale(1.08)}}
.pa2-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,13,24,.08) 0%,rgba(6,13,24,.18) 34%,rgba(6,13,24,.92) 100%),linear-gradient(90deg,rgba(6,13,24,.82) 0%,rgba(6,13,24,.48) 34%,rgba(6,13,24,.12) 70%,rgba(6,13,24,0) 100%)}
.pa2-nav{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px)+18px) 20px 0}
.pa2-name{font-family:'Fraunces',serif;font-size:.88rem;font-weight:400;color:#fff;letter-spacing:-.01em;line-height:1}
.pa2-esp{font-size:.5rem;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.12em}
.pa2-logo{height:30px;max-width:100px;object-fit:contain}
.pa2-content{padding:22px 20px 0;background:#111827;flex:1}
.pa2-doctor-name{font-family:'Fraunces',serif;font-size:clamp(20px,5.5vw,26px);font-weight:400;color:#fff;letter-spacing:-.02em;line-height:1;margin-bottom:3px}
.pa2-doctor-title{font-size:.58rem;font-weight:600;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px}
.pa2-kicker{display:inline-flex;align-items:center;gap:.4rem;font-size:.55rem;font-weight:700;color:var(--pa2-accent,#60a5fa);text-transform:uppercase;letter-spacing:.2em;margin-bottom:10px}
.pa2-headline{font-family:'Fraunces',serif;font-size:clamp(26px,8vw,34px);font-weight:700;line-height:.95;letter-spacing:-.05em;color:#fff;margin-bottom:12px}
.pa2-headline em{color:var(--pa2-accent,#2563eb);font-style:normal;display:block}
.pa2-subtext{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.7;margin-bottom:20px;max-width:320px;font-weight:400}
.pa2-precio{display:none;align-items:center;gap:.5rem;margin-bottom:18px;font-size:12px;color:rgba(255,255,255,.2);font-weight:500}
.pa2-precio-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.2);flex-shrink:0}
.pa2-precio-val{color:rgba(255,255,255,.45);font-weight:600}
.pa2-ctas{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}
.pa2-btn-book{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:14px;background:var(--pa2-accent,#2563eb);border:none;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.01em;transition:opacity .2s;width:100%}
.pa2-btn-book:hover{opacity:.88}
.pa2-btn-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:50px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;transition:background .2s;width:100%}
.pa2-btn-wa:hover{background:rgba(255,255,255,.12)}
.pa2-sections{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.pa2-item{border-radius:12px;overflow:hidden;background:rgba(255,255,255,.05)}
.pa2-item summary{display:flex;align-items:center;padding:14px 16px;cursor:pointer;list-style:none;transition:background .2s}
.pa2-item summary:hover{background:rgba(255,255,255,.08)}
.pa2-item-num{font-size:.58rem;font-weight:700;color:rgba(255,255,255,.3);letter-spacing:.1em;margin-right:10px;flex-shrink:0}
.pa2-item-label{font-size:13px;font-weight:600;color:rgba(255,255,255,.75);flex:1}
.pa2-item-arrow{color:rgba(255,255,255,.3);font-size:14px;flex-shrink:0;transition:transform .25s}
details[open] .pa2-item-arrow{transform:rotate(90deg)}
.pa2-item-body{padding:12px 16px 14px;font-size:13px;color:rgba(255,255,255,.45);line-height:1.65;border-top:1px solid rgba(255,255,255,.06)}
.pa2-item-body p{margin-bottom:5px}
.pa2-item-body p:last-child{margin-bottom:0}
.pa2-creds{display:flex;flex-direction:column;gap:9px;margin-bottom:18px;border-top:1px solid rgba(255,255,255,.07);padding-top:18px}
.pa2-cred{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;color:rgba(255,255,255,.4);line-height:1.5}
.pa2-cred-dot{width:4px;height:4px;border-radius:50%;background:var(--pa2-accent,#2563eb);flex-shrink:0;margin-top:.3rem;opacity:.7}
.pa2-location{display:flex;align-items:center;gap:5px;font-size:11.5px;color:rgba(255,255,255,.2);font-weight:500}
.pa2-cd-footer{padding:18px 0 8px;display:flex;align-items:center;justify-content:center;gap:.5rem;border-top:1px solid rgba(255,255,255,.07);margin-top:16px}
.pa2-cd-icon{width:18px;height:18px;border-radius:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:800;color:#fff;flex-shrink:0}
.pa2-cd-text{font-size:.65rem;color:rgba(255,255,255,.2);letter-spacing:.02em}
.pa2-cd-text a{color:rgba(255,255,255,.35);text-decoration:none;font-weight:600}
.pa2-edit-section{margin:16px 0 0}
.pa2-edit-toggle{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;font-size:.68rem;font-weight:600;color:rgba(255,255,255,.2);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border:none;background:none;width:100%;font-family:'DM Sans',sans-serif}
.pa2-edit-panel{display:none;background:rgba(255,255,255,.05);border-radius:12px;padding:16px;margin-top:8px}
.pa2-edit-panel.open{display:block}
.pa2-edit-link{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,.04);border-radius:8px;text-decoration:none;margin-bottom:8px;transition:background .2s}
.pa2-edit-link:hover{background:rgba(255,255,255,.08)}
.pa2-edit-link span:first-child{font-size:13px;font-weight:600;color:rgba(255,255,255,.6)}
.pa2-edit-link span:last-child{font-size:11px;color:rgba(255,255,255,.25)}
.pa2-bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;background:#111827;border-top:1px solid rgba(255,255,255,.07);padding:10px 0 calc(env(safe-area-inset-bottom,0px)+8px);display:grid;grid-template-columns:repeat(5,1fr)}
.pa2-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;text-decoration:none;padding:4px 0}
.pa2-nav-icon{color:rgba(255,255,255,.25);line-height:1;display:flex;align-items:center;justify-content:center}
.pa2-nav-label{font-size:9.5px;font-weight:500;color:rgba(255,255,255,.25);letter-spacing:.01em}
.pa2-nav-item.active .pa2-nav-icon,.pa2-nav-item.active .pa2-nav-label{color:#fff}
.pa2-nav-cta .pa2-nav-icon{width:38px;height:38px;background:var(--pa2-accent,#2563eb);border-radius:12px;display:flex;align-items:center;justify-content:center}
.pa2-nav-cta .pa2-nav-label{color:var(--pa2-accent,#2563eb)}
/* ── DESKTOP ── */
@media(min-width:768px){
  .pa2-page{max-width:none;padding-bottom:0;overflow-x:hidden}
  .pa2-hero{
    max-width:none;min-height:calc(100vh - 68px);
    display:grid;grid-template-columns:1fr 1fr;align-items:center;
    padding:0 5%;gap:0;
  }
  .pa2-hero-img{
    grid-column:2;grid-row:1;
    position:relative;height:calc(100vh - 68px);
    overflow:hidden;border-radius:0;
  }
  .pa2-hero-img img{height:100%;width:100%;object-fit:cover;border-radius:0}
  .pa2-hero-body{grid-column:1;grid-row:1;padding:48px 48px 48px 0;z-index:2}
  .pa2-hero-title{font-size:clamp(36px,4vw,60px)}
  .pa2-hero-btns{flex-direction:row;gap:12px}
  .pa2-btn,.pa2-btn-wa{flex:none;width:auto;padding:0 28px}
  .pa2-section{padding:48px 5%;max-width:1200px;margin:0 auto}
  .pa2-srv-grid{grid-template-columns:repeat(3,1fr)}
  .pa2-bottom-nav{display:none}
}
@media(min-width:1100px){
  .pa2-hero{padding:0 7%}
  .pa2-hero-title{font-size:clamp(44px,4vw,68px)}
}
`;

function injectCSS(){
  if(document.getElementById('pa2-css'))return;
  var s=document.createElement('style');s.id='pa2-css';s.textContent=CSS;document.head.appendChild(s);
}

function e(v){return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function nombre(m){return(m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido;}
function waUrl(m,n){
  if(!m.whatsapp_activo||!m.whatsapp)return null;
  return 'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', quiero agendar una consulta.');
}
var SVG_CAL='<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
var SVG_WA='<svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,.7)"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>';
function navIcon(p){return'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">'+p+'</svg>';}

var PROC_DEFAULTS={
  'traumatología':[{t:'Artroscopía de rodilla y hombro'},{t:'Ligamentoplastia LCA'},{t:'Prótesis articular'},{t:'Fijación de fracturas'},{t:'Cirugía de columna'}],
  'ortopedia':[{t:'Corrección de deformidades'},{t:'Reemplazo articular'},{t:'Microcirugía'},{t:'Artrodesis'},{t:'Reconstrucción tendinosa'}],
  'fisioterapia':[{t:'Rehabilitación funcional'},{t:'Terapia manual'},{t:'Ejercicio terapéutico'},{t:'Electroterapia'},{t:'Punción seca'}]
};

window.renderLayoutPerformance = function(config, doctor, locs, container){
  injectCSS();
  var m=doctor, wc=config;
  var ws=config._ws||{};
  var n=nombre(m), esp=(m.especialidades||[])[0]||'', ciudad=m.ciudad||'';
  var photo=wc.doctor_photo_url||m.foto_url||'';
  var logo=wc.logo_url||null;
  var pc=wc.primary_color||m.primary_color||'#2563eb';
  var wa=waUrl(m,n);
  var hl=wc.headline||'Recupera tu movimiento.';
  var hlParts=hl.replace(/\.$/, '').split(',');
  var hl1=hlParts[0].trim(), hl2=hlParts[1]?hlParts[1].trim():null;
  var sub=wc.subheadline||(esp+' de precisión para tu retorno completo al deporte y la vida.');
  var srvs=wc.services||[];
  var diffs=wc.differentiators||[];
  var precio=m.precio||null;
  var isDraft=new URLSearchParams(location.search).get('preview')==='draft';
  var dashUrl='/citadoc-dashboard.html?panel=sitio';

  var navBrand=logo
    ?'<img class="pa2-logo" src="'+e(logo)+'" alt="'+e(n)+'">'
    :'<div><div class="pa2-name">'+e(n)+'</div><div class="pa2-esp">'+e(esp+(ciudad?' · '+ciudad:''))+'</div></div>';

  var espKey=Object.keys(PROC_DEFAULTS).find(function(k){return(esp||'').toLowerCase().indexOf(k)>-1;});
  var srvFallback=PROC_DEFAULTS[espKey]||[{t:'Consulta especializada'},{t:'Diagnóstico de precisión'},{t:'Plan de tratamiento'},{t:'Seguimiento continuo'}];
  var srvHTML=(srvs.length?srvs:srvFallback).slice(0,6).map(function(s){return'<p>'+e(s.t||s.titulo||s.name||String(s))+'</p>';}).join('');
  var frmHTML=diffs.length?diffs.slice(0,5).map(function(d){return'<p>'+e(d)+'</p>';}).join(''):'<p>Especialización con sólida formación clínica</p><p>Técnicas mínimamente invasivas de vanguardia</p><p>Protocolos de recuperación activa</p>';
  var imgHTML=photo?'<img src="'+e(photo)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px"><img src="'+e(photo)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;filter:contrast(1.1) brightness(.85) grayscale(20%)">':'';
  var precioHTML=precio?'<div class="pa2-precio" style="display:inline-flex"><span class="pa2-precio-dot"></span>Consulta<span class="pa2-precio-dot"></span><span class="pa2-precio-val">$'+precio+'</span></div>':'';
  var credsHTML=diffs.length?'<div class="pa2-creds">'+diffs.slice(0,3).map(function(d){return'<div class="pa2-cred"><span class="pa2-cred-dot"></span>'+e(d)+'</div>';}).join('')+'</div>':'';
  var editHTML=isDraft?'<div class="pa2-edit-section"><button class="pa2-edit-toggle" onclick="var p=this.nextElementSibling;p.classList.toggle(\'open\');this.textContent=p.classList.contains(\'open\')?\'✕ Cerrar\':\'⚙ Editar manual\'">⚙ Editar manual</button><div class="pa2-edit-panel">'+['📋 Servicios','🎓 Formación','📸 Imágenes','✏️ Texto','🎨 Colores'].map(function(l){return'<a class="pa2-edit-link" href="'+dashUrl+'" target="_blank" rel="noopener"><span>'+l+'</span><span>↗</span></a>';}).join('')+'</div></div>':'';

  var html='<div class="pa2-page" style="--pa2-accent:'+e(pc)+'">'
    // Hero
    +'<div class="pa2-hero">'
    +(photo?'<img src="'+e(photo)+'" alt="'+e(n)+'">':'')
    +'<div class="pa2-overlay"></div>'
    +'<nav class="pa2-nav">'+navBrand+'</nav>'
    +'</div>'
    // Contenido
    +'<div class="pa2-content">'
    +'<div class="pa2-doctor-name">'+e(n)+'</div>'
    +'<div class="pa2-doctor-title">'+e(esp+(ciudad?' · '+ciudad:''))+'</div>'
    +'<div class="pa2-kicker">'+e(esp.toUpperCase())+'</div>'
    +'<h1 class="pa2-headline">'+e(hl1)+(hl2?'<em>'+e(hl2)+'</em>':'')+'</h1>'
    +'<p class="pa2-subtext">'+e(sub)+'</p>'
    +precioHTML
    +(ws.show_cta!==false?'<div class="pa2-ctas" data-ws="cta">'
    +(ws.show_booking!==false?'<button class="pa2-btn-book" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVG_CAL+' Agendar consulta</button>':'')
    +(wa&&ws.show_whatsapp!==false?'<a class="pa2-btn-wa" data-ws="whatsapp" href="'+wa+'" target="_blank" rel="noopener">'+SVG_WA+' WhatsApp</a>':'')
    +'</div>':'')
    // Secciones
    +'<div class="pa2-sections">'
    +(ws.show_services!==false?'<details class="pa2-item" data-ws="services"><summary class="pa2-item"><span class="pa2-item-num">01</span><span class="pa2-item-label">Servicios ofrecidos</span><span class="pa2-item-arrow">›</span></summary><div class="pa2-item-body">'+srvHTML+'</div></details>':'')
    +'<details class="pa2-item"><summary class="pa2-item"><span class="pa2-item-num">02</span><span class="pa2-item-label">Formación y logros académicos</span><span class="pa2-item-arrow">›</span></summary><div class="pa2-item-body">'+frmHTML+'</div></details>'
    +(ws.show_carousel!==false&&imgHTML?'<details class="pa2-item" data-ws="carousel"><summary class="pa2-item"><span class="pa2-item-num">03</span><span class="pa2-item-label">Imágenes</span><span class="pa2-item-arrow">›</span></summary><div class="pa2-item-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">'+imgHTML+'</div></div></details>':'')
    +'</div>'
    +credsHTML
    +(ciudad?'<div class="pa2-location"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><span>'+e(ciudad)+'</span></div>':'')
    +(locs&&locs.length?'<div style="margin-bottom:18px;border-top:1px solid rgba(255,255,255,.07);padding-top:18px"><div style="font-size:.52rem;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.18em;margin-bottom:12px">Consultorio</div>'+locs.map(function(l){return'<div style="margin-bottom:10px"><div style="font-size:.88rem;font-weight:700;color:#fff;margin-bottom:2px">'+(l.nombre||'Consultorio')+'</div><div style="font-size:.75rem;color:rgba(255,255,255,.4);line-height:1.5">'+(l.direccion||'')+(l.ciudad?', '+l.ciudad:'')+'</div>'+(l.maps_url?'<a href="'+l.maps_url+'" target="_blank" rel="noopener" style="font-size:.68rem;color:rgba(255,255,255,.35);font-weight:600;text-decoration:none;display:inline-block;margin-top:.25rem">Ver en mapa →</a>':'')+'</div>';}).join('')+'</div>':'')
    +'<div class="pa2-cd-footer"><div class="pa2-cd-icon">C</div><span class="pa2-cd-text">Powered by <a href="https://citadoc.lat" target="_blank" rel="noopener">CitaDoc Health Network</a></span></div>'
    +editHTML
    +'</div>'
    // Bottom nav
    +'<nav class="pa2-bottom-nav">'
    +'<a class="pa2-nav-item active" href="#"><div class="pa2-nav-icon">'+navIcon('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>')+'</div><span class="pa2-nav-label">Inicio</span></a>'
    +'<a class="pa2-nav-item" href="#"><div class="pa2-nav-icon">'+navIcon('<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>')+'</div><span class="pa2-nav-label">Servicios</span></a>'
    +'<a class="pa2-nav-item pa2-nav-cta" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()"><div class="pa2-nav-icon">'+SVG_CAL+'</div><span class="pa2-nav-label">Agendar</span></a>'
    +'<a class="pa2-nav-item" href="'+(wa||'#')+'" target="_blank"><div class="pa2-nav-icon">'+SVG_WA+'</div><span class="pa2-nav-label">WhatsApp</span></a>'
    +'<a class="pa2-nav-item" href="#"><div class="pa2-nav-icon">'+navIcon('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>')+'</div><span class="pa2-nav-label">Sobre mí</span></a>'
    +'</nav>'
    +'</div>';

  container.innerHTML=html;
};

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['performance-athletic']=window.renderLayoutPerformance;
console.log('[Layouts] performance-athletic renderer registrado ✓');

})();
