/**
 * CitaDoc — Layout: NeoClinic
 * DNA: 'v2-4'
 * Sensación: tech-medical · precision moderna · datos como diseño
 * Blanco total · azul eléctrico · tipografía ultra-bold · app-grade
 */
(function(){

var CSS = `
.nc *{box-sizing:border-box;margin:0;padding:0}
.nc{min-height:100svh;background:#FFFFFF;font-family:'DM Sans',sans-serif;color:#080F1E;padding-bottom:calc(68px + env(safe-area-inset-bottom,0px));overflow-x:hidden}

/* NAV */
.nc-nav{position:sticky;top:0;z-index:90;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1.5px solid #E8EDF5;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px)+12px) 20px 12px;gap:12px}
.nc-brand{display:flex;align-items:center;gap:10px;min-width:0}
.nc-logo-img{height:28px;max-width:110px;object-fit:contain;flex-shrink:0}
.nc-brand-name{font-size:.78rem;font-weight:800;color:#080F1E;letter-spacing:-.02em;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nc-brand-esp{font-size:.44rem;font-weight:600;color:#6B7A9A;letter-spacing:.14em;text-transform:uppercase;line-height:1;margin-top:2px}
.nc-nav-book{display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 16px;border-radius:10px;background:#1D4ED8;color:#fff;font-size:.68rem;font-weight:700;border:none;cursor:pointer;transition:background .2s;letter-spacing:.02em;font-family:'DM Sans',sans-serif;text-decoration:none;flex-shrink:0}
.nc-nav-book:hover{background:#1E40AF}

/* HERO */
.nc-hero{padding:32px 20px 0;background:#FFFFFF}
.nc-hero-chip{display:inline-flex;align-items:center;gap:5px;padding:.24rem .7rem;border-radius:8px;background:#EEF2FF;color:#1D4ED8;font-size:.44rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:16px;border:1px solid #C7D7FD}
.nc-hero-name{font-size:clamp(30px,8.5vw,44px);font-weight:900;line-height:.92;letter-spacing:-.04em;color:#080F1E;margin-bottom:10px;font-family:'DM Sans',sans-serif}
.nc-hero-name .nc-first{display:block}
.nc-hero-name .nc-last{display:block;color:#1D4ED8}
.nc-hero-meta{display:flex;align-items:center;gap:8px;font-size:.58rem;font-weight:600;color:#6B7A9A;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px}
.nc-hero-dot{width:3px;height:3px;border-radius:50%;background:#C7D7FD;flex-shrink:0}
.nc-hero-sub{font-size:14px;color:#3A4A6B;line-height:1.65;margin-bottom:24px;max-width:320px;font-weight:400}
.nc-hero-btns{display:flex;gap:10px;margin-bottom:28px}
.nc-btn-primary{display:flex;align-items:center;justify-content:center;gap:7px;height:52px;border-radius:12px;background:#1D4ED8;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:background .2s;font-family:'DM Sans',sans-serif;text-decoration:none;flex:1}
.nc-btn-primary:hover{background:#1E40AF}
.nc-btn-ghost{display:flex;align-items:center;justify-content:center;gap:7px;height:52px;border-radius:12px;background:transparent;color:#1D4ED8;font-size:14px;font-weight:600;border:1.5px solid #C7D7FD;cursor:pointer;transition:background .2s;font-family:'DM Sans',sans-serif;text-decoration:none;flex:1}
.nc-btn-ghost:hover{background:#EEF2FF}

/* STATS ROW — números como arte */
.nc-stats-row{display:grid;grid-template-columns:repeat(3,1fr);background:#080F1E;border-radius:16px;overflow:hidden;margin-bottom:28px}
.nc-stat{padding:16px 12px;text-align:center;position:relative}
.nc-stat+.nc-stat::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:1px;background:rgba(255,255,255,.08)}
.nc-stat-n{font-size:clamp(22px,6.5vw,30px);font-weight:900;color:#FFFFFF;line-height:1;letter-spacing:-.04em;margin-bottom:4px}
.nc-stat-l{font-size:.44rem;font-weight:600;color:#6B7A9A;text-transform:uppercase;letter-spacing:.12em;line-height:1.3}

/* FOTO */
.nc-photo{width:100%;aspect-ratio:16/9;object-fit:cover;object-position:center 15%;display:block;filter:grayscale(.15) contrast(1.06);margin-bottom:28px}
.nc-photo-wrap{position:relative;overflow:hidden;border-radius:16px;margin:0 20px 28px}
.nc-photo-badge{position:absolute;bottom:14px;left:14px;background:rgba(8,15,30,.82);backdrop-filter:blur(8px);border-radius:10px;padding:8px 12px;border:1px solid rgba(255,255,255,.1)}
.nc-photo-badge-name{font-size:.72rem;font-weight:700;color:#fff;line-height:1}
.nc-photo-badge-esp{font-size:.48rem;font-weight:500;color:#6B9DFF;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}

/* SERVICIOS — lista numerada editorial */
.nc-section{padding:0 20px 28px}
.nc-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.nc-section-title{font-size:.44rem;font-weight:800;color:#1D4ED8;letter-spacing:.2em;text-transform:uppercase}
.nc-section-count{font-size:.44rem;font-weight:600;color:#C7D7FD;letter-spacing:.08em}
.nc-svc-list{display:flex;flex-direction:column}
.nc-svc{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #F0F2F8}
.nc-svc:last-child{border-bottom:none}
.nc-svc-num{font-size:.52rem;font-weight:900;color:#C7D7FD;letter-spacing:.04em;flex-shrink:0;padding-top:2px;min-width:22px;font-family:'DM Sans',sans-serif}
.nc-svc-body{flex:1;min-width:0}
.nc-svc-name{font-size:13.5px;font-weight:700;color:#080F1E;margin-bottom:3px;line-height:1.2}
.nc-svc-desc{font-size:.68rem;color:#6B7A9A;line-height:1.55}
.nc-svc-arrow{font-size:.9rem;color:#C7D7FD;flex-shrink:0;margin-top:2px}

/* DOCTOR CARD */
.nc-doctor-card{margin:0 20px 28px;background:#F8FAFF;border-radius:18px;padding:20px;border:1.5px solid #E8EDF5;position:relative;overflow:hidden}
.nc-doctor-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#1D4ED8,#60A5FA)}
.nc-doctor-card-photo{width:52px;height:52px;border-radius:12px;object-fit:cover;margin-bottom:12px}
.nc-doctor-card-label{font-size:.42rem;font-weight:800;color:#1D4ED8;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px}
.nc-doctor-card-text{font-size:13px;color:#3A4A6B;line-height:1.72;margin-bottom:14px}
.nc-doctor-tags{display:flex;flex-wrap:wrap;gap:6px}
.nc-doctor-tag{padding:.22rem .65rem;border-radius:6px;background:#EEF2FF;color:#1D4ED8;font-size:.48rem;font-weight:600;letter-spacing:.06em}

/* CTA BAND — azul sólido full */
.nc-cta-band{background:#080F1E;padding:28px 20px;margin-bottom:8px}
.nc-cta-band-label{font-size:.42rem;font-weight:700;color:#3B82F6;letter-spacing:.2em;text-transform:uppercase;margin-bottom:10px}
.nc-cta-band-hl{font-family:'Fraunces',serif;font-size:clamp(20px,5.5vw,26px);font-weight:400;font-style:italic;color:#FFFFFF;line-height:1.2;margin-bottom:20px;letter-spacing:-.02em}
.nc-cta-band-btn{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:12px;background:#1D4ED8;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%;margin-bottom:10px}
.nc-cta-band-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:10px;background:transparent;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,.15);cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%}

/* FOOTER */
.nc-foot{padding:14px 20px;text-align:center;border-top:1.5px solid #E8EDF5}
.nc-foot-txt{font-size:.55rem;color:#9AA5C0;letter-spacing:.03em}
.nc-foot-txt a{color:#1D4ED8;text-decoration:none;font-weight:600}

/* BOTTOM NAV */
.nc-bnav{position:fixed;bottom:0;left:0;right:0;z-index:80;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1.5px solid #E8EDF5;display:grid;grid-template-columns:repeat(4,1fr);padding-bottom:env(safe-area-inset-bottom,0px)}
.nc-ni{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 8px;text-decoration:none;cursor:pointer}
.nc-ni-ic{width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:#9AA5C0}
.nc-ni-lb{font-size:.46rem;font-weight:600;color:#9AA5C0;letter-spacing:.02em}
.nc-ni.active .nc-ni-ic,.nc-ni.active .nc-ni-lb{color:#1D4ED8}
.nc-ni-mid{padding:6px 8px;margin:4px 4px;background:#1D4ED8;border-radius:12px}
.nc-ni-mid .nc-ni-ic,.nc-ni-mid .nc-ni-lb{color:#fff !important}

/* REVEAL */
.nc-r{opacity:0;transform:translateY(14px);transition:opacity .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)}
.nc-r.on{opacity:1;transform:none}

@media(min-width:500px){
  .nc{max-width:430px;margin:0 auto;overflow-x:hidden}
  .nc-bnav{max-width:430px;left:50%;transform:translateX(-50%);right:auto}
}
@media(min-width:768px){
  .nc{max-width:none;padding-bottom:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto 1fr auto;min-height:100vh}
  .nc-nav{grid-column:1/-1;position:sticky;top:0;z-index:90;background:rgba(255,255,255,.97);border-bottom:1.5px solid #E8EDF5;padding:0 5%;height:68px;display:flex;align-items:center;justify-content:space-between}
  .nc-hero{grid-column:1;grid-row:2;padding:52px 56px 0;overflow-y:auto}
  .nc-stats-row{grid-column:1;grid-row:3;margin:28px 56px;align-self:end}
  .nc-photo-wrap{grid-column:2;grid-row:2/4;margin:0;border-radius:0;position:sticky;top:68px;height:calc(100vh - 68px);overflow:hidden}
  .nc-photo{aspect-ratio:unset;height:100%;width:100%;object-fit:cover;border-radius:0}
  .nc-section,.nc-doctor-card,.nc-cta-band,.nc-foot{grid-column:1/-1}
  .nc-section{padding:0 56px 28px}
  .nc-doctor-card{margin:0 56px 28px}
  .nc-cta-band{padding:44px 56px}
  .nc-cta-band-btn,.nc-cta-band-wa{width:auto;padding:0 28px;display:inline-flex}
  .nc-foot{padding:16px 56px}
  .nc-hero-name{font-size:clamp(36px,4.5vw,56px)}
  .nc-hero-sub{max-width:480px}
  .nc-hero-btns{flex-direction:row;gap:12px}
  .nc-btn-primary,.nc-btn-ghost{flex:none;width:auto;padding:0 28px}
  .nc-bnav{display:none}
}
@media(min-width:1100px){
  .nc-hero{padding:64px 72px 0}
  .nc-stats-row{margin:28px 72px}
  .nc-section{padding:0 72px 28px}
  .nc-doctor-card{margin:0 72px 28px}
  .nc-cta-band{padding:48px 72px}
  .nc-foot{padding:16px 72px}
  .nc-hero-name{font-size:clamp(44px,4vw,64px)}
}
`;

var SVG = {
  cal:'<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  wa:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>',
  home:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  grid:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  user:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

function injectCSS(){if(document.getElementById('nc-css'))return;var s=document.createElement('style');s.id='nc-css';s.textContent=CSS;document.head.appendChild(s);}
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function waUrl(m,n){if(!m.whatsapp_activo||!m.whatsapp)return null;return'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', quiero agendar una consulta.');}

var DEFAULT_SVCS = [
  {n:'Consulta y diagnóstico integral',d:'Evaluación completa con plan de tratamiento personalizado.'},
  {n:'Procedimientos especializados',d:'Técnicas de vanguardia adaptadas a tu caso clínico.'},
  {n:'Seguimiento continuo',d:'Control periódico y ajuste del tratamiento según evolución.'},
  {n:'Atención de urgencias',d:'Disponibilidad para situaciones que requieren atención inmediata.'},
];

window.renderLayoutNeoClinic = function(config, doctor, locs, container) {
  injectCSS();
  var m = doctor, wc = config || {};
  var ws = config._ws || {};
  var titulo = m.titulo || 'Dr.';
  var fullName = titulo + ' ' + m.nombre + ' ' + m.apellido;
  var firstName = m.nombre || '';
  var lastName = m.apellido || '';
  var esp = (m.especialidades || [])[0] || 'Medicina';
  var ciudad = m.ciudad || '';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var logo = wc.logo_url || null;
  var wa = waUrl(m, fullName);
  var waHref = wa || '#';

  var hl = wc.headline || 'Medicina de precisión, resultados que transforman.';
  var sub = wc.subheadline || hl;
  var about = wc.about_text || wc.doctor_story || '';
  var diffs = wc.differentiators || [];
  var rawSrvs = wc.services || [];
  var srvs = rawSrvs.length ? rawSrvs.slice(0, 6) : DEFAULT_SVCS;
  var phi = wc.philosophy || '';

  // Stats
  var statItems = [];
  if (wc.years_experience) statItems.push({n: wc.years_experience + '+', l: 'Años exp.'});
  if (wc.patients_treated) statItems.push({n: wc.patients_treated + '+', l: 'Pacientes'});
  if (wc.procedures_count || wc.techniques_count) statItems.push({n: (wc.procedures_count || wc.techniques_count) + '+', l: 'Procedimientos'});
  if (!statItems.length) statItems = [{n:'8+',l:'Años'},{n:'1,000+',l:'Pacientes'},{n:'98%',l:'Satisfacción'}];

  var statsHTML = '<div class="nc-stats-row nc-r">' + statItems.slice(0,3).map(function(s){
    return '<div class="nc-stat"><div class="nc-stat-n">'+esc(s.n)+'</div><div class="nc-stat-l">'+esc(s.l)+'</div></div>';
  }).join('') + '</div>';

  var navBrand = logo
    ? '<img class="nc-logo-img" src="'+esc(logo)+'" alt="'+esc(fullName)+'">'
    : '<div class="nc-brand"><div class="nc-brand-name">'+esc(titulo)+' '+esc(lastName)+'</div><div class="nc-brand-esp">'+esc(esp+(ciudad?' · '+ciudad:''))+'</div></div>';

  var photoHTML = photo
    ? '<div class="nc-photo-wrap nc-r"><img class="nc-photo" src="'+esc(photo)+'" alt="'+esc(fullName)+'"><div class="nc-photo-badge"><div class="nc-photo-badge-name">'+esc(fullName)+'</div><div class="nc-photo-badge-esp">'+esc(esp)+'</div></div></div>'
    : '';

  var svcsHTML = '<div class="nc-section nc-r" data-ws="services">'
    + '<div class="nc-section-header"><div class="nc-section-title">Servicios</div><div class="nc-section-count">0'+srvs.length+' disponibles</div></div>'
    + '<div class="nc-svc-list">'
    + srvs.map(function(s, i) {
        var nm = s.n || s.t || s.titulo || s.name || String(s);
        var ds = s.d || s.desc || s.descripcion || s.description || '';
        return '<div class="nc-svc">'
          + '<div class="nc-svc-num">'+String(i+1).padStart(2,'0')+'</div>'
          + '<div class="nc-svc-body"><div class="nc-svc-name">'+esc(nm)+'</div>'+(ds?'<div class="nc-svc-desc">'+esc(ds)+'</div>':'')+'</div>'
          + '<div class="nc-svc-arrow">→</div>'
          + '</div>';
      }).join('')
    + '</div></div>';

  var diffsHTML = (about || diffs.length)
    ? '<div class="nc-doctor-card nc-r">'
      + (photo ? '<img class="nc-doctor-card-photo" src="'+esc(photo)+'" alt="">' : '')
      + '<div class="nc-doctor-card-label">Sobre el especialista</div>'
      + (about ? '<p class="nc-doctor-card-text">'+esc(about)+'</p>' : '')
      + (diffs.length ? '<div class="nc-doctor-tags">'+diffs.slice(0,5).map(function(d){return'<span class="nc-doctor-tag">'+esc(d)+'</span>';}).join('')+'</div>' : '')
      + '</div>'
    : '';

  var html =
    '<div class="nc">'
    + '<nav class="nc-nav">'+navBrand+(ws.show_booking!==false?'<button class="nc-nav-book" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVG.cal+' Reservar</button>':'')+'</nav>'
    + '<div class="nc-hero">'
    + '<div class="nc-hero-chip">'+esc(esp)+(ciudad?' · '+esc(ciudad):'')+'</div>'
    + '<h1 class="nc-hero-name"><span class="nc-first">'+esc(titulo)+' '+esc(firstName)+'</span><span class="nc-last">'+esc(lastName)+'</span></h1>'
    + '<p class="nc-hero-sub">'+esc(sub)+'</p>'
    + '<div class="nc-hero-btns">'+(ws.show_booking!==false?'<button class="nc-btn-primary" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVG.cal+' Agendar consulta</button>':'')+(wa&&ws.show_whatsapp!==false?'<a class="nc-btn-ghost" data-ws="whatsapp" href="'+esc(waHref)+'" target="_blank" rel="noopener">'+SVG.wa+' WhatsApp</a>':'')+'</div>'
    + '</div>'
    + statsHTML
    + photoHTML
    + (ws.show_services!==false?svcsHTML:'')
    + diffsHTML
    + (phi ? '<div class="nc-section nc-r" style="padding-bottom:20px"><div style="font-family:\'Fraunces\',serif;font-size:clamp(16px,4.8vw,20px);font-weight:300;font-style:italic;color:#3A4A6B;line-height:1.6;border-left:3px solid #1D4ED8;padding-left:16px">'+esc(phi)+'</div></div>' : '')
    + (ws.show_cta!==false?'<div class="nc-cta-band nc-r" data-ws="cta"><div class="nc-cta-band-label">Próximo paso</div><div class="nc-cta-band-hl">Tu salud merece al mejor especialista</div>'+(ws.show_booking!==false?'<button class="nc-cta-band-btn" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVG.cal+' Agendar mi consulta</button>':'')+(wa&&ws.show_whatsapp!==false?'<a class="nc-cta-band-wa" data-ws="whatsapp" href="'+esc(waHref)+'" target="_blank" rel="noopener">'+SVG.wa+' Escribir por WhatsApp</a>':'')+'</div>':'')
    + '<div class="nc-foot"><div class="nc-foot-txt">Powered by <a href="https://citadoc.lat" target="_blank">CitaDoc</a></div></div>'
    + '<nav class="nc-bnav">'
    + '<a class="nc-ni active" href="#" onclick="window.scrollTo({top:0,behavior:\'smooth\'});return false"><div class="nc-ni-ic">'+SVG.home+'</div><span class="nc-ni-lb">Inicio</span></a>'
    + '<a class="nc-ni" href="#" onclick="container&&container.querySelector(\'.nc-svc-list\')&&container.querySelector(\'.nc-svc-list\').scrollIntoView({behavior:\'smooth\'});return false"><div class="nc-ni-ic">'+SVG.grid+'</div><span class="nc-ni-lb">Servicios</span></a>'
    + '<a class="nc-ni nc-ni-mid" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()"><div class="nc-ni-ic">'+SVG.cal+'</div><span class="nc-ni-lb">Agendar</span></a>'
    + (wa?'<a class="nc-ni" href="'+esc(waHref)+'" target="_blank"><div class="nc-ni-ic">'+SVG.wa+'</div><span class="nc-ni-lb">WhatsApp</span></a>':'<a class="nc-ni" href="#"><div class="nc-ni-ic">'+SVG.user+'</div><span class="nc-ni-lb">Perfil</span></a>')
    + '</nav>'
    + '</div>';

  container.innerHTML = html;

  var els = container.querySelectorAll('.nc-r');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target);}});},{threshold:.1});
    els.forEach(function(el){io.observe(el);});
  } else { els.forEach(function(el){el.classList.add('on');}); }
};

window.LAYOUT_RENDERERS = window.LAYOUT_RENDERERS || {};
window.LAYOUT_RENDERERS['neoclinic'] = window.renderLayoutNeoClinic;
window.LAYOUT_RENDERERS['v2-4'] = window.renderLayoutNeoClinic; // legacy alias
console.log('[Layouts] neoclinic renderer registrado ✓');
})();
