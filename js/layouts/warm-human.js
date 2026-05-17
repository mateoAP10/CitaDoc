/**
 * CitaDoc — Layout: Warm Human
 * DNA: 'warm-human-care'
 * Referencia: master-scene-layout3.html
 * Sensación: calidez · calma · bienestar · humanismo
 */
(function(){

var CSS = `
.wh2-page{min-height:100svh;background:#FEFCF8;font-family:'DM Sans',sans-serif;color:#1C1008;padding-bottom:calc(90px + env(safe-area-inset-bottom,0px))}
.wh2-nav{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px)+18px) 20px 16px}
.wh2-brand{display:flex;flex-direction:column;gap:2px}
.wh2-name{font-family:'Fraunces',serif;font-size:.95rem;font-weight:400;color:#1C1008;letter-spacing:-.01em;line-height:1}
.wh2-esp{font-size:.52rem;color:#9C7B62;text-transform:uppercase;letter-spacing:.1em;font-weight:500}
.wh2-logo{height:28px;max-width:110px;object-fit:contain}
.wh2-photo{margin:8px 16px 0;border-radius:20px;overflow:hidden;position:relative}
.wh2-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center 15%;display:block;filter:contrast(1.02) brightness(1.04) saturate(1.08)}
.wh2-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(254,252,248,.55) 100%)}
.wh2-content{padding:22px 20px 0;flex:1}
.wh2-doctor-name{font-family:'Fraunces',serif;font-size:clamp(19px,5vw,24px);font-weight:400;color:#1C1008;letter-spacing:-.02em;line-height:1;margin-bottom:3px}
.wh2-doctor-title{font-size:.58rem;font-weight:600;color:#9C7B62;text-transform:uppercase;letter-spacing:.12em;margin-bottom:18px}
.wh2-spec-tag{display:inline-flex;align-items:center;gap:.4rem;font-size:.58rem;font-weight:600;color:#9C7B62;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
.wh2-spec-dot{width:5px;height:5px;border-radius:50%;background:var(--wh2-accent,#7B6E5C);flex-shrink:0}
.wh2-headline{font-family:'Fraunces',serif;font-size:clamp(24px,7vw,32px);font-weight:400;line-height:1.18;letter-spacing:-.025em;color:#1C1008;margin-bottom:12px}
.wh2-headline em{font-style:italic;font-weight:300;color:#9C7B62}
.wh2-subtext{font-size:13.5px;color:#9C7B62;line-height:1.72;margin-bottom:20px;max-width:320px;font-weight:400}
.wh2-precio{display:none;align-items:center;gap:.5rem;margin-bottom:18px;font-size:12px;color:#EDE0D4;font-weight:500}
.wh2-precio-dot{width:3px;height:3px;border-radius:50%;background:#EDE0D4;flex-shrink:0}
.wh2-precio-val{color:#9C7B62;font-weight:600}
.wh2-ctas{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}
.wh2-btn-book{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:14px;background:#1C1008;border:none;color:#FEFCF8;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s;width:100%}
.wh2-btn-book:hover{opacity:.88}
.wh2-btn-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:14px;background:rgba(107,144,77,.1);border:1px solid rgba(107,144,77,.22);color:#4a7030;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;width:100%}
.wh2-btn-wa:hover{background:rgba(107,144,77,.16)}
.wh2-first-visit{background:#FDF6EE;border-radius:16px;padding:18px;margin-bottom:16px}
.wh2-fv-title{font-size:.6rem;font-weight:700;color:#9C7B62;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px}
.wh2-fv-steps{display:flex;flex-direction:column;gap:12px}
.wh2-fv-step{display:flex;align-items:flex-start;gap:12px}
.wh2-fv-num{width:28px;height:28px;border-radius:50%;background:var(--wh2-accent,#7B6E5C);color:#FEFCF8;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:.82rem;font-weight:600;flex-shrink:0}
.wh2-fv-text{font-size:13px;color:#4A3020;line-height:1.5;padding-top:.15rem}
.wh2-fv-text strong{display:block;font-weight:600;color:#1C1008;margin-bottom:.15rem}
.wh2-sections{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.wh2-item{border-radius:12px;overflow:hidden;background:#FDF6EE}
.wh2-item summary{display:flex;align-items:center;padding:13px 16px;cursor:pointer;list-style:none;transition:background .2s}
.wh2-item summary:hover{background:#EDE0D4}
.wh2-item-num{font-size:.58rem;font-weight:700;color:#9C7B62;letter-spacing:.1em;margin-right:10px;flex-shrink:0}
.wh2-item-label{font-size:13px;font-weight:600;color:#4A3020;flex:1}
.wh2-item-arrow{color:#9C7B62;font-size:14px;flex-shrink:0;transition:transform .25s}
details[open] .wh2-item-arrow{transform:rotate(90deg)}
.wh2-item-body{padding:12px 16px 14px;font-size:13px;color:#9C7B62;line-height:1.65;border-top:1px solid #EDE0D4}
.wh2-item-body p{margin-bottom:5px}
.wh2-item-body p:last-child{margin-bottom:0}
.wh2-testi{margin-bottom:16px}
.wh2-testi-title{font-size:.58rem;font-weight:700;color:#9C7B62;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px}
.wh2-testi-card{background:#FDF6EE;border-radius:14px;padding:14px 16px;margin-bottom:8px}
.wh2-testi-text{font-family:'Fraunces',serif;font-size:.9rem;font-style:italic;font-weight:300;color:#1C1008;line-height:1.6;margin-bottom:8px}
.wh2-testi-author{font-size:.7rem;font-weight:600;color:#9C7B62}
.wh2-location{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#EDE0D4;font-weight:500}
.wh2-cd-footer{padding:18px 0 8px;display:flex;align-items:center;justify-content:center;gap:.5rem;border-top:1px solid #EDE0D4;margin-top:16px}
.wh2-cd-icon{width:18px;height:18px;border-radius:5px;background:#1C1008;display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:800;color:#FEFCF8;flex-shrink:0}
.wh2-cd-text{font-size:.65rem;color:#EDE0D4;letter-spacing:.02em}
.wh2-cd-text a{color:#9C7B62;text-decoration:none;font-weight:600}
.wh2-edit-section{margin:16px 0 0}
.wh2-edit-toggle{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;font-size:.68rem;font-weight:600;color:#EDE0D4;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border:none;background:none;width:100%;font-family:'DM Sans',sans-serif}
.wh2-edit-panel{display:none;background:#FDF6EE;border-radius:12px;padding:16px;margin-top:8px}
.wh2-edit-panel.open{display:block}
.wh2-edit-link{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#FEFCF8;border-radius:8px;text-decoration:none;transition:background .2s;margin-bottom:8px}
.wh2-edit-link:hover{background:#EDE0D4}
.wh2-edit-link span:first-child{font-size:13px;font-weight:600;color:#4A3020}
.wh2-edit-link span:last-child{font-size:11px;color:#9C7B62}
.wh2-bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;background:#FEFCF8;border-top:1px solid #EDE0D4;padding:10px 0 calc(env(safe-area-inset-bottom,0px)+8px);display:grid;grid-template-columns:repeat(5,1fr)}
.wh2-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;text-decoration:none;padding:4px 0}
.wh2-nav-icon{font-size:17px;color:#EDE0D4;line-height:1;display:flex;align-items:center;justify-content:center}
.wh2-nav-label{font-size:9.5px;font-weight:500;color:#EDE0D4;letter-spacing:.01em}
.wh2-nav-item.active .wh2-nav-icon,.wh2-nav-item.active .wh2-nav-label{color:#1C1008}
.wh2-nav-cta .wh2-nav-icon{width:38px;height:38px;background:#1C1008;border-radius:12px;display:flex;align-items:center;justify-content:center}
.wh2-nav-cta .wh2-nav-icon svg{color:#FEFCF8}
.wh2-nav-cta .wh2-nav-label{color:#1C1008}
`;

function injectCSS(){
  if(document.getElementById('wh2-css'))return;
  var s=document.createElement('style');s.id='wh2-css';s.textContent=CSS;document.head.appendChild(s);
}

function e(v){return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function nombre(m){return(m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido;}
function waUrl(m,n){
  if(!m.whatsapp_activo||!m.whatsapp)return null;
  return 'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', quiero agendar una consulta.');
}
var SVG_CAL='<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
var SVG_WA='<svg width="14" height="14" viewBox="0 0 24 24" fill="#4a7030"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>';

function navIcon(p){return'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">'+p+'</svg>';}

window.renderLayoutWarmHuman = function(config, doctor, locs, container){
  injectCSS();
  var m=doctor, wc=config;
  var n=nombre(m), esp=(m.especialidades||[])[0]||'', ciudad=m.ciudad||'';
  var photo=wc.doctor_photo_url||m.foto_url||'';
  var logo=wc.logo_url||null;
  var pc=wc.primary_color||m.primary_color||'#7B6E5C';
  var wa=waUrl(m,n);
  var hl=wc.headline||'Tu bienestar, en buenas manos.';
  var hlParts=hl.replace(/\.$/, '').split(',');
  var hl1=hlParts[0].trim(), hl2=hlParts[1]?hlParts[1].trim():null;
  var sub=wc.subheadline||'Atención médica personalizada con calidez y dedicación.';
  var srvs=wc.services||[];
  var diffs=wc.differentiators||[];
  var testis=wc.testimonials||[];
  var precio=m.precio||null;
  var isDraft=new URLSearchParams(location.search).get('preview')==='draft';
  var dashUrl='/citadoc-dashboard.html';

  var navBrand=logo
    ?'<img class="wh2-logo" src="'+e(logo)+'" alt="'+e(n)+'">'
    :'<div class="wh2-brand"><span class="wh2-name">'+e(n)+'</span><span class="wh2-esp">'+e(esp+(ciudad?' · '+ciudad:''))+'</span></div>';

  var srvHTML=srvs.length?srvs.slice(0,6).map(function(s){return'<p>'+e(s.t||s.titulo||s.name||String(s))+'</p>';}).join(''):'<p>Consulta integral y diagnóstico</p><p>Seguimiento continuo</p><p>Plan de tratamiento personalizado</p>';
  var frmHTML=diffs.length?diffs.slice(0,5).map(function(d){return'<p>'+e(d)+'</p>';}).join(''):'<p>Formación especializada con sólida trayectoria clínica</p><p>Atención basada en evidencia</p>';
  var imgHTML=photo?'<img src="'+e(photo)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px"><img src="'+e(photo)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;filter:contrast(1.05) brightness(.95) saturate(.85)">':'';
  var testiHTML=testis.length?'<div class="wh2-testi"><div class="wh2-testi-title">Lo que dicen mis pacientes</div>'+testis.slice(0,3).map(function(t){return'<div class="wh2-testi-card"><div class="wh2-testi-text">"'+e(t.text)+'"</div><div class="wh2-testi-author">'+e(t.name)+'</div></div>';}).join('')+'</div>':'';
  var precioHTML=precio?'<div class="wh2-precio" style="display:inline-flex"><span class="wh2-precio-dot"></span>Consulta<span class="wh2-precio-dot"></span><span class="wh2-precio-val">$'+precio+'</span></div>':'';
  var editHTML=isDraft?'<div class="wh2-edit-section"><button class="wh2-edit-toggle" onclick="var p=this.nextElementSibling;p.classList.toggle(\'open\');this.textContent=p.classList.contains(\'open\')?\'✕ Cerrar\':\'⚙ Editar manual\'">⚙ Editar manual</button><div class="wh2-edit-panel"><div style="font-size:.6rem;font-weight:700;color:#9C7B62;text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px">Editar desde Mi Sitio Web</div>'+['📋 Servicios','🎓 Formación','📸 Imágenes','✏️ Texto','💬 Testimonios'].map(function(l){return'<a class="wh2-edit-link" href="'+dashUrl+'?panel=sitio" target="_blank" rel="noopener"><span>'+l+'</span><span>↗</span></a>';}).join('')+'</div></div>':'';

  var html='<div class="wh2-page" style="--wh2-accent:'+e(pc)+'">'
    +'<nav class="wh2-nav">'+navBrand+'</nav>'
    +'<div class="wh2-photo">'+(photo?'<img src="'+e(photo)+'" alt="'+e(n)+'">':'')+'</div>'
    +'<div class="wh2-content">'
    +'<div class="wh2-doctor-name">'+e(n)+'</div>'
    +'<div class="wh2-doctor-title">'+e(esp+(ciudad?' · '+ciudad:''))+'</div>'
    +'<div class="wh2-spec-tag"><span class="wh2-spec-dot"></span><span>'+e(esp)+'</span></div>'
    +'<h1 class="wh2-headline">'+e(hl1)+(hl2?'<br><em>'+e(hl2)+'</em>':'')+'</h1>'
    +'<p class="wh2-subtext">'+e(sub)+'</p>'
    +precioHTML
    +'<div class="wh2-ctas">'
    +'<button class="wh2-btn-book" onclick="abrirBooking&&abrirBooking()">'+SVG_CAL+' Agendar consulta</button>'
    +(wa?'<a class="wh2-btn-wa" href="'+wa+'" target="_blank" rel="noopener">'+SVG_WA+' Escribir por WhatsApp</a>':'')
    +'</div>'
    // Primera consulta — sección signature
    +'<div class="wh2-first-visit"><div class="wh2-fv-title">Tu primera consulta</div><div class="wh2-fv-steps">'
    +'<div class="wh2-fv-step"><div class="wh2-fv-num">1</div><div class="wh2-fv-text"><strong>Agendá tu turno</strong>Online, en minutos. Confirmación inmediata.</div></div>'
    +'<div class="wh2-fv-step"><div class="wh2-fv-num">2</div><div class="wh2-fv-text"><strong>Tu consulta</strong>Escucho tu historia completa antes de cualquier diagnóstico.</div></div>'
    +'<div class="wh2-fv-step"><div class="wh2-fv-num">3</div><div class="wh2-fv-text"><strong>Tu plan</strong>Recibís un plan diseñado específicamente para vos.</div></div>'
    +'</div></div>'
    // Secciones
    +'<div class="wh2-sections">'
    +'<details class="wh2-item"><summary class="wh2-item"><span class="wh2-item-num">01</span><span class="wh2-item-label">Servicios ofrecidos</span><span class="wh2-item-arrow">›</span></summary><div class="wh2-item-body">'+srvHTML+'</div></details>'
    +'<details class="wh2-item"><summary class="wh2-item"><span class="wh2-item-num">02</span><span class="wh2-item-label">Formación y logros</span><span class="wh2-item-arrow">›</span></summary><div class="wh2-item-body">'+frmHTML+'</div></details>'
    +'<details class="wh2-item"><summary class="wh2-item"><span class="wh2-item-num">03</span><span class="wh2-item-label">Imágenes</span><span class="wh2-item-arrow">›</span></summary><div class="wh2-item-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">'+imgHTML+'</div></div></details>'
    +'</div>'
    +testiHTML
    +(ciudad?'<div class="wh2-location"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><span>'+e(ciudad)+'</span></div>':'')
    +(locs&&locs.length?'<div style="margin-bottom:18px;border-top:1px solid #EDE0D4;padding-top:18px"><div style="font-size:.52rem;font-weight:700;color:#9C7B62;text-transform:uppercase;letter-spacing:.18em;margin-bottom:12px">Consultorio</div>'+locs.map(function(l){return'<div style="margin-bottom:10px"><div style="font-size:.88rem;font-weight:700;color:#1C1008;margin-bottom:2px">'+(l.nombre||'Consultorio')+'</div><div style="font-size:.75rem;color:#9C7B62;line-height:1.5">'+(l.direccion||'')+(l.ciudad?', '+l.ciudad:'')+'</div>'+(l.maps_url?'<a href="'+l.maps_url+'" target="_blank" rel="noopener" style="font-size:.68rem;color:#7B6E5C;font-weight:600;text-decoration:none;display:inline-block;margin-top:.25rem">Ver en mapa →</a>':'')+'</div>';}).join('')+'</div>':'')
    +'<div class="wh2-cd-footer"><div class="wh2-cd-icon">C</div><span class="wh2-cd-text">Powered by <a href="https://citadoc.lat" target="_blank" rel="noopener">CitaDoc Health Network</a></span></div>'
    +editHTML
    +'</div></div>'
    // Bottom nav
    +'<nav class="wh2-bottom-nav">'
    +'<a class="wh2-nav-item active" href="#inicio"><div class="wh2-nav-icon">'+navIcon('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>')+'</div><span class="wh2-nav-label">Inicio</span></a>'
    +'<a class="wh2-nav-item" href="#servicios"><div class="wh2-nav-icon">'+navIcon('<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>')+'</div><span class="wh2-nav-label">Servicios</span></a>'
    +'<a class="wh2-nav-item wh2-nav-cta" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()"><div class="wh2-nav-icon">'+SVG_CAL+'</div><span class="wh2-nav-label">Agendar</span></a>'
    +'<a class="wh2-nav-item" href="'+(wa||'#')+'" target="_blank"><div class="wh2-nav-icon">'+navIcon('<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>')+'</div><span class="wh2-nav-label">WhatsApp</span></a>'
    +'<a class="wh2-nav-item" href="#sobre-mi"><div class="wh2-nav-icon">'+navIcon('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>')+'</div><span class="wh2-nav-label">Sobre mí</span></a>'
    +'</nav>';

  container.innerHTML=html;
};

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['warm-human-care']=window.renderLayoutWarmHuman;
console.log('[Layouts] warm-human-care renderer registrado ✓');

})();
