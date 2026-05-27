/**
 * CitaDoc — Layout: Sand Wellness
 * DNA: 'v3-3'
 * Sensación: tierra · calma · bienestar · medicina integrativa
 * Arena cálida · terracota · sage · tipografía serif fluida · journey visual
 */
(function(){

var CSS = `
.sw *{box-sizing:border-box;margin:0;padding:0}
.sw{min-height:100svh;background:#F7EFE0;font-family:'DM Sans',sans-serif;color:#2C1A0E;padding-bottom:calc(72px + env(safe-area-inset-bottom,0px));overflow-x:hidden}

/* NAV */
.sw-nav{position:sticky;top:0;z-index:80;background:rgba(247,239,224,.97);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(181,103,58,.14);display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px)+13px) 20px 13px;gap:12px}
.sw-brand{display:flex;flex-direction:column;gap:1px}
.sw-brand-n{font-family:'Fraunces',serif;font-size:.9rem;font-weight:400;color:#2C1A0E;letter-spacing:-.02em;line-height:1}
.sw-brand-e{font-size:.44rem;font-weight:600;color:#9C7A5A;letter-spacing:.16em;text-transform:uppercase;margin-top:2px}
.sw-logo-img{height:28px;max-width:110px;object-fit:contain}
.sw-nav-btn{display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 15px;border-radius:20px;background:transparent;color:#B5673A;font-size:.65rem;font-weight:700;border:1.5px solid rgba(181,103,58,.35);cursor:pointer;transition:background .2s;font-family:'DM Sans',sans-serif;text-decoration:none;flex-shrink:0}
.sw-nav-btn:hover{background:rgba(181,103,58,.08)}

/* HERO — centrado, serif grande */
.sw-hero{padding:36px 24px 32px;text-align:center;background:linear-gradient(180deg,#F7EFE0 0%,#F0E2CB 100%);position:relative}
.sw-hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(180deg,transparent,#F7EFE0)}
.sw-hero-label{display:inline-block;font-size:.44rem;font-weight:700;color:#9C7A5A;letter-spacing:.22em;text-transform:uppercase;margin-bottom:16px;padding:.24rem .8rem;border-radius:20px;background:rgba(181,103,58,.1);border:1px solid rgba(181,103,58,.2)}
.sw-hero-hl{font-family:'Fraunces',serif;font-size:clamp(26px,7.5vw,38px);font-weight:400;font-style:italic;color:#2C1A0E;line-height:1.14;letter-spacing:-.025em;margin-bottom:12px}
.sw-hero-hl em{font-style:normal;color:#B5673A}
.sw-hero-name{font-size:.72rem;font-weight:700;color:#B5673A;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.sw-hero-city{font-size:.52rem;font-weight:500;color:#9C7A5A;letter-spacing:.1em;text-transform:uppercase;margin-bottom:24px;display:flex;align-items:center;justify-content:center;gap:6px}
.sw-hero-city::before,.sw-hero-city::after{content:'';flex:0 0 24px;height:1px;background:rgba(156,122,90,.3)}
.sw-hero-btns{display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto}
.sw-btn-terra{display:flex;align-items:center;justify-content:center;gap:7px;height:52px;border-radius:14px;background:#B5673A;color:#F7EFE0;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:background .2s;font-family:'DM Sans',sans-serif;text-decoration:none}
.sw-btn-terra:hover{background:#9A5530}
.sw-btn-sage{display:flex;align-items:center;justify-content:center;gap:7px;height:48px;border-radius:14px;background:transparent;color:#5A7A4E;font-size:13.5px;font-weight:600;border:1.5px solid rgba(90,122,78,.3);cursor:pointer;transition:background .2s;font-family:'DM Sans',sans-serif;text-decoration:none}
.sw-btn-sage:hover{background:rgba(90,122,78,.07)}

/* SERVICIOS — pill grid fluido */
.sw-sec{padding:28px 20px}
.sw-sec-lbl{font-size:.44rem;font-weight:700;color:#9C7A5A;letter-spacing:.2em;text-transform:uppercase;text-align:center;margin-bottom:20px}
.sw-pills-grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px}
.sw-pill{display:inline-flex;align-items:center;gap:6px;padding:.5rem 1rem;border-radius:30px;background:#EFE2CC;border:1px solid rgba(181,103,58,.18);cursor:pointer;transition:all .2s}
.sw-pill:hover,.sw-pill.open{background:#B5673A;border-color:#B5673A}
.sw-pill:hover .sw-pill-t,.sw-pill.open .sw-pill-t{color:#F7EFE0}
.sw-pill-ico{font-size:.85rem;line-height:1}
.sw-pill-t{font-size:.72rem;font-weight:600;color:#5A3A20;transition:color .2s}
.sw-svc-detail{background:#EFE2CC;border-radius:16px;padding:16px;border:1px solid rgba(181,103,58,.18);font-size:13px;color:#7A5A3A;line-height:1.65;margin-top:4px;display:none}
.sw-svc-detail.open{display:block}

/* HISTORIA — card cálida con foto */
.sw-story{margin:0 12px 24px;background:#EFE2CC;border-radius:22px;padding:24px;border:1px solid rgba(181,103,58,.15);overflow:hidden;position:relative}
.sw-story-photo{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center 10%;border-radius:16px;margin-bottom:18px;filter:contrast(1.04) saturate(.95) brightness(1.02)}
.sw-story-lbl{font-size:.44rem;font-weight:700;color:#9C7A5A;letter-spacing:.2em;text-transform:uppercase;margin-bottom:10px}
.sw-story-hl{font-family:'Fraunces',serif;font-size:clamp(18px,5vw,22px);font-weight:400;color:#2C1A0E;line-height:1.25;letter-spacing:-.02em;margin-bottom:12px}
.sw-story-hl em{font-style:italic;color:#B5673A}
.sw-story-txt{font-size:13.5px;color:#5A3A20;line-height:1.78}
.sw-story-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.sw-story-tag{padding:.24rem .65rem;border-radius:8px;background:rgba(181,103,58,.1);color:#9C7A5A;font-size:.5rem;font-weight:600;letter-spacing:.06em;border:1px solid rgba(181,103,58,.18)}

/* JOURNEY — 3 pasos, scroll horizontal */
.sw-journey-scroll{display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 6px;padding-right:20px}
.sw-journey-scroll::-webkit-scrollbar{display:none}
.sw-step{flex:0 0 72vw;max-width:260px;scroll-snap-align:start;background:#EFE2CC;border-radius:18px;padding:18px 16px;border:1px solid rgba(181,103,58,.15)}
.sw-step-num{font-family:'Fraunces',serif;font-size:2.2rem;font-weight:400;color:rgba(181,103,58,.25);line-height:1;margin-bottom:8px}
.sw-step-n{font-size:13px;font-weight:700;color:#2C1A0E;margin-bottom:5px;line-height:1.2}
.sw-step-d{font-size:.68rem;color:#9C7A5A;line-height:1.6}

/* FILOSOFÍA */
.sw-phi{padding:36px 24px;text-align:center;background:linear-gradient(135deg,#EFE2CC 0%,#F7EFE0 100%);border-top:1px solid rgba(181,103,58,.12);border-bottom:1px solid rgba(181,103,58,.12)}
.sw-phi-sage{width:28px;height:2px;background:#5A7A4E;margin:0 auto 16px;border-radius:2px}
.sw-phi-txt{font-family:'Fraunces',serif;font-size:clamp(16px,5vw,21px);font-weight:300;font-style:italic;color:#2C1A0E;line-height:1.65;max-width:290px;margin:0 auto 16px}
.sw-phi-autor{font-size:.5rem;font-weight:700;color:#9C7A5A;letter-spacing:.16em;text-transform:uppercase}

/* CTA */
.sw-cta{margin:8px 12px 20px;background:#2C1A0E;border-radius:22px;padding:28px 22px;text-align:center}
.sw-cta-tag{font-size:.44rem;font-weight:700;color:#B5673A;letter-spacing:.2em;text-transform:uppercase;margin-bottom:10px}
.sw-cta-hl{font-family:'Fraunces',serif;font-size:clamp(18px,5vw,23px);font-weight:400;font-style:italic;color:#F7EFE0;line-height:1.25;margin-bottom:20px;letter-spacing:-.02em}
.sw-cta-btn{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:14px;background:#B5673A;color:#F7EFE0;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%;margin-bottom:10px}
.sw-cta-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:12px;background:transparent;color:rgba(247,239,224,.65);font-size:13px;font-weight:600;border:1px solid rgba(247,239,224,.18);cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%}

/* FOOTER */
.sw-foot{padding:14px 20px;text-align:center;border-top:1px solid rgba(181,103,58,.14)}
.sw-foot-txt{font-size:.55rem;color:#9C7A5A;letter-spacing:.03em}
.sw-foot-txt a{color:#B5673A;text-decoration:none;font-weight:600}

/* BOTTOM NAV */
.sw-bnav{position:fixed;bottom:0;left:0;right:0;z-index:80;background:rgba(247,239,224,.97);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid rgba(181,103,58,.14);display:grid;grid-template-columns:repeat(4,1fr);padding-bottom:env(safe-area-inset-bottom,0px)}
.sw-ni{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 8px;text-decoration:none;cursor:pointer}
.sw-ni-ic{font-size:18px;line-height:1;color:#9C7A5A;display:flex;align-items:center;justify-content:center;width:22px;height:22px}
.sw-ni-lb{font-size:.46rem;font-weight:600;color:#9C7A5A;letter-spacing:.02em}
.sw-ni.active .sw-ni-ic,.sw-ni.active .sw-ni-lb{color:#B5673A}
.sw-ni-mid{background:#B5673A;border-radius:12px;margin:4px 6px;padding:5px 6px}
.sw-ni-mid .sw-ni-ic,.sw-ni-mid .sw-ni-lb{color:#F7EFE0 !important}

/* REVEAL */
.sw-r{opacity:0;transform:translateY(16px);transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)}
.sw-r.on{opacity:1;transform:none}

@media(min-width:500px){
  .sw{max-width:430px;margin:0 auto;overflow-x:hidden}
  .sw-bnav{max-width:430px;left:50%;transform:translateX(-50%);right:auto}
}
@media(min-width:768px){
  .sw{max-width:960px;margin:0 auto;padding-bottom:0;overflow-x:hidden}
  .sw-nav{padding:0 40px;height:64px;display:flex;align-items:center}
  .sw-hero{padding:56px 48px 52px}
  .sw-hero-hl{font-size:clamp(32px,4vw,52px)}
  .sw-hero-btns{flex-direction:row;gap:12px;max-width:none}
  .sw-btn-terra,.sw-btn-sage{flex:none;width:auto;padding:0 28px}
  .sw-sec{padding:36px 48px}
  .sw-story{margin:0 48px 28px;display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start}
  .sw-story-photo{margin-bottom:0;aspect-ratio:3/4;object-fit:cover;grid-column:1;grid-row:1/5}
  .sw-story-lbl{grid-column:2;grid-row:1;margin-top:8px}
  .sw-story-hl{grid-column:2;grid-row:2;font-size:clamp(20px,2.5vw,28px)}
  .sw-story-txt{grid-column:2;grid-row:3}
  .sw-story-tags{grid-column:2;grid-row:4}
  .sw-sec .sw-sec-lbl + .sw-pills-grid{justify-content:flex-start}
  .sw-journey-scroll{flex-direction:row;overflow-x:visible;flex-wrap:nowrap;margin:0 48px;padding:0 0 6px;gap:16px}
  .sw-step{flex:1;max-width:none}
  .sw-phi{padding:52px 56px}
  .sw-phi-txt{max-width:520px}
  .sw-cta{margin:8px 48px 28px;padding:40px 48px}
  .sw-cta-btn,.sw-cta-wa{width:auto;padding:0 28px;display:inline-flex;flex:none}
  .sw-foot{padding:16px 48px}
  .sw-bnav{max-width:960px;left:50%;transform:translateX(-50%);right:auto}
}
@media(min-width:1100px){
  .sw{max-width:1100px}
  .sw-hero{padding:64px 56px 60px}
  .sw-story{margin:0 56px 28px}
  .sw-journey-scroll{margin:0 56px}
  .sw-cta{margin:8px 56px 28px}
  .sw-bnav{max-width:1100px}
}
`;

var SVG = {
  cal:'<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  wa:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>',
  home:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  leaf:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 8C8 10 5.9 16.17 3.82 19.34A10 10 0 0015 21c4.5 0 7-2 9-7-2.5.5-6 .5-9-1.5C17 11 17 8 17 8z"/></svg>',
  user:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

function injectCSS(){if(document.getElementById('sw-css'))return;var s=document.createElement('style');s.id='sw-css';s.textContent=CSS;document.head.appendChild(s);}
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function waUrl(m,n){if(!m.whatsapp_activo||!m.whatsapp)return null;return'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', me gustaría agendar una consulta.');}

var SVC_ICONS = ['🌿','🌱','☀️','💧','🌸','✦'];
var DEFAULT_SVCS = [
  {t:'Consulta Integral',d:'Evaluación completa de tu salud con enfoque preventivo y personalizado.'},
  {t:'Plan de Bienestar',d:'Diseño de rutinas y hábitos adaptados a tu estilo de vida.'},
  {t:'Seguimiento Continuo',d:'Acompañamiento cercano en cada etapa de tu proceso.'},
  {t:'Medicina Preventiva',d:'Detectar antes de tratar. Salud que dura toda la vida.'},
];
var DEFAULT_JOURNEY = [
  {n:'Agenda tu consulta',d:'Elige el horario que mejor se adapta a tu rutina. En minutos.'},
  {n:'Tu primera consulta',d:'Te escucho completamente antes de cualquier diagnóstico.'},
  {n:'Tu plan personalizado',d:'Un plan diseñado específicamente para ti, no para todos.'},
];

window.renderLayoutSandWellness = function(config, doctor, locs, container) {
  injectCSS();
  var m = doctor, wc = config || {};
  var ws = config._ws || {};
  var titulo = m.titulo || 'Dr.';
  var fullName = titulo + ' ' + m.nombre + ' ' + m.apellido;
  var firstName = m.nombre || '';
  var esp = (m.especialidades || [])[0] || 'Medicina';
  var ciudad = m.ciudad || '';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var logo = wc.logo_url || null;
  var wa = waUrl(m, fullName);
  var waHref = wa || '#';

  var hl = wc.headline || 'Tu bienestar es un camino, no un destino.';
  var hlParts = hl.replace(/\.$/, '').split(',');
  var hl1 = hlParts[0] ? hlParts[0].trim() : hl;
  var hl2 = hlParts[1] ? hlParts[1].trim() : null;
  var about = wc.about_text || wc.doctor_story || '';
  var phi = wc.philosophy || 'Cuidar a una persona es escuchar su historia antes de ver sus síntomas.';
  var diffs = wc.differentiators || [];
  var rawSrvs = wc.services || [];
  var srvs = rawSrvs.length ? rawSrvs.slice(0, 6) : DEFAULT_SVCS;
  var journey = wc.journey || wc.first_visit_steps || DEFAULT_JOURNEY;

  var navBrand = logo
    ? '<img class="sw-logo-img" src="'+esc(logo)+'" alt="'+esc(fullName)+'">'
    : '<div class="sw-brand"><div class="sw-brand-n">'+esc(titulo)+' '+esc(firstName)+'</div><div class="sw-brand-e">'+esc(esp+(ciudad?' · '+ciudad:''))+'</div></div>';

  var pillsHTML = srvs.map(function(s, i) {
    var ico = s.icon || SVC_ICONS[i % SVC_ICONS.length];
    var nm = s.t || s.titulo || s.name || String(s);
    var ds = s.d || s.desc || s.descripcion || s.description || '';
    return '<div class="sw-pill" onclick="var d=this.nextElementSibling;var o=d.classList.toggle(\'open\');this.classList.toggle(\'open\',o)">'
      + '<span class="sw-pill-ico">'+ico+'</span>'
      + '<span class="sw-pill-t">'+esc(nm)+'</span>'
      + '</div>'
      + (ds ? '<div class="sw-svc-detail">'+esc(ds)+'</div>' : '');
  }).join('');

  var journeyHTML = journey.slice(0, 3).map(function(s, i) {
    var nm = s.n || s.titulo || s.name || String(s);
    var ds = s.d || s.desc || s.description || '';
    return '<div class="sw-step">'
      + '<div class="sw-step-num">0'+(i+1)+'</div>'
      + '<div class="sw-step-n">'+esc(nm)+'</div>'
      + (ds ? '<div class="sw-step-d">'+esc(ds)+'</div>' : '')
      + '</div>';
  }).join('');

  var storyHTML = (about || diffs.length || photo)
    ? '<div class="sw-story sw-r">'
      + (photo ? '<img class="sw-story-photo" src="'+esc(photo)+'" alt="'+esc(fullName)+'">' : '')
      + '<div class="sw-story-lbl">Sobre el especialista</div>'
      + '<div class="sw-story-hl"><em>'+esc(titulo)+' '+esc(firstName)+'</em></div>'
      + (about ? '<p class="sw-story-txt">'+esc(about)+'</p>' : '')
      + (diffs.length ? '<div class="sw-story-tags">'+diffs.slice(0,5).map(function(d){return'<span class="sw-story-tag">'+esc(d)+'</span>';}).join('')+'</div>' : '')
      + '</div>'
    : '';

  var html =
    '<div class="sw">'
    + '<nav class="sw-nav">'+navBrand+(ws.show_booking!==false?'<a class="sw-nav-btn" data-ws="booking" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()">'+SVG.cal+' Agendar</a>':'')+'</nav>'
    + '<section class="sw-hero">'
    + '<div class="sw-hero-label">'+esc(esp)+(ciudad?' · '+esc(ciudad):'')+'</div>'
    + '<h1 class="sw-hero-hl">'+esc(hl1)+(hl2?'<br><em>'+esc(hl2)+'</em>':'')+'</h1>'
    + '<div class="sw-hero-name">'+esc(titulo)+' '+esc(m.nombre)+' '+esc(m.apellido)+'</div>'
    + (ciudad ? '<div class="sw-hero-city">'+esc(ciudad)+'</div>' : '')
    + '<div class="sw-hero-btns">'+(ws.show_booking!==false?'<button class="sw-btn-terra" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVG.cal+' Reservar consulta</button>':'')+(wa&&ws.show_whatsapp!==false?'<a class="sw-btn-sage" data-ws="whatsapp" href="'+esc(waHref)+'" target="_blank" rel="noopener">'+SVG.wa+' WhatsApp</a>':'')+'</div>'
    + '</section>'
    + (ws.show_services!==false?'<div class="sw-sec sw-r" data-ws="services"><div class="sw-sec-lbl">Áreas de atención</div><div class="sw-pills-grid">'+pillsHTML+'</div></div>':'')
    + storyHTML
    + '<div class="sw-sec sw-r"><div class="sw-sec-lbl">Tu camino con nosotros</div><div class="sw-journey-scroll">'+journeyHTML+'</div></div>'
    + '<div class="sw-phi sw-r"><div class="sw-phi-sage"></div><p class="sw-phi-txt">'+esc(phi)+'</p><div class="sw-phi-autor">'+esc(titulo)+' '+esc(firstName)+'</div></div>'
    + (ws.show_cta!==false?'<div class="sw-cta sw-r" data-ws="cta"><div class="sw-cta-tag">Dar el primer paso</div><div class="sw-cta-hl">Tu salud en manos que realmente escuchan</div>'+(ws.show_booking!==false?'<button class="sw-cta-btn" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVG.cal+' Agendar mi consulta</button>':'')+(wa&&ws.show_whatsapp!==false?'<a class="sw-cta-wa" data-ws="whatsapp" href="'+esc(waHref)+'" target="_blank" rel="noopener">'+SVG.wa+' Escribir por WhatsApp</a>':'')+'</div>':'')
    + '<div class="sw-foot"><div class="sw-foot-txt">Powered by <a href="https://citadoc.lat" target="_blank">CitaDoc</a></div></div>'
    + '<nav class="sw-bnav">'
    + '<a class="sw-ni active" href="#" onclick="window.scrollTo({top:0,behavior:\'smooth\'});return false"><div class="sw-ni-ic">'+SVG.home+'</div><span class="sw-ni-lb">Inicio</span></a>'
    + '<a class="sw-ni" href="#" onclick="container&&container.querySelector(\'.sw-pills-grid\')&&container.querySelector(\'.sw-pills-grid\').scrollIntoView({behavior:\'smooth\'});return false"><div class="sw-ni-ic">'+SVG.leaf+'</div><span class="sw-ni-lb">Servicios</span></a>'
    + '<a class="sw-ni sw-ni-mid" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()"><div class="sw-ni-ic">'+SVG.cal+'</div><span class="sw-ni-lb">Agendar</span></a>'
    + (wa?'<a class="sw-ni" href="'+esc(waHref)+'" target="_blank"><div class="sw-ni-ic">'+SVG.wa+'</div><span class="sw-ni-lb">WhatsApp</span></a>':'<a class="sw-ni" href="#"><div class="sw-ni-ic">'+SVG.user+'</div><span class="sw-ni-lb">Sobre mí</span></a>')
    + '</nav>'
    + '</div>';

  container.innerHTML = html;

  var els = container.querySelectorAll('.sw-r');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target);}});},{threshold:.1});
    els.forEach(function(el){io.observe(el);});
  } else { els.forEach(function(el){el.classList.add('on');}); }
};

window.LAYOUT_RENDERERS = window.LAYOUT_RENDERERS || {};
window.LAYOUT_RENDERERS['sand-wellness'] = window.renderLayoutSandWellness;
window.LAYOUT_RENDERERS['v3-3'] = window.renderLayoutSandWellness; // legacy alias
console.log('[Layouts] sand-wellness renderer registrado ✓');
})();
