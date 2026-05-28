/**
 * CitaDoc — Layout: Sand Wellness
 * Bienestar, naturaleza, calma. Tonos arena/tierra, espaciado generoso, ritmo lento.
 * DNA: 'sand-wellness'
 */
(function(){

var CSS = `
.lyt-sand{
  --lyt-bg:#FAF7F2;--lyt-surface:#F0EBE2;--lyt-ink:#2C2416;--lyt-ink2:#6B5E4A;
  --lyt-muted:#B5A28E;--lyt-border:#E4D9C8;--lyt-accent:#7A6248;--lyt-accent-fg:#FAF7F2;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.025em;
  --lyt-radius:16px;--lyt-nav-bg:#FAF7F2;--lyt-section-bg:#FAF7F2;
  --lyt-cta-bg:#7A6248;--lyt-label:#B5A28E;--sticky-accent:#7A6248;
  --lyt-hero-body-bg:#FAF7F2;
}
.lyt-sand .cdm-hero-photo img{filter:saturate(.9) brightness(1.02)}
.lyt-sand .cdm-hero-eyebrow{color:#B5A28E;letter-spacing:.16em}
.lyt-sand .cdm-svc-card{background:#F0EBE2;border-color:#E4D9C8}
.lyt-sand .cdm-testi-card{background:#F0EBE2;border-color:#E4D9C8}
.lyt-sand .cdm-faq-item{background:#F0EBE2}
.lyt-sand .cdm-section{padding-top:36px;padding-bottom:36px}
.lyt-sand .cdm-diff-dot{color:#B5A28E}

@media(min-width:768px){
  .lyt-sand .cdm-hero{
    min-height:85vh;display:flex;flex-direction:column;
    background:var(--lyt-bg);
  }
  .lyt-sand .cdm-hero-photo{aspect-ratio:21/9;margin:0;border-radius:0;overflow:hidden;flex-shrink:0}
  .lyt-sand .cdm-hero-body{padding:48px 7%;max-width:700px}
  .lyt-sand .cdm-section{max-width:1060px;margin:0 auto;width:100%;box-sizing:border-box;padding-top:52px;padding-bottom:52px}
  .lyt-sand footer{max-width:1060px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-sand .cdm-cta-block{padding:64px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-sand-css');
  var ws=Object.assign({hero_layout:'stacked',_hero_photo_class:'cdm-hero-photo--wide'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-sand">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.testimonials(config,ws)
    +M.gallery(config,ws)
    +M.faq(config,ws)
    +M.location(config,doctor,locs,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['sand-wellness']=render;
console.log('[Layouts] sand-wellness ✓');
})();
