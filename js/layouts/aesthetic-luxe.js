/**
 * CitaDoc — Layout: Aesthetic Luxe
 * Lujo, transformación, editorial. Hero fullscreen, paleta negra/dorada.
 * DNA: 'aesthetic-luxe'
 */
(function(){

var CSS = `
.lyt-luxe{
  --lyt-bg:#0D0D0D;--lyt-surface:#181818;--lyt-ink:#F0EDE8;--lyt-ink2:#A09890;
  --lyt-muted:#6B6258;--lyt-border:#2A2520;--lyt-accent:#C9A84C;--lyt-accent-fg:#0D0D0D;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:300;--lyt-h1-tracking:-.04em;
  --lyt-radius:10px;--lyt-nav-bg:transparent;--lyt-section-bg:#0D0D0D;
  --lyt-hero-overlay:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.3) 55%,transparent 100%);
  --lyt-cta-bg:#C9A84C;--lyt-cta-ink:#0D0D0D;--lyt-cta-btn-bg:#C9A84C;--lyt-cta-btn-ink:#0D0D0D;
  --lyt-label:#6B6258;--sticky-accent:#C9A84C;
}
.lyt-luxe .cdm-nav{position:absolute;top:0;left:0;right:0;z-index:30;background:transparent;border-bottom:none}
.lyt-luxe .cdm-brand-name,.lyt-luxe .cdm-brand-esp{color:rgba(255,255,255,.9)}
.lyt-luxe .cdm-nav-btn{background:#C9A84C;color:#0D0D0D}
.lyt-luxe .cdm-hero{padding-top:0}
.lyt-luxe .cdm-hero-body{padding-top:40px;padding-bottom:32px}
.lyt-luxe .cdm-hero--fullscreen .cdm-btn-book{background:#C9A84C;color:#0D0D0D}
.lyt-luxe .cdm-section{border-top:1px solid #2A2520}
.lyt-luxe .cdm-svc-card{background:#181818;border-color:#2A2520}
.lyt-luxe .cdm-testi-card{background:#181818;border-color:#2A2520}
.lyt-luxe .cdm-faq-item{background:#181818}
.lyt-luxe .cdm-footer{background:#0D0D0D;border-top-color:#2A2520}
.lyt-luxe .cdm-sticky{background:rgba(13,13,13,.92);border-top-color:#2A2520}
.lyt-luxe .cdm-sticky-lbl,.lyt-luxe .cdm-sticky-ico{color:#6B6258}
.lyt-luxe .cdm-sticky-primary .cdm-sticky-lbl{color:#C9A84C}

@media(min-width:768px){
  .lyt-luxe .cdm-nav{position:fixed}
  .lyt-luxe .cdm-hero--fullscreen{min-height:100vh}
  .lyt-luxe .cdm-hero-body{padding:120px 7% 64px}
  .lyt-luxe .cdm-hero-h1{font-size:clamp(2.4rem,5vw,4rem)}
  .lyt-luxe .cdm-section{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-luxe footer{max-width:1100px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-luxe .cdm-cta-block{max-width:none;padding:72px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-luxe-css');
  var ws=Object.assign({hero_layout:'fullscreen'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-luxe">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.gallery(config,ws)
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
window.LAYOUT_RENDERERS['aesthetic-luxe']=render;
console.log('[Layouts] aesthetic-luxe ✓');
})();
