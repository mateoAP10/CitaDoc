/**
 * CitaDoc — Layout: Aesthetic Luxe
 * DNA: 'aesthetic-luxe'
 * Sensación: lujo · transformación · belleza médica · editorial
 * 4 paletas dinámicas seeded por slug — cada médico se ve diferente
 */
(function(){

// ── 4 PALETAS ─────────────────────────────────────────────
var P = {
  rose: {
    bg:'#FAF5F0', card:'#F5EDE6', accent:'#B8736A', soft:'rgba(184,115,106,.11)',
    text:'#1E1208', muted:'#8C6B5E', cta:'#9B5E54', ctaFg:'#FAF5F0',
    gold:'#C4986A', line:'rgba(184,115,106,.14)', nav:'rgba(250,245,240,.96)',
    gr:'linear-gradient(150deg,#FAF5F0 0%,#F0E0D6 100%)', dark:0
  },
  noir: {
    bg:'#0E0C0A', card:'#1C1814', accent:'#D4A86A', soft:'rgba(212,168,106,.14)',
    text:'#F5EDE0', muted:'#A08870', cta:'#D4A86A', ctaFg:'#0E0C0A',
    gold:'#D4A86A', line:'rgba(212,168,106,.14)', nav:'rgba(14,12,10,.97)',
    gr:'linear-gradient(150deg,#1C1814 0%,#0A0806 100%)', dark:1
  },
  sage: {
    bg:'#F5F8F4', card:'#EBF2E8', accent:'#5E8C60', soft:'rgba(94,140,96,.11)',
    text:'#182A1A', muted:'#567A58', cta:'#4A7A4D', ctaFg:'#FFFFFF',
    gold:'#8FAF72', line:'rgba(94,140,96,.15)', nav:'rgba(245,248,244,.96)',
    gr:'linear-gradient(150deg,#F5F8F4 0%,#E6F0E4 100%)', dark:0
  },
  lavande: {
    bg:'#F7F4FA', card:'#EBE4F5', accent:'#7B5A9A', soft:'rgba(123,90,154,.11)',
    text:'#180F28', muted:'#6A4E82', cta:'#5C3A98', ctaFg:'#FFFFFF',
    gold:'#B888C4', line:'rgba(123,90,154,.14)', nav:'rgba(247,244,250,.96)',
    gr:'linear-gradient(150deg,#F7F4FA 0%,#E8DFF5 100%)', dark:0
  }
};

function getPalette(slug) {
  var s = slug || '';
  var seed = ((s.charCodeAt(0)||0) + (s.charCodeAt(1)||0) + (s.charCodeAt(2)||0));
  return [P.rose, P.noir, P.sage, P.lavande][seed % 4];
}

// ── CSS dinámico por paleta ───────────────────────────────
function buildCSS(p) { return `
.al{min-height:100svh;background:${p.bg};font-family:'DM Sans',sans-serif;color:${p.text};padding-bottom:calc(72px + env(safe-area-inset-bottom,0px));overflow-x:hidden}
.al *{box-sizing:border-box;margin:0;padding:0}

/* NAV */
.al-nav{position:sticky;top:0;z-index:80;background:${p.nav};backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid ${p.line};display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 13px) 20px 13px}
.al-brand{display:flex;flex-direction:column;gap:1px}
.al-brand-n{font-family:'Fraunces',serif;font-size:.82rem;font-weight:400;color:${p.text};letter-spacing:-.015em;line-height:1.1}
.al-brand-e{font-size:.46rem;color:${p.muted};letter-spacing:.16em;text-transform:uppercase;font-weight:600}
.al-logo-img{height:26px;max-width:100px;object-fit:contain}
.al-nav-cta{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 14px;border-radius:20px;background:${p.cta};color:${p.ctaFg};font-size:.65rem;font-weight:700;border:none;cursor:pointer;transition:opacity .2s;letter-spacing:.03em;font-family:'DM Sans',sans-serif;text-decoration:none;flex-shrink:0}
.al-nav-cta:hover{opacity:.85}

/* HERO */
.al-hero{min-height:88svh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 22px 30px;position:relative;overflow:hidden;background:${p.gr}}
.al-hero-img{position:absolute;inset:0;z-index:1}
.al-hero-img img{width:100%;height:100%;object-fit:cover;object-position:center 12%;opacity:${p.dark ? '.32' : '.15'};filter:${p.dark ? 'none' : 'grayscale(.25) contrast(1.08) brightness(1.05)'}}
.al-hero-grad{position:absolute;inset:0;z-index:2;background:${p.dark ? 'linear-gradient(180deg,rgba(14,12,10,0) 10%,rgba(14,12,10,.75) 60%,rgba(14,12,10,.97) 100%)' : 'linear-gradient(180deg,rgba(250,245,240,0) 20%,rgba(250,245,240,.6) 65%,' + p.bg + ' 100%)'}}
.al-hero-body{position:relative;z-index:3}
.al-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:.26rem .75rem;border-radius:20px;font-size:.46rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;background:${p.soft};color:${p.accent};border:1px solid ${p.line};margin-bottom:14px}
.al-hero-titulo{font-size:.52rem;font-weight:700;color:${p.accent};letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px;font-style:italic}
.al-hero-name{font-family:'Fraunces',serif;font-size:clamp(34px,9.5vw,50px);font-weight:400;line-height:.94;letter-spacing:-.04em;color:${p.text};margin-bottom:8px}
.al-hero-name .light{font-weight:300;font-style:italic}
.al-hero-city{font-size:.5rem;font-weight:600;color:${p.muted};letter-spacing:.16em;text-transform:uppercase;margin-bottom:16px}
.al-hero-hl{font-family:'Fraunces',serif;font-size:clamp(14px,4.2vw,18px);font-weight:300;font-style:italic;color:${p.muted};line-height:1.5;margin-bottom:24px;max-width:270px}
.al-hero-btns{display:flex;gap:9px}
.al-btn-p{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:50px;padding:0 20px;border-radius:14px;background:${p.cta};color:${p.ctaFg};font-size:13.5px;font-weight:700;border:none;cursor:pointer;transition:opacity .2s;font-family:'DM Sans',sans-serif;text-decoration:none;flex:1}
.al-btn-p:hover{opacity:.87}
.al-btn-o{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:50px;padding:0 18px;border-radius:14px;background:transparent;color:${p.text};font-size:13.5px;font-weight:600;border:1.5px solid ${p.line};cursor:pointer;transition:background .2s;font-family:'DM Sans',sans-serif;text-decoration:none;flex:1}
.al-btn-o:hover{background:${p.soft}}

/* SECCIÓN GENÉRICA */
.al-sec{padding:28px 20px}
.al-sec-lbl{font-size:.45rem;font-weight:700;color:${p.muted};letter-spacing:.2em;text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.al-sec-lbl::after{content:'';flex:1;height:1px;background:${p.line}}

/* TRATAMIENTOS — scroll horizontal */
.al-treats{display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding-bottom:4px;margin:0 -20px;padding-left:20px;padding-right:20px}
.al-treats::-webkit-scrollbar{display:none}
.al-treat-card{flex:0 0 58vw;max-width:220px;scroll-snap-align:start;background:${p.card};border:1px solid ${p.line};border-radius:18px;padding:18px 16px;display:flex;flex-direction:column;gap:5px}
.al-treat-ico{font-size:1.5rem;line-height:1;margin-bottom:6px}
.al-treat-n{font-family:'Fraunces',serif;font-size:.95rem;font-weight:400;color:${p.text};line-height:1.2}
.al-treat-d{font-size:.68rem;color:${p.muted};line-height:1.55;flex:1}
.al-treat-tag{margin-top:6px;font-size:.44rem;font-weight:700;color:${p.accent};letter-spacing:.12em;text-transform:uppercase}

/* SOBRE LA DRA */
.al-about-card{background:${p.card};border-radius:22px;padding:22px;border:1px solid ${p.line};margin:0 2px}
.al-about-hl{font-family:'Fraunces',serif;font-size:clamp(18px,5.5vw,24px);font-weight:400;line-height:1.2;letter-spacing:-.025em;color:${p.text};margin-bottom:12px}
.al-about-hl em{font-style:italic;color:${p.accent}}
.al-about-txt{font-size:13.5px;color:${p.muted};line-height:1.78;margin-bottom:18px}
.al-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:${p.line};border-radius:14px;overflow:hidden}
.al-stat{background:${p.bg};padding:14px 8px;text-align:center}
.al-stat-n{font-family:'Fraunces',serif;font-size:clamp(22px,6.5vw,28px);font-weight:400;color:${p.accent};line-height:1}
.al-stat-l{font-size:.44rem;color:${p.muted};text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-top:3px;line-height:1.4}

/* FILOSOFÍA */
.al-phi{padding:38px 22px;text-align:center;border-top:1px solid ${p.line};border-bottom:1px solid ${p.line}}
.al-phi-q{font-family:'Fraunces',serif;font-size:3rem;font-weight:300;line-height:.5;color:${p.accent};display:block;margin-bottom:16px}
.al-phi-txt{font-family:'Fraunces',serif;font-size:clamp(15px,4.8vw,20px);font-weight:300;font-style:italic;color:${p.text};line-height:1.6;max-width:300px;margin:0 auto}

/* DIFERENCIADORES */
.al-diffs{display:flex;flex-direction:column;gap:8px}
.al-diff{display:flex;align-items:flex-start;gap:11px;padding:13px 14px;background:${p.card};border-radius:12px;border:1px solid ${p.line}}
.al-diff-dot{width:6px;height:6px;border-radius:50%;background:${p.accent};flex-shrink:0;margin-top:5px}
.al-diff-txt{font-size:13px;color:${p.muted};line-height:1.6}

/* CTA SECTION */
.al-cta-wrap{margin:8px 12px 20px;background:${p.cta};border-radius:24px;padding:30px 22px;text-align:center}
.al-cta-hl{font-family:'Fraunces',serif;font-size:clamp(19px,5.5vw,25px);font-weight:400;color:${p.ctaFg};line-height:1.2;margin-bottom:8px;letter-spacing:-.02em}
.al-cta-sub{font-size:12.5px;color:${p.ctaFg};opacity:.72;line-height:1.55;margin-bottom:22px}
.al-cta-btn{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:14px;background:${p.ctaFg};color:${p.cta};font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%;margin-bottom:10px;transition:opacity .2s}
.al-cta-btn:hover{opacity:.9}
.al-cta-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:12px;background:transparent;color:${p.ctaFg};font-size:13px;font-weight:600;border:1.5px solid rgba(255,255,255,.28);cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%}

/* FOOTER */
.al-foot{padding:16px 20px 8px;text-align:center;border-top:1px solid ${p.line}}
.al-foot-txt{font-size:.58rem;color:${p.muted};letter-spacing:.03em}
.al-foot-txt a{color:${p.accent};text-decoration:none;font-weight:600}

/* BOTTOM NAV */
.al-bnav{position:fixed;bottom:0;left:0;right:0;z-index:80;background:${p.nav};backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid ${p.line};display:grid;grid-template-columns:repeat(4,1fr);padding-bottom:env(safe-area-inset-bottom,0px)}
.al-ni{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 8px;text-decoration:none;cursor:pointer;transition:opacity .15s}
.al-ni-ic{font-size:17px;line-height:1;color:${p.muted};display:flex;align-items:center;justify-content:center;width:24px;height:24px}
.al-ni-lb{font-size:.5rem;font-weight:500;color:${p.muted};letter-spacing:.02em}
.al-ni.active .al-ni-ic,.al-ni.active .al-ni-lb{color:${p.accent}}
.al-ni-book{background:${p.cta};border-radius:12px;margin:5px 6px;padding:5px 6px}
.al-ni-book .al-ni-ic,.al-ni-book .al-ni-lb{color:${p.ctaFg} !important}

/* REVEAL */
.al-r{opacity:0;transform:translateY(18px);transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)}
.al-r.on{opacity:1;transform:none}

/* ── DESKTOP ── */
@media(min-width:768px){
  .al{max-width:960px;margin:0 auto;padding-bottom:0;overflow-x:hidden}
  .al-nav{border-radius:0;padding:0 32px;height:64px}
  .al-hero{min-height:calc(100vh - 64px);padding:0 32px 48px}
  .al-hero-img img{opacity:${p.dark?'.4':'.22'}}
  .al-hero-name{font-size:clamp(40px,6vw,64px)}
  .al-hero-btns{flex-direction:row;gap:12px}
  .al-btn-p,.al-btn-o{flex:none;width:auto;padding:0 28px}
  .al-sec{padding:36px 32px}
  .al-treats{margin:0 -32px;padding-left:32px;padding-right:32px}
  .al-treat-card{flex:0 0 200px}
  .al-phi{padding:48px 32px}
  .al-cta-wrap{margin:8px 24px 28px}
  .al-bnav{max-width:960px;left:50%;transform:translateX(-50%);right:auto}
}
@media(min-width:1100px){
  .al{max-width:1100px}
  .al-bnav{max-width:1100px}
}
`;}

// ── HELPERS ───────────────────────────────────────────────
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function waUrl(m,n){
  if(!m.whatsapp_activo||!m.whatsapp)return null;
  return 'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', me gustaría agendar una consulta.');
}

var SVGS = {
  cal:'<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  wa:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>',
  home:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  star:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
  user:'<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

var DEFAULT_TREATS = [
  {ico:'✨',n:'Toxina Botulínica',d:'Suaviza líneas de expresión con resultados naturales y duraderos.',tag:'Más popular'},
  {ico:'💧',n:'Rellenos Dérmicos',d:'Restauración de volúmenes con ácido hialurónico de alta densidad.',tag:''},
  {ico:'🌟',n:'Rejuvenecimiento Facial',d:'Protocolos personalizados según tu tipo y condición de piel.',tag:''},
  {ico:'🔬',n:'Bioestimulación',d:'Regeneración celular con tecnología de última generación.',tag:''},
  {ico:'✦',n:'Peeling Químico',d:'Renovación cutánea profunda con ácidos de alta concentración.',tag:''},
  {ico:'🌿',n:'Consulta Estética',d:'Evaluación integral y plan de tratamiento personalizado.',tag:''},
];

// ── RENDER ────────────────────────────────────────────────
window.renderLayoutAestheticLuxe = function(config, doctor, locs, container) {
  var m = doctor, wc = config || {};
  var ws = config._ws || {};
  var slug = m.slug || '';
  var p = getPalette(slug);

  // Inject CSS (refresh per render to support palette)
  var old = document.getElementById('al-css');
  if (old) old.remove();
  var s = document.createElement('style'); s.id = 'al-css'; s.textContent = buildCSS(p);
  document.head.appendChild(s);

  var titulo = m.titulo || 'Dra.';
  var firstName = (m.nombre || '').split(' ')[0];
  var lastName = [m.nombre.split(' ').slice(1).join(' '), m.apellido].filter(Boolean).join(' ');
  var fullName = titulo + ' ' + m.nombre + ' ' + m.apellido;
  var esp = (m.especialidades || [])[0] || 'Medicina Estética';
  var ciudad = m.ciudad || '';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var logo = wc.logo_url || null;
  var wa = waUrl(m, fullName);
  var waHref = wa || '#';

  // Content
  var hl = wc.headline || 'Tu versión más bella, siempre auténtica.';
  var about = wc.about_text || wc.doctor_story || '';
  var phi = wc.philosophy || 'La belleza verdadera no se impone — se descubre.';
  var rawSrvs = wc.services || [];
  var diffs = wc.differentiators || [];

  // Treatments
  var treats = rawSrvs.length ? rawSrvs.slice(0, 6).map(function(s, i) {
    var icons = ['✨','💧','🌟','🔬','✦','🌿'];
    return { ico: s.icon || icons[i % icons.length], n: s.t || s.titulo || s.name || String(s), d: s.desc || s.descripcion || s.description || '', tag: i === 0 ? 'Más solicitado' : '' };
  }) : DEFAULT_TREATS;

  var treatsHTML = treats.map(function(t) {
    return '<div class="al-treat-card">'
      + '<div class="al-treat-ico">' + t.ico + '</div>'
      + '<div class="al-treat-n">' + esc(t.n) + '</div>'
      + (t.d ? '<div class="al-treat-d">' + esc(t.d) + '</div>' : '')
      + (t.tag ? '<div class="al-treat-tag">' + esc(t.tag) + '</div>' : '')
      + '</div>';
  }).join('');

  // Stats
  var statItems = [];
  if (wc.years_experience) statItems.push({ n: wc.years_experience + '+', l: 'Años exp.' });
  if (wc.patients_treated) statItems.push({ n: wc.patients_treated + '+', l: 'Pacientes' });
  if (wc.procedures_count || wc.techniques_count) statItems.push({ n: (wc.procedures_count || wc.techniques_count) + '+', l: 'Procedimientos' });
  if (!statItems.length) statItems = [{ n:'5+', l:'Años' }, { n:'500+', l:'Pacientes' }, { n:'15+', l:'Técnicas' }];
  var statsHTML = '<div class="al-stats">' + statItems.slice(0, 3).map(function(s) {
    return '<div class="al-stat"><div class="al-stat-n">' + esc(s.n) + '</div><div class="al-stat-l">' + esc(s.l) + '</div></div>';
  }).join('') + '</div>';

  // Nav brand
  var navBrand = logo
    ? '<img class="al-logo-img" src="' + esc(logo) + '" alt="' + esc(fullName) + '">'
    : '<div class="al-brand"><div class="al-brand-n">' + esc(titulo) + ' ' + esc(firstName) + '</div><div class="al-brand-e">' + esc(esp + (ciudad ? ' · ' + ciudad : '')) + '</div></div>';

  // Hero photo
  var heroPhoto = photo
    ? '<div class="al-hero-img"><img src="' + esc(photo) + '" alt="' + esc(fullName) + '"></div><div class="al-hero-grad"></div>'
    : '';

  // Differentiators
  var diffsHTML = diffs.length
    ? '<div class="al-sec al-r"><div class="al-sec-lbl">Por qué elegirnos</div><div class="al-diffs">'
      + diffs.slice(0, 5).map(function(d) {
          return '<div class="al-diff"><div class="al-diff-dot"></div><div class="al-diff-txt">' + esc(d) + '</div></div>';
        }).join('')
      + '</div></div>'
    : '';

  var html =
    '<div class="al">'

    // NAV
    + '<nav class="al-nav">' + navBrand
    + (ws.show_booking!==false?'<button class="al-nav-cta" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVGS.cal+' Agendar</button>':'')
    + '</nav>'

    // HERO
    + '<section class="al-hero">'
    + heroPhoto
    + '<div class="al-hero-body">'
    + '<div class="al-hero-pill">' + esc(esp) + '</div>'
    + '<div class="al-hero-titulo">' + esc(titulo) + '</div>'
    + '<h1 class="al-hero-name">' + esc(firstName) + (lastName ? '<br><span class="light">' + esc(lastName) + '</span>' : '') + '</h1>'
    + (ciudad ? '<div class="al-hero-city">' + esc(ciudad) + '</div>' : '')
    + '<p class="al-hero-hl">' + esc(hl) + '</p>'
    + '<div class="al-hero-btns">'
    + (ws.show_booking!==false?'<button class="al-btn-p" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVGS.cal+' Reservar</button>':'')
    + (wa&&ws.show_whatsapp!==false?'<a class="al-btn-o" data-ws="whatsapp" href="'+esc(waHref)+'" target="_blank" rel="noopener">'+SVGS.wa+' WhatsApp</a>':'')
    + '</div>'
    + '</div>'
    + '</section>'

    // TRATAMIENTOS
    + (ws.show_services!==false?'<div class="al-sec al-r" data-ws="services"><div class="al-sec-lbl">Tratamientos</div><div class="al-treats">'+treatsHTML+'</div></div>':'')

    // SOBRE
    + '<div class="al-sec al-r">'
    + '<div class="al-about-card">'
    + '<div class="al-about-hl"><em>Sobre</em> ' + esc(titulo) + ' ' + esc(firstName) + '</div>'
    + (about ? '<p class="al-about-txt">' + esc(about) + '</p>' : '')
    + statsHTML
    + '</div>'
    + '</div>'

    // FILOSOFÍA
    + (phi ? '<div class="al-phi al-r"><span class="al-phi-q">"</span><p class="al-phi-txt">' + esc(phi) + '</p></div>' : '')

    // DIFERENCIADORES
    + diffsHTML

    // CTA
    + (ws.show_cta!==false?'<div class="al-cta-wrap al-r" data-ws="cta"><div class="al-cta-hl">Tu transformación comienza hoy</div><p class="al-cta-sub">Primera consulta de evaluación personalizada. Sin compromiso.</p>'+(ws.show_booking!==false?'<button class="al-cta-btn" data-ws="booking" onclick="abrirBooking&&abrirBooking()">'+SVGS.cal+' Agendar mi consulta</button>':'')+(wa&&ws.show_whatsapp!==false?'<a class="al-cta-wa" data-ws="whatsapp" href="'+esc(waHref)+'" target="_blank" rel="noopener">'+SVGS.wa+' Escribir por WhatsApp</a>':'')+'</div>':'')

    // FOOTER
    + '<div class="al-foot"><div class="al-foot-txt">Powered by <a href="https://citadoc.lat" target="_blank" rel="noopener">CitaDoc</a></div></div>'

    // BOTTOM NAV
    + '<nav class="al-bnav">'
    + '<a class="al-ni active" href="#" onclick="window.scrollTo({top:0,behavior:\'smooth\'});return false"><div class="al-ni-ic">' + SVGS.home + '</div><span class="al-ni-lb">Inicio</span></a>'
    + '<a class="al-ni" href="#" onclick="container&&container.querySelector(\'.al-treats\')&&container.querySelector(\'.al-treats\').scrollIntoView({behavior:\'smooth\'});return false"><div class="al-ni-ic">' + SVGS.star + '</div><span class="al-ni-lb">Tratamientos</span></a>'
    + '<a class="al-ni al-ni-book" href="#" onclick="event.preventDefault();abrirBooking&&abrirBooking()"><div class="al-ni-ic">' + SVGS.cal + '</div><span class="al-ni-lb">Agendar</span></a>'
    + (wa ? '<a class="al-ni" href="' + esc(waHref) + '" target="_blank" rel="noopener"><div class="al-ni-ic">' + SVGS.wa + '</div><span class="al-ni-lb">WhatsApp</span></a>' : '<a class="al-ni" href="#"><div class="al-ni-ic">' + SVGS.user + '</div><span class="al-ni-lb">Sobre mí</span></a>')
    + '</nav>'

    + '</div>';

  container.innerHTML = html;

  // Reveal animations
  var els = container.querySelectorAll('.al-r');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(function(el) { io.observe(el); });
  } else {
    els.forEach(function(el) { el.classList.add('on'); });
  }
};

window.LAYOUT_RENDERERS = window.LAYOUT_RENDERERS || {};
window.LAYOUT_RENDERERS['aesthetic-luxe'] = window.renderLayoutAestheticLuxe;
console.log('[Layouts] aesthetic-luxe renderer registrado ✓');

})();
