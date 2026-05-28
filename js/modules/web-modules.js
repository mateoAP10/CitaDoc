/**
 * CitaDoc — WebModules
 * Fuente única de módulos. Todos los layouts comparten esta base.
 * Layout = CSS vars + composición. Módulo = HTML semántico neutral.
 *
 * API: window.WebModules.{nav|hero|about|services|testimonials|
 *                          faq|metrics|gallery|location|ctaBlock|
 *                          footer|stickyBar|initReveal|
 *                          injectBaseCSS|injectLayoutCSS}
 */
(function(){
'use strict';

// ── HELPERS ──────────────────────────────────────────────────────────────────
function e(v){return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function nom(m){return(m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido;}
function waUrl(m,n){
  if(!m.whatsapp_activo||!m.whatsapp)return null;
  return'https://wa.me/'+m.whatsapp.replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+n+', quiero agendar una consulta.');
}

var ICON = {
  cal: '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  calSm: '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  user: '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  wa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.118 1.528 5.843L.057 23.617l5.906-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>',
  loc: '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  arr: '›',
};

// ── BASE CSS (estructura — colores vienen de layouts vía CSS vars) ────────────
var BASE_CSS = `
/* ── CitaDoc Modules Base ─────────────────────────────────────── */
.cdm-wrap{
  min-height:100svh;
  background:var(--lyt-bg,#fff);
  color:var(--lyt-ink,#111);
  font-family:var(--lyt-font,'DM Sans',sans-serif);
  padding-bottom:calc(72px + env(safe-area-inset-bottom,0px));
  -webkit-font-smoothing:antialiased;
}
@media(min-width:768px){.cdm-wrap{padding-bottom:0}}

/* NAV */
.cdm-nav{
  display:flex;align-items:center;justify-content:space-between;
  padding:calc(env(safe-area-inset-top,0px) + 16px) 20px 14px;
  position:relative;z-index:20;
  background:var(--lyt-nav-bg,transparent);
}
.cdm-brand{display:flex;flex-direction:column;gap:1px}
.cdm-brand-name{font-size:.88rem;font-weight:700;line-height:1;color:var(--lyt-nav-ink,var(--lyt-ink,#111));letter-spacing:-.01em}
.cdm-brand-esp{font-size:.52rem;text-transform:uppercase;letter-spacing:.12em;font-weight:500;color:var(--lyt-nav-muted,var(--lyt-muted,#999))}
.cdm-nav-logo{height:28px;max-width:110px;object-fit:contain}
.cdm-nav-right{display:flex;align-items:center;gap:8px}
.cdm-nav-btn{
  height:36px;padding:0 16px;
  border-radius:var(--lyt-nav-btn-r,20px);
  background:var(--lyt-accent,#111);
  color:var(--lyt-accent-fg,#fff);
  border:none;font-family:inherit;font-size:.72rem;font-weight:600;cursor:pointer;
  letter-spacing:.01em;transition:opacity .2s;
}
.cdm-nav-btn:hover{opacity:.85}

/* HERO */
.cdm-hero{position:relative;overflow:hidden;background:var(--lyt-hero-bg,var(--lyt-bg,#fff))}
.cdm-hero-photo{overflow:hidden;position:relative;background:var(--lyt-surface,#f5f5f5)}
.cdm-hero-photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
.cdm-hero-body{padding:24px 20px;position:relative;z-index:2;background:var(--lyt-hero-body-bg,var(--lyt-bg,#fff))}
.cdm-hero-eyebrow{font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--lyt-muted,#999);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.cdm-hero-h1{font-family:var(--lyt-display,var(--lyt-font,'DM Sans',sans-serif));font-size:clamp(1.65rem,5.5vw,2.5rem);font-weight:var(--lyt-h1-weight,700);line-height:1.12;letter-spacing:var(--lyt-h1-tracking,-.025em);color:var(--lyt-hero-ink,var(--lyt-ink,#111));margin-bottom:10px}
.cdm-hero-sub{font-size:13.5px;line-height:1.75;color:var(--lyt-hero-sub,var(--lyt-ink2,#555));margin-bottom:20px;max-width:480px}
.cdm-hero-ctas{display:flex;flex-direction:column;gap:8px}
.cdm-btn-book{display:flex;align-items:center;justify-content:center;gap:7px;height:52px;padding:0 24px;border-radius:var(--lyt-radius,12px);background:var(--lyt-accent,#111);color:var(--lyt-accent-fg,#fff);border:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s;width:100%;letter-spacing:.01em}
.cdm-btn-book:hover{opacity:.85}
.cdm-btn-wa{display:flex;align-items:center;justify-content:center;gap:7px;height:50px;padding:0 22px;border-radius:var(--lyt-radius,12px);background:var(--lyt-btn-wa-bg,transparent);border:var(--lyt-btn-wa-border,1.5px solid var(--lyt-border,#e5e5e5));color:var(--lyt-btn-wa-ink,var(--lyt-ink,#111));font-family:inherit;font-size:13.5px;font-weight:500;cursor:pointer;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .2s;width:100%}

/* ── Hero: fullscreen variant ── */
.cdm-hero--fullscreen .cdm-hero-photo{position:absolute;inset:0;height:100%}
.cdm-hero--fullscreen{min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end}
.cdm-hero--fullscreen .cdm-hero-photo img{position:absolute;inset:0;height:100%;filter:var(--lyt-hero-filter,none)}
.cdm-hero--fullscreen::after{content:'';position:absolute;inset:0;background:var(--lyt-hero-overlay,linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.25) 60%,transparent 100%));z-index:1;pointer-events:none}
.cdm-hero--fullscreen .cdm-hero-body{background:transparent;z-index:2}
.cdm-hero--fullscreen .cdm-hero-eyebrow{color:rgba(255,255,255,.55)}
.cdm-hero--fullscreen .cdm-hero-h1{color:#fff}
.cdm-hero--fullscreen .cdm-hero-sub{color:rgba(255,255,255,.65)}
.cdm-hero--fullscreen .cdm-btn-book{background:#fff;color:var(--lyt-accent,#111)}
.cdm-hero--fullscreen .cdm-btn-wa{border-color:rgba(255,255,255,.35);color:#fff}

/* ── Hero: stacked (mobile) — photo as card ── */
.cdm-hero-photo--card{aspect-ratio:16/9;margin:0;border-radius:0;overflow:hidden}
.cdm-hero-photo--wide{aspect-ratio:16/9;border-radius:0;margin:0}
.cdm-hero-photo--tall{aspect-ratio:3/4;margin:8px 16px 0;border-radius:var(--lyt-hero-photo-r,14px);overflow:hidden}

/* SECTION BASE */
.cdm-section{padding:28px 20px;background:var(--lyt-section-bg,var(--lyt-bg,#fff))}
.cdm-section+.cdm-section,.cdm-section+footer{border-top:1px solid var(--lyt-border,#e5e5e5)}
.cdm-sec-label{font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--lyt-label,var(--lyt-muted,#999));margin-bottom:14px;display:flex;align-items:center;gap:8px}
.cdm-sec-title{font-family:var(--lyt-display,inherit);font-size:clamp(1.3rem,4vw,1.8rem);font-weight:600;line-height:1.15;letter-spacing:-.02em;color:var(--lyt-ink,#111);margin-bottom:10px}

/* DESKTOP HERO HEADER (visible en layouts split-sticky) */
.cdm-hero-dtop{display:none;padding-bottom:6px}
.cdm-dtop-name{font-family:var(--lyt-display,inherit);font-size:clamp(1.2rem,2.2vw,1.6rem);font-weight:600;color:var(--lyt-ink,#111);margin-bottom:2px}
.cdm-dtop-esp{font-size:.58rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--lyt-muted,#999);margin-bottom:16px}

/* ABOUT */
.cdm-about-text{font-size:14px;line-height:1.8;color:var(--lyt-ink2,#555)}
.cdm-diffs{display:flex;flex-direction:column;gap:7px;margin-top:16px}
.cdm-diff-item{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--lyt-ink2,#555);line-height:1.5}
.cdm-diff-dot{color:var(--lyt-accent,#111);flex-shrink:0;margin-top:.15rem;font-size:.75rem}

/* SERVICES */
.cdm-svc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
.cdm-svc-card{padding:14px 12px;border-radius:var(--lyt-radius,12px);background:var(--lyt-surface,#f9f9f9);border:1px solid var(--lyt-border,#e5e5e5)}
.cdm-svc-icon{font-size:1.25rem;margin-bottom:6px}
.cdm-svc-name{font-size:13px;font-weight:600;color:var(--lyt-ink,#111);line-height:1.3}
.cdm-svc-desc{font-size:.7rem;color:var(--lyt-muted,#999);line-height:1.5;margin-top:3px}
.cdm-svc-list{display:flex;flex-direction:column;margin-top:4px}
.cdm-svc-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--lyt-border,#e5e5e5)}
.cdm-svc-row:last-child{border-bottom:none}
.cdm-svc-row-name{font-size:13.5px;font-weight:500;color:var(--lyt-ink,#111)}
.cdm-svc-row-arr{color:var(--lyt-muted,#ccc)}

/* TESTIMONIALS */
.cdm-testis{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.cdm-testi-card{padding:16px;border-radius:var(--lyt-radius,12px);background:var(--lyt-surface,#f9f9f9);border:1px solid var(--lyt-border,#e5e5e5)}
.cdm-testi-quote{font-size:13.5px;line-height:1.65;color:var(--lyt-ink2,#555);font-style:italic;margin-bottom:10px}
.cdm-testi-author{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--lyt-muted,#999)}

/* FAQ */
.cdm-faq-list{display:flex;flex-direction:column;gap:3px;margin-top:4px}
.cdm-faq-item{border-radius:var(--lyt-radius,12px);overflow:hidden;background:var(--lyt-surface,#f9f9f9)}
.cdm-faq-item summary{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;list-style:none;font-size:13.5px;font-weight:600;color:var(--lyt-ink,#111);gap:8px}
.cdm-faq-item summary::-webkit-details-marker{display:none}
.cdm-faq-arr{color:var(--lyt-muted,#ccc);font-size:16px;flex-shrink:0;transition:transform .25s;line-height:1}
details[open] .cdm-faq-arr{transform:rotate(90deg)}
.cdm-faq-body{padding:0 16px 14px;font-size:13px;line-height:1.7;color:var(--lyt-ink2,#555);border-top:1px solid var(--lyt-border,#e5e5e5)}

/* METRICS */
.cdm-metrics-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:4px;text-align:center}
.cdm-metric-num{font-family:var(--lyt-display,inherit);font-size:clamp(1.5rem,5vw,2.2rem);font-weight:700;color:var(--lyt-accent,#111);line-height:1}
.cdm-metric-label{font-size:.55rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--lyt-muted,#999);margin-top:4px}

/* GALLERY */
.cdm-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:4px}
.cdm-gallery-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px}
.cdm-ig-card{display:flex;flex-direction:column;gap:.3rem;padding:1rem 1.25rem;background:var(--lyt-surface,rgba(0,0,0,.04));border-radius:14px;text-decoration:none;transition:opacity .15s}
.cdm-ig-card:hover{opacity:.8}
.cdm-ig-handle{font-size:1.1rem;font-weight:700;color:var(--lyt-ink,#111)}
.cdm-ig-cta{font-size:.78rem;color:var(--lyt-accent,#111);font-weight:600}
.cdm-ins-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;margin-top:.5rem}
@media(min-width:640px){.cdm-ins-grid{grid-template-columns:repeat(3,1fr)}}
.cdm-ins-item{padding:.55rem .85rem;background:var(--lyt-surface,rgba(0,0,0,.04));border-radius:8px;font-size:.82rem;font-weight:500;color:var(--lyt-ink,#111);text-align:center}
.cdm-calc-list{display:flex;flex-direction:column;gap:.4rem;margin-top:.6rem}
.cdm-calc-row{display:flex;align-items:center;gap:.75rem;padding:.75rem .9rem;background:var(--lyt-surface,rgba(0,0,0,.04));border-radius:10px;border:1.5px solid transparent;cursor:pointer;transition:all .14s;user-select:none}
.cdm-calc-row:hover{border-color:var(--lyt-accent,#0b7c6e);background:var(--lyt-surface,rgba(0,0,0,.06))}
.cdm-row-sel{border-color:var(--lyt-accent,#0b7c6e)!important;background:var(--lyt-accent,#0b7c6e)!important}
.cdm-row-sel .cdm-calc-name,.cdm-row-sel .cdm-calc-price{color:#fff!important}
.cdm-calc-chk{width:16px;height:16px;accent-color:var(--lyt-accent,#0b7c6e);flex-shrink:0;cursor:pointer}
.cdm-calc-name{flex:1;font-size:.88rem;font-weight:500;color:var(--lyt-ink,#111)}
.cdm-calc-price{font-size:.85rem;font-weight:700;color:var(--lyt-accent,#0b7c6e);flex-shrink:0}
.cdm-calc-total{display:flex;gap:1rem;margin-top:.85rem;padding:1rem 1.1rem;background:var(--lyt-accent,#0b7c6e);border-radius:14px;flex-direction:column}
.cdm-calc-total-lbl{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.55);margin-bottom:.2rem}
.cdm-calc-sum{font-size:2rem;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1}
.cdm-calc-lines{display:flex;flex-direction:column;gap:.2rem;padding-top:.6rem;border-top:1px solid rgba(255,255,255,.15);margin-top:.5rem}
.cdm-calc-line{display:flex;justify-content:space-between;font-size:.78rem;color:rgba(255,255,255,.8)}
.cdm-calc-line-price{font-weight:600;color:#fff}
.cdm-calc-book{display:block;margin-top:.75rem;padding:.95rem 1rem;background:var(--lyt-accent,#0b7c6e);color:#fff;border-radius:14px;text-align:center;font-size:.9rem;font-weight:700;text-decoration:none;transition:opacity .15s}
.cdm-calc-book:hover{opacity:.88}

/* LOCATION */
.cdm-loc-list{display:flex;flex-direction:column;gap:14px;margin-top:4px}
.cdm-loc-name{font-size:.88rem;font-weight:700;color:var(--lyt-ink,#111);margin-bottom:2px}
.cdm-loc-addr{font-size:.75rem;color:var(--lyt-ink2,#555);line-height:1.55}
.cdm-loc-link{font-size:.68rem;font-weight:600;color:var(--lyt-accent,#111);text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-top:5px;opacity:.8}
.cdm-loc-link:hover{opacity:1}

/* CTA BLOCK */
.cdm-cta-block{padding:36px 20px;text-align:center;background:var(--lyt-cta-bg,var(--lyt-accent,#111))}
.cdm-cta-title{font-family:var(--lyt-display,inherit);font-size:clamp(1.3rem,4.5vw,2rem);font-weight:var(--lyt-h1-weight,700);line-height:1.15;letter-spacing:-.02em;color:var(--lyt-cta-ink,#fff);margin-bottom:8px}
.cdm-cta-sub{font-size:13.5px;color:rgba(255,255,255,.6);line-height:1.65;margin-bottom:22px}
.cdm-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 28px;border-radius:var(--lyt-radius,12px);background:var(--lyt-cta-btn-bg,#fff);color:var(--lyt-cta-btn-ink,var(--lyt-accent,#111));border:none;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s;letter-spacing:.01em}
.cdm-cta-btn:hover{opacity:.88}

/* FOOTER */
.cdm-footer{padding:22px 20px 28px;border-top:1px solid var(--lyt-border,#e5e5e5);text-align:center;background:var(--lyt-bg,#fff)}
.cdm-footer-txt{font-size:.58rem;color:var(--lyt-muted,#aaa);letter-spacing:.02em}
.cdm-footer-txt a{color:var(--lyt-ink2,#777);text-decoration:none;font-weight:600}
.cdm-powered{margin-top:14px}
.cdm-powered-link{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .75rem;border-radius:50px;background:rgba(11,124,110,.07);border:1px solid rgba(11,124,110,.15);color:rgba(11,124,110,.7);font-size:.68rem;font-weight:700;letter-spacing:.02em;text-decoration:none;transition:all .2s}
.cdm-powered-link:hover{background:rgba(11,124,110,.13);color:#0b7c6e;border-color:rgba(11,124,110,.3)}
.cdm-powered-link strong{font-weight:800}

/* REVEAL ANIMATION */
.rv{opacity:0;transform:translateY(22px);transition:opacity .72s cubic-bezier(.16,1,.3,1),transform .72s cubic-bezier(.16,1,.3,1)}
.rv.in{opacity:1;transform:none}
.d1{transition-delay:.07s}.d2{transition-delay:.14s}.d3{transition-delay:.21s}.d4{transition-delay:.28s}

/* ── STICKY BAR — premium mobile ───────────────────────────────── */
.cdm-sticky{
  position:fixed;bottom:0;left:0;right:0;z-index:200;
  display:flex;align-items:stretch;
  background:rgba(255,255,255,.9);
  backdrop-filter:blur(28px) saturate(180%);
  -webkit-backdrop-filter:blur(28px) saturate(180%);
  border-top:1px solid rgba(0,0,0,.06);
  padding:8px 12px calc(env(safe-area-inset-bottom,0px)+6px);
  gap:6px;
  box-shadow:0 -6px 32px rgba(0,0,0,.06),0 -1px 0 rgba(0,0,0,.03);
}
.cdm-sticky-item{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;cursor:pointer;text-decoration:none;border:none;background:none;
  font-family:inherit;padding:4px 0;border-radius:10px;
  transition:background .15s,transform .1s;
  -webkit-tap-highlight-color:transparent;
}
.cdm-sticky-item:active{background:rgba(0,0,0,.05);transform:scale(.97)}
.cdm-sticky-ico{display:flex;align-items:center;justify-content:center;color:#9CA3AF;transition:color .15s}
.cdm-sticky-lbl{font-size:9.5px;font-weight:600;color:#9CA3AF;letter-spacing:.02em;transition:color .15s}
/* Primary CTA */
.cdm-sticky-primary{flex:1.3}
.cdm-sticky-primary .cdm-sticky-ico{
  width:46px;height:36px;
  border-radius:12px;
  background:var(--sticky-accent,#111);
  color:#fff;
  box-shadow:0 2px 12px rgba(0,0,0,.18);
  transition:opacity .15s;
}
.cdm-sticky-primary:active .cdm-sticky-ico{opacity:.85}
.cdm-sticky-primary .cdm-sticky-lbl{color:var(--sticky-accent,#111);font-weight:700}
@media(min-width:768px){.cdm-sticky{display:none}}

/* ── DESKTOP BASE ──────────────────────────────────────────────── */
@media(min-width:768px){
  .cdm-wrap{padding-bottom:0}
  .cdm-nav{padding:0 5%;height:68px;background:var(--lyt-nav-bg,var(--lyt-bg,#fff));border-bottom:1px solid var(--lyt-border,#e5e5e5);position:sticky;top:0;z-index:100}
  .cdm-hero-ctas{flex-direction:row}
  .cdm-btn-book,.cdm-btn-wa{width:auto}
  .cdm-section{padding:48px 5%}
  .cdm-hero-body{padding:32px 5%}
  .cdm-svc-grid{grid-template-columns:repeat(3,1fr)}
  .cdm-metrics-grid{grid-template-columns:repeat(4,1fr)}
  .cdm-cta-block{padding:56px 5%}
  .cdm-footer{padding:28px 5%}
  .cdm-hero-photo--card,.cdm-hero-photo--tall{margin:0;border-radius:0;aspect-ratio:unset}
}
@media(min-width:1100px){
  .cdm-section,.cdm-hero-body{padding-left:7%;padding-right:7%}
  .cdm-nav{padding-left:7%;padding-right:7%}
  .cdm-cta-block,.cdm-footer{padding-left:7%;padding-right:7%}
}
`;

function injectBaseCSS(){
  if(document.getElementById('_cdm-base'))return;
  var s=document.createElement('style');s.id='_cdm-base';s.textContent=BASE_CSS;
  document.head.appendChild(s);
}

function injectLayoutCSS(css,id){
  if(document.getElementById(id))return;
  var s=document.createElement('style');s.id=id;s.textContent=css;
  document.head.appendChild(s);
}

// ── MÓDULOS ──────────────────────────────────────────────────────────────────

// NAV
function navModule(config,doctor,ws){
  var nm=nom(doctor);
  var esp=(doctor.especialidades||[])[0]||'';
  var logo=config.logo_url;
  var brand=logo
    ?'<img class="cdm-nav-logo" src="'+e(logo)+'" alt="'+e(nm)+'">'
    :'<div class="cdm-brand"><span class="cdm-brand-name">'+e(nm)+'</span><span class="cdm-brand-esp">'+e(esp)+'</span></div>';
  var extra=ws._nav_extra||'';
  return'<nav class="cdm-nav">'+brand+'<div class="cdm-nav-right">'+extra+'<button class="cdm-nav-btn" onclick="abrirBooking&&abrirBooking()">Agendar</button></div></nav>';
}

// HERO
function heroModule(config,doctor,ws){
  var nm=nom(doctor);
  var esp=(doctor.especialidades||[])[0]||'';
  var ciudad=doctor.ciudad||'';
  var photo=config.doctor_photo_url||doctor.foto_url||'';
  var hl=config.headline||'Tu salud, en las mejores manos.';
  var sub=config.subheadline||'Atención médica de excelencia, con trato humano.';
  var wa=waUrl(doctor,nm);
  var variant=ws.hero_layout||'stacked';
  var photoClass=ws._hero_photo_class||config.hero_photo_class||'cdm-hero-photo--card';

  var ctasHTML=(ws.show_booking!==false
    ?'<button class="cdm-btn-book" onclick="abrirBooking&&abrirBooking()">'+ICON.calSm+' Agendar consulta</button>':'')
    +(wa&&ws.show_whatsapp!==false?'<a class="cdm-btn-wa" href="'+e(wa)+'" target="_blank" rel="noopener">'+ICON.wa+' WhatsApp</a>':'');

  var photoPos=config.photo_position||'center 20%';
  var photoHTML=photo?'<div class="cdm-hero-photo '+photoClass+'"><img src="'+e(photo)+'" alt="'+e(nm)+'" loading="eager" style="object-position:'+photoPos+'"></div>':'';
  var eyebrow=e(esp+(ciudad?' · '+ciudad:''));

  var bodyHTML='<div class="cdm-hero-body">'
    +'<div class="cdm-hero-eyebrow rv">'+eyebrow+'</div>'
    +'<h1 class="cdm-hero-h1 rv d1">'+e(hl)+'</h1>'
    +'<p class="cdm-hero-sub rv d2">'+e(sub)+'</p>'
    +(ctasHTML?'<div class="cdm-hero-ctas rv d3">'+ctasHTML+'</div>':'')
    +'</div>';

  if(variant==='fullscreen'){
    return'<section class="cdm-hero cdm-hero--fullscreen" id="inicio">'
      +photoHTML
      +bodyHTML
      +'</section>';
  }
  // stacked (default) + split — same HTML, positioned differently by layout CSS
  return'<section class="cdm-hero" id="inicio">'
    +photoHTML
    +bodyHTML
    +'</section>';
}

// ABOUT
function aboutModule(config,doctor,ws){
  if(ws.show_about===false)return'';
  var nm=nom(doctor);
  var esp=(doctor.especialidades||[])[0]||'';
  var bio=config.about_text||config.doctor_story||'';
  var diffs=config.differentiators||[];
  var text=bio||diffs.join('. ')||'Médico comprometido con la salud y el bienestar de cada paciente, con atención personalizada.';
  var diffsHTML=diffs.length&&bio
    ?'<div class="cdm-diffs">'+diffs.slice(0,4).map(function(d){return'<div class="cdm-diff-item"><span class="cdm-diff-dot">✦</span>'+e(d)+'</div>';}).join('')+'</div>':'';

  // cdm-hero-dtop: visible solo en layouts split (surgical/neoclinic) vía layout CSS
  var dtopHTML='<div class="cdm-hero-dtop">'
    +'<div class="cdm-dtop-name">'+e(nm)+'</div>'
    +'<div class="cdm-dtop-esp">'+e(esp)+'</div>'
    +'</div>';

  return'<section class="cdm-section" id="sobre-mi">'
    +dtopHTML
    +'<div class="cdm-sec-label rv">Sobre mí</div>'
    +'<p class="cdm-about-text rv d1">'+e(text)+'</p>'
    +diffsHTML
    +'</section>';
}

// SERVICES
function servicesModule(config,ws){
  if(ws.show_services===false)return'';
  var srvs=config.services||config.servicios||[];
  if(!srvs.length)return'';
  var layout=ws.services_layout||'grid';
  var items=srvs.slice(0,8).map(function(s){
    var icon=s.i||s.icon||'✦';
    var title=e(s.t||s.titulo||s.name||String(s));
    var desc=s.d||s.desc||s.description||'';
    if(layout==='list')return'<div class="cdm-svc-row"><span class="cdm-svc-row-name">'+title+'</span><span class="cdm-svc-row-arr">'+ICON.arr+'</span></div>';
    return'<div class="cdm-svc-card rv">'
      +'<div class="cdm-svc-icon">'+e(icon)+'</div>'
      +'<div class="cdm-svc-name">'+title+'</div>'
      +(desc?'<div class="cdm-svc-desc">'+e(desc)+'</div>':'')
      +'</div>';
  }).join('');
  return'<section class="cdm-section" id="servicios">'
    +'<div class="cdm-sec-label rv">Servicios</div>'
    +'<div class="cdm-svc-'+(layout==='list'?'list':'grid')+'">'+items+'</div>'
    +'</section>';
}

// TESTIMONIALS
function testimonialsModule(config,ws){
  if(ws.show_testimonials===false)return'';
  var testis=config.testimonials||[];
  if(!testis.length)return'';
  var items=testis.slice(0,4).map(function(t){
    var txt=t.texto||t.text||String(t);
    var aut=t.autor||t.name||'Paciente';
    return'<div class="cdm-testi-card rv">'
      +'<p class="cdm-testi-quote">"'+e(txt)+'"</p>'
      +'<div class="cdm-testi-author">— '+e(aut)+'</div>'
      +'</div>';
  }).join('');
  return'<section class="cdm-section" id="testimonios">'
    +'<div class="cdm-sec-label rv">Testimonios</div>'
    +'<div class="cdm-testis">'+items+'</div>'
    +'</section>';
}

// FAQ
function faqModule(config,ws){
  if(ws.show_faq===false)return'';
  var faqs=config.faq||[];
  if(!faqs.length)return'';
  var items=faqs.slice(0,6).map(function(f){
    return'<details class="cdm-faq-item">'
      +'<summary>'+e(f.q||f.pregunta||'')+'<span class="cdm-faq-arr">'+ICON.arr+'</span></summary>'
      +'<div class="cdm-faq-body">'+e(f.a||f.respuesta||'')+'</div>'
      +'</details>';
  }).join('');
  return'<section class="cdm-section" id="faq">'
    +'<div class="cdm-sec-label rv">Preguntas frecuentes</div>'
    +'<div class="cdm-faq-list">'+items+'</div>'
    +'</section>';
}

// METRICS
function metricsModule(config,doctor,ws){
  if(ws.show_metrics===false)return'';
  var metrics=config.metrics||[];
  if(!metrics.length&&doctor.anios_experiencia){
    metrics=[{num:doctor.anios_experiencia,label:'Años de experiencia'}];
    if(doctor.num_pacientes)metrics.push({num:doctor.num_pacientes,label:'Pacientes atendidos'});
  }
  if(!metrics.length)return'';
  var items=metrics.slice(0,4).map(function(m){
    return'<div class="rv"><div class="cdm-metric-num">'+e(m.num||m.value||m.numero||'')+'</div>'
      +'<div class="cdm-metric-label">'+e(m.label||m.etiqueta||'')+'</div></div>';
  }).join('');
  return'<section class="cdm-section" id="metricas">'
    +'<div class="cdm-metrics-grid">'+items+'</div>'
    +'</section>';
}

// GALLERY
function galleryModule(config,ws){
  if(ws.show_carousel===false)return'';
  var imgs=config.gallery||[];
  if(!imgs.length)return'';
  return'<section class="cdm-section" id="galeria">'
    +'<div class="cdm-sec-label rv">Galería</div>'
    +'<div class="cdm-gallery-grid">'
    +imgs.slice(0,6).map(function(u){return'<img src="'+e(u)+'" alt="" loading="lazy">';}).join('')
    +'</div></section>';
}

// LOCATION — config-driven with locs fallback
function locationModule(config,doctor,locs,ws){
  if(ws.show_map===false)return'';
  var items=locs&&locs.length?locs
    :(config.location_address||config.location_name)?[{
        nombre:config.location_name||'Consultorio',
        direccion:config.location_address||'',
        ciudad:config.location_city||config.city||'',
        maps_url:config.maps_url||config.location_maps_url||''
      }]:[];
  if(!items.length)return'<section class="cdm-section" id="contacto" data-ws="map">'
    +'<div class="cdm-sec-label">Consultorio</div>'
    +'<div style="font-size:.82rem;color:var(--lyt-ink2,#888);padding:.5rem 0">Agrega la dirección en el editor para mostrar tu consultorio.</div>'
    +'</section>';
  return'<section class="cdm-section" id="contacto" data-ws="map">'
    +'<div class="cdm-sec-label rv">Consultorio</div>'
    +'<div class="cdm-loc-list">'
    +items.map(function(l){
      return'<div class="rv">'
        +'<div class="cdm-loc-name">'+e(l.nombre||'Consultorio')+'</div>'
        +'<div class="cdm-loc-addr">'+e((l.direccion||'')+(l.ciudad?', '+l.ciudad:''))+'</div>'
        +(l.maps_url?'<a class="cdm-loc-link" href="'+e(l.maps_url)+'" target="_blank" rel="noopener">'+ICON.loc+' Ver en mapa</a>':'')
        +'</div>';
    }).join('')
    +'</div></section>';
}

// INSTAGRAM
function instagramModule(config,ws){
  if(ws.show_instagram===false)return'';
  var handle=(config.instagram_handle||config.instagram||'').replace(/^@/,'');
  if(!handle)return'<section class="cdm-section" id="instagram" data-ws="instagram">'
    +'<div class="cdm-sec-label">Instagram</div>'
    +'<div style="font-size:.82rem;color:var(--lyt-ink2,#888);padding:.5rem 0">Agrega tu @handle en el editor para activar tu Instagram.</div>'
    +'</section>';
  return'<section class="cdm-section" id="instagram" data-ws="instagram">'
    +'<div class="cdm-sec-label rv">Instagram</div>'
    +'<a class="cdm-ig-card rv" href="https://instagram.com/'+e(handle)+'" target="_blank" rel="noopener">'
    +'<div class="cdm-ig-handle">@'+e(handle)+'</div>'
    +'<div class="cdm-ig-cta">Ver perfil en Instagram →</div>'
    +'</a></section>';
}

// INSURANCE
function insuranceModule(config,ws){
  if(ws.show_insurance===false)return'';
  var ins=Array.isArray(config.insurances)?config.insurances
    :(typeof config.insurances==='string'?config.insurances.split('\n').map(function(s){return s.trim();}).filter(Boolean):[]);
  if(!ins.length)return'<section class="cdm-section" id="seguros" data-ws="insurance">'
    +'<div class="cdm-sec-label">Seguros aceptados</div>'
    +'<div style="font-size:.82rem;color:var(--lyt-ink2,#888);padding:.5rem 0">Agrega los seguros en el editor para mostrarlos aquí.</div>'
    +'</section>';
  return'<section class="cdm-section" id="seguros" data-ws="insurance">'
    +'<div class="cdm-sec-label rv">Seguros aceptados</div>'
    +'<div class="cdm-ins-grid">'
    +ins.map(function(i){return'<div class="cdm-ins-item rv">'+e(i)+'</div>';}).join('')
    +'</div></section>';
}

// CALCULATOR — estimador interactivo igual que doctor-center
function calculatorModule(config,doctor,ws){
  if(ws.show_calculator===false)return'';
  var svcs=(config.services||config.servicios||[]).filter(function(s){return s.t||s.title;});
  if(!svcs.length)return'';
  var currency=config.currency||'$';
  var hasPrice=svcs.some(function(s){return parseFloat(s.price||s.p||0)>0;});
  var nm=nom(doctor);
  var waBase=doctor.whatsapp?'https://wa.me/'+doctor.whatsapp.replace(/\D/g,''):null;
  // Init calculator state on this page once
  if(!window._cdmCalc){
    window._cdmCalc={selected:[]};
    window.cdmToggle=function(id,nombre,precio){
      var arr=window._cdmCalc.selected;
      var idx=arr.findIndex(function(x){return x.id===id;});
      if(idx>=0)arr.splice(idx,1);else arr.push({id:id,nombre:nombre,precio:precio});
      var total=arr.reduce(function(a,s){return a+s.precio;},0);
      var totEl=document.getElementById('cdm-calc-total');
      var sumEl=document.getElementById('cdm-calc-sum');
      var linesEl=document.getElementById('cdm-calc-lines');
      var bookEl=document.getElementById('cdm-calc-book');
      if(totEl)totEl.style.display=arr.length?'flex':'none';
      if(sumEl)sumEl.textContent=currency+total.toFixed(0);
      if(linesEl)linesEl.innerHTML=arr.map(function(s){
        return'<div class="cdm-calc-line"><span>'+e(s.nombre)+'</span><span class="cdm-calc-line-price">'+currency+s.precio.toFixed(0)+'</span></div>';
      }).join('');
      if(bookEl){
        bookEl.style.display=arr.length?'block':'none';
        if(waBase){
          var msg='Hola '+nm+', me interesa agendar:\n'+arr.map(function(s){return'• '+s.nombre+(s.precio?' ('+currency+s.precio+')':'');}).join('\n')+'\nTotal estimado: '+currency+total.toFixed(0);
          bookEl.href=waBase+'?text='+encodeURIComponent(msg);
        }
      }
      // sync checkbox visual
      document.querySelectorAll('.cdm-calc-chk').forEach(function(c){
        var inSel=arr.some(function(x){return x.id===c.dataset.id;});
        c.checked=inSel;
        var row=c.closest('.cdm-calc-row');
        if(row)row.classList.toggle('cdm-row-sel',inSel);
      });
    };
  }else{
    // Re-render: reset state for this doctor's services
    window._cdmCalc.selected=[];
  }
  var rows=svcs.map(function(s,i){
    var sid='svc-'+i;
    var price=parseFloat(s.price||s.p||0);
    var title=e(s.t||s.title||'');
    return'<div class="cdm-calc-row" onclick="cdmToggle(\''+sid+'\',\''+e(s.t||s.title||'')+'\','+price+')">'
      +(hasPrice?'<input type="checkbox" class="cdm-calc-chk" data-id="'+sid+'" onclick="event.stopPropagation();cdmToggle(\''+sid+'\',\''+e(s.t||s.title||'')+'\','+price+')" >':'')
      +'<span class="cdm-calc-name">'+title+'</span>'
      +(price?'<span class="cdm-calc-price">'+currency+price.toFixed(0)+'</span>':'')
      +'</div>';
  }).join('');
  var ctaAttrs=waBase?'href="'+e(waBase)+'" target="_blank" rel="noopener"':'onclick="abrirBooking&&abrirBooking()"';
  return'<section class="cdm-section" id="calculadora" data-ws="calculator">'
    +'<div class="cdm-sec-label rv">'+(hasPrice?'Estimador de precios':'Servicios disponibles')+'</div>'
    +'<div class="cdm-calc-list">'+rows+'</div>'
    +(hasPrice
      ?'<div class="cdm-calc-total" id="cdm-calc-total" style="display:none">'
        +'<div>'
          +'<div class="cdm-calc-total-lbl">Total estimado</div>'
          +'<div class="cdm-calc-sum" id="cdm-calc-sum">'+currency+'0</div>'
        +'</div>'
        +'<div id="cdm-calc-lines" class="cdm-calc-lines"></div>'
        +'</div>'
      :'')
    +'<a id="cdm-calc-book" class="cdm-calc-book" '+ctaAttrs+' style="display:none">Agendar ahora →</a>'
    +'</section>';
}

// CTA BLOCK
function ctaBlockModule(config,doctor,ws){
  if(ws.show_cta===false)return'';
  var nm=nom(doctor);
  var title=config.cta_final||'¿Listo para tu consulta?';
  var sub=config.cta_sub||'Agenda en minutos, sin filas, sin esperas.';
  return'<section class="cdm-cta-block">'
    +'<h2 class="cdm-cta-title rv">'+e(title)+'</h2>'
    +'<p class="cdm-cta-sub rv d1">'+e(sub)+'</p>'
    +(ws.show_booking!==false?'<button class="cdm-cta-btn rv d2" onclick="abrirBooking&&abrirBooking()">'+ICON.calSm+' Agendar ahora</button>':'')
    +'</section>';
}

// FOOTER
function footerModule(config,doctor,ws){
  return'<footer class="cdm-footer">'
    +'<div class="cdm-powered"><a href="https://citadoc.lat" target="_blank" rel="noopener" class="cdm-powered-link">'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
    +'<span>Powered by <strong>CitaDoc AI</strong></span>'
    +'</a></div>'
    +'</footer>';
}

// STICKY BAR — premium, universal
function stickyBarModule(config,doctor,ws,container){
  var nm=nom(doctor);
  var wa=waUrl(doctor,nm);
  var items=[];

  if(ws.show_booking!==false){
    items.push('<button class="cdm-sticky-item cdm-sticky-primary" onclick="abrirBooking&&abrirBooking()">'
      +'<div class="cdm-sticky-ico">'+ICON.cal+'</div>'
      +'<span class="cdm-sticky-lbl">Agendar</span>'
      +'</button>');
  }
  if(ws.show_about!==false){
    items.push('<a class="cdm-sticky-item" href="#sobre-mi">'
      +'<div class="cdm-sticky-ico">'+ICON.user+'</div>'
      +'<span class="cdm-sticky-lbl">Sobre mí</span>'
      +'</a>');
  }
  if(wa&&ws.show_whatsapp!==false){
    items.push('<a class="cdm-sticky-item" href="'+e(wa)+'" target="_blank" rel="noopener">'
      +'<div class="cdm-sticky-ico">'+ICON.wa+'</div>'
      +'<span class="cdm-sticky-lbl">WhatsApp</span>'
      +'</a>');
  }

  if(!items.length)return;
  var bar=document.createElement('div');
  bar.className='cdm-sticky';
  bar.innerHTML=items.join('');
  document.body.appendChild(bar);
}

// REVEAL — IntersectionObserver para animaciones
function initReveal(container){
  var els=container.querySelectorAll('.rv');
  if(!els.length)return;
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      els.forEach(function(el){el.classList.add('in');});
    });
  });
  if(typeof IntersectionObserver==='undefined')return;
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){entry.target.classList.add('in');obs.unobserve(entry.target);}
    });
  },{threshold:.06,rootMargin:'0px 0px -40px 0px'});
  els.forEach(function(el){el.classList.remove('in');obs.observe(el);});
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────
window.WebModules={
  injectBaseCSS:  injectBaseCSS,
  injectLayoutCSS:injectLayoutCSS,
  nav:            navModule,
  hero:           heroModule,
  about:          aboutModule,
  services:       servicesModule,
  testimonials:   testimonialsModule,
  faq:            faqModule,
  metrics:        metricsModule,
  gallery:        galleryModule,
  location:       locationModule,
  calculator:     calculatorModule,
  instagram:      instagramModule,
  insurance:      insuranceModule,
  ctaBlock:       ctaBlockModule,
  footer:         footerModule,
  stickyBar:      stickyBarModule,
  initReveal:     initReveal,
};

console.log('[WebModules] ✓ nav|hero|about|services|testimonials|faq|metrics|gallery|location|ctaBlock|footer|stickyBar');

})();
