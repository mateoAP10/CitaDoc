/**
 * CitaDoc — Layout: Performance Athletic
 * Dinámico, deportivo, bold. Hero wide con foto de impacto, métricas prominentes.
 * DNA: 'performance-athletic'
 */
(function(){

var CSS = `
.lyt-athletic{
  --lyt-bg:#F8FAFC;--lyt-surface:#EEF2F7;--lyt-ink:#0F172A;--lyt-ink2:#334155;
  --lyt-muted:#94A3B8;--lyt-border:#E2E8F0;--lyt-accent:#0F172A;--lyt-accent-fg:#fff;
  --lyt-display:'DM Sans',sans-serif;--lyt-h1-weight:800;--lyt-h1-tracking:-.03em;
  --lyt-radius:8px;--lyt-nav-bg:#F8FAFC;--lyt-section-bg:#F8FAFC;
  --lyt-cta-bg:#0F172A;--lyt-label:#94A3B8;--sticky-accent:#0F172A;
  --lyt-hero-body-bg:#F8FAFC;
}
.lyt-athletic .cdm-hero-eyebrow{font-size:.58rem;font-weight:800;letter-spacing:.18em}
.lyt-athletic .cdm-hero-photo img{filter:contrast(1.06) brightness(.96)}
.lyt-athletic .cdm-hero-photo--wide{aspect-ratio:16/6}
.lyt-athletic .cdm-metric-num{font-weight:900;font-size:clamp(1.8rem,6vw,2.8rem)}
.lyt-athletic .cdm-svc-card{background:#EEF2F7;border-color:#E2E8F0;border-radius:8px}
.lyt-athletic .cdm-testi-card{background:#EEF2F7;border-color:#E2E8F0}
.lyt-athletic .cdm-faq-item{background:#EEF2F7}
.lyt-athletic .cdm-btn-book{border-radius:6px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:13px}
.lyt-athletic .cdm-nav-btn{border-radius:6px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:.65rem}

@media(min-width:768px){
  .lyt-athletic .cdm-hero{display:grid;grid-template-columns:55% 45%;min-height:72vh;align-items:stretch}
  .lyt-athletic .cdm-hero-photo{order:1;aspect-ratio:unset;margin:0;border-radius:0;height:auto}
  .lyt-athletic .cdm-hero-photo img{height:100%}
  .lyt-athletic .cdm-hero-body{order:2;display:flex;flex-direction:column;justify-content:center;padding:56px 5% 56px 48px}
  .lyt-athletic .cdm-section{max-width:1200px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-athletic footer{max-width:1200px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-athletic .cdm-cta-block{padding:64px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-athletic-css');
  var ws=Object.assign({hero_layout:'stacked',_hero_photo_class:'cdm-hero-photo--wide'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-athletic">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.metrics(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.testimonials(config,ws)
    +M.faq(config,ws)
    +M.location(config,doctor,locs,ws)
    +M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['performance-athletic']=render;
console.log('[Layouts] performance-athletic ✓');
})();
