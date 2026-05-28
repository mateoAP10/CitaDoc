/**
 * CitaDoc — Layout: High Conversion
 * Landing page médica orientada a conversión. Hero fullscreen bold,
 * CTA prominente, social proof, FAQ. Máximo impacto en primer scroll.
 * DNA: 'high-conversion'
 */
(function(){

var CSS = `
.lyt-hconv{
  --lyt-bg:#FFFFFF;--lyt-surface:#F0F4FF;--lyt-ink:#0A0E1A;--lyt-ink2:#2D3A5A;
  --lyt-muted:#8896B8;--lyt-border:#D8E0F5;--lyt-accent:#2A52E8;--lyt-accent-fg:#fff;
  --lyt-display:'DM Sans',sans-serif;--lyt-h1-weight:800;--lyt-h1-tracking:-.03em;
  --lyt-radius:12px;--lyt-section-bg:#fff;
  --lyt-hero-overlay:linear-gradient(to top,rgba(10,14,26,.88) 0%,rgba(10,14,26,.4) 55%,rgba(10,14,26,.15) 100%);
  --lyt-cta-bg:#2A52E8;--lyt-cta-btn-bg:#fff;--lyt-cta-btn-ink:#2A52E8;
  --lyt-label:#8896B8;--sticky-accent:#2A52E8;
}
.lyt-hconv .cdm-nav{position:absolute;top:0;left:0;right:0;background:transparent;border-bottom:none;z-index:30}
.lyt-hconv .cdm-brand-name,.lyt-hconv .cdm-brand-esp{color:rgba(255,255,255,.9)}
.lyt-hconv .cdm-nav-btn{background:#fff;color:#2A52E8;font-weight:700}
.lyt-hconv .cdm-hero-body{padding-top:40px;padding-bottom:40px}
.lyt-hconv .cdm-hero--fullscreen{min-height:100svh}
.lyt-hconv .cdm-hero-h1{font-size:clamp(1.9rem,6.5vw,3.2rem)}
.lyt-hconv .cdm-hero--fullscreen .cdm-btn-book{background:#2A52E8;color:#fff;font-weight:800;height:56px;font-size:15px}
.lyt-hconv .cdm-hero--fullscreen .cdm-btn-wa{border-color:rgba(255,255,255,.35);color:#fff}
.lyt-hconv .cdm-svc-card{background:#F0F4FF;border-color:#D8E0F5}
.lyt-hconv .cdm-testi-card{background:#F0F4FF;border-color:#D8E0F5}
.lyt-hconv .cdm-faq-item{background:#F0F4FF}
.lyt-hconv .cdm-metric-num{color:#2A52E8}

@media(min-width:768px){
  .lyt-hconv .cdm-nav{position:fixed}
  .lyt-hconv .cdm-hero--fullscreen{min-height:100vh}
  .lyt-hconv .cdm-hero-body{padding:120px 7% 72px}
  .lyt-hconv .cdm-hero-h1{font-size:clamp(2.4rem,5vw,3.8rem)}
  .lyt-hconv .cdm-hero-sub{max-width:520px;font-size:15px}
  .lyt-hconv .cdm-hero-ctas{flex-direction:row;gap:12px}
  .lyt-hconv .cdm-section{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-hconv footer{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-hconv .cdm-cta-block{padding:72px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-hconv-css');
  var ws=Object.assign({hero_layout:'fullscreen'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-hconv">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.metrics(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.testimonials(config,ws)
    +M.faq(config,ws)
    +M.location(config,doctor,locs,ws)
    +M.calculator(config,doctor,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['high-conversion']=render;
console.log('[Layouts] high-conversion ✓');
})();
