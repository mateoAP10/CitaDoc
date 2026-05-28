/**
 * CitaDoc — Layout: Warm Human Care
 * Cálido, cercano, humano. Tonos tierra suaves, foto natural, trato personal.
 * DNA: 'warm-human-care'
 */
(function(){

var CSS = `
.lyt-warm{
  --lyt-bg:#FFFBF5;--lyt-surface:#F5EFE6;--lyt-ink:#2D1F14;--lyt-ink2:#6B5744;
  --lyt-muted:#B09880;--lyt-border:#E8DCCF;--lyt-accent:#C0652A;--lyt-accent-fg:#fff;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.03em;
  --lyt-radius:14px;--lyt-nav-bg:#FFFBF5;--lyt-section-bg:#FFFBF5;
  --lyt-cta-bg:#C0652A;--lyt-label:#B09880;--sticky-accent:#C0652A;
}
.lyt-warm .cdm-hero-eyebrow{color:#B09880}
.lyt-warm .cdm-hero-body{background:#FFFBF5}
.lyt-warm .cdm-svc-card{background:#F5EFE6;border-color:#E8DCCF}
.lyt-warm .cdm-testi-card{background:#F5EFE6;border-color:#E8DCCF}
.lyt-warm .cdm-faq-item{background:#F5EFE6}
.lyt-warm .cdm-hero-photo img{filter:saturate(1.08) brightness(.98)}

/* desktop: hero full-width top, content below — centered max-width */
@media(min-width:768px){
  .lyt-warm .cdm-hero{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:0;min-height:70vh}
  .lyt-warm .cdm-hero-photo{height:100%;min-height:480px;order:2;margin:0;border-radius:0;aspect-ratio:unset}
  .lyt-warm .cdm-hero-photo img{height:100%}
  .lyt-warm .cdm-hero-body{order:1;padding:56px 5% 56px 7%}
  .lyt-warm .cdm-section{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-warm footer{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-warm-css');
  var ws=Object.assign({hero_layout:'stacked',_hero_photo_class:'cdm-hero-photo--wide'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-warm">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
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
window.LAYOUT_RENDERERS['warm-human-care']=render;
console.log('[Layouts] warm-human-care ✓');
})();
