/**
 * CitaDoc — Layout: Modern Story
 * Cinemático, storytelling médico. Foto de impacto, titular humano,
 * filosofía, historia del médico. Tono premium editorial.
 * DNA: 'modern-story'
 */
(function(){

var CSS = `
.lyt-story{
  --lyt-bg:#0A0A0A;--lyt-surface:#141414;--lyt-ink:#F5F2ED;--lyt-ink2:#A09488;
  --lyt-muted:#5C5248;--lyt-border:#242018;--lyt-accent:#D4A84B;--lyt-accent-fg:#0A0A0A;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:300;--lyt-h1-tracking:-.04em;
  --lyt-radius:10px;--lyt-nav-bg:transparent;--lyt-section-bg:#0A0A0A;
  --lyt-hero-overlay:linear-gradient(160deg,transparent 30%,rgba(0,0,0,.85) 75%,rgba(0,0,0,.96) 100%);
  --lyt-cta-bg:#D4A84B;--lyt-cta-ink:#0A0A0A;--lyt-cta-btn-bg:#D4A84B;--lyt-cta-btn-ink:#0A0A0A;
  --lyt-label:#5C5248;--sticky-accent:#D4A84B;
}
.lyt-story .cdm-nav{position:absolute;top:0;left:0;right:0;background:transparent;border-bottom:none;z-index:30}
.lyt-story .cdm-brand-name,.lyt-story .cdm-brand-esp{color:rgba(255,255,255,.9)}
.lyt-story .cdm-nav-btn{background:#D4A84B;color:#0A0A0A}
.lyt-story .cdm-hero-body{padding-top:32px;padding-bottom:36px}
.lyt-story .cdm-hero--fullscreen{min-height:100svh}
.lyt-story .cdm-hero-h1{font-size:clamp(1.8rem,6vw,3rem);font-style:italic}
.lyt-story .cdm-hero--fullscreen .cdm-btn-book{background:#D4A84B;color:#0A0A0A;font-weight:700}
.lyt-story .cdm-hero--fullscreen .cdm-btn-wa{border-color:rgba(255,255,255,.3);color:#fff}
.lyt-story .cdm-section{border-top:1px solid #242018}
.lyt-story .cdm-about-text{font-size:15px;line-height:1.85;color:#A09488}
.lyt-story .cdm-svc-card{background:#141414;border-color:#242018}
.lyt-story .cdm-testi-card{background:#141414;border-color:#242018}
.lyt-story .cdm-faq-item{background:#141414}
.lyt-story .cdm-footer{background:#0A0A0A;border-top-color:#242018}
.lyt-story .cdm-sticky{background:rgba(10,10,10,.92);border-top-color:#242018}
.lyt-story .cdm-sticky-lbl,.lyt-story .cdm-sticky-ico{color:#5C5248}
.lyt-story .cdm-sticky-primary .cdm-sticky-lbl{color:#D4A84B}

@media(min-width:768px){
  .lyt-story .cdm-nav{position:fixed}
  .lyt-story .cdm-hero--fullscreen{min-height:100vh}
  .lyt-story .cdm-hero-body{padding:110px 7% 64px}
  .lyt-story .cdm-hero-h1{font-size:clamp(2.4rem,5.5vw,4rem)}
  .lyt-story .cdm-hero-sub{font-size:15px;max-width:520px}
  .lyt-story .cdm-section{max-width:1000px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-story footer{max-width:1000px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-story .cdm-about-text{font-size:16px;max-width:640px}
  .lyt-story .cdm-cta-block{padding:72px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-story-css');
  var ws=Object.assign({hero_layout:'fullscreen'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-story">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.gallery(config,ws)
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
window.LAYOUT_RENDERERS['modern-story']=render;
console.log('[Layouts] modern-story ✓');
})();
