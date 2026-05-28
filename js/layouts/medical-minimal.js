/**
 * CitaDoc — Layout: Medical Minimal
 * Limpio, universal, confiable. Blanco dominante, tipografía clara, sin ruido.
 * DNA: 'medical-minimal'
 */
(function(){

var CSS = `
.lyt-minimal{
  --lyt-bg:#FFFFFF;--lyt-surface:#F9FAFB;--lyt-ink:#111827;--lyt-ink2:#374151;
  --lyt-muted:#9CA3AF;--lyt-border:#E5E7EB;--lyt-accent:#111827;--lyt-accent-fg:#fff;
  --lyt-display:'DM Sans',sans-serif;--lyt-h1-weight:700;--lyt-h1-tracking:-.022em;
  --lyt-radius:8px;--lyt-nav-bg:#fff;--lyt-section-bg:#fff;
  --lyt-cta-bg:#111827;--lyt-label:#9CA3AF;--sticky-accent:#111827;
}
.lyt-minimal .cdm-hero-eyebrow{font-size:.54rem;letter-spacing:.14em;color:#9CA3AF}
.lyt-minimal .cdm-svc-card{border-radius:8px}
.lyt-minimal .cdm-btn-book{border-radius:8px}
.lyt-minimal .cdm-nav-btn{border-radius:8px}

@media(min-width:768px){
  .lyt-minimal .cdm-hero{
    display:grid;grid-template-columns:1fr 1fr;
    align-items:center;gap:0;min-height:72vh;max-width:1200px;margin:0 auto;
  }
  .lyt-minimal .cdm-hero-body{order:1;padding:56px 48px 56px 7%}
  .lyt-minimal .cdm-hero-photo{order:2;aspect-ratio:unset;height:100%;min-height:460px;margin:0;border-radius:0}
  .lyt-minimal .cdm-hero-photo img{height:100%}
  .lyt-minimal .cdm-section{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-minimal footer{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-minimal .cdm-cta-block{padding:64px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-minimal-css');
  var ws=Object.assign({hero_layout:'stacked',_hero_photo_class:'cdm-hero-photo--card'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-minimal">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.faq(config,ws)
    +M.location(config,doctor,locs,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['medical-minimal']=render;
console.log('[Layouts] medical-minimal ✓');
})();
