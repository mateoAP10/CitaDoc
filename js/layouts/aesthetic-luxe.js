/**
 * CitaDoc — Layout: Aesthetic Luxe
 * Lujo, transformación, editorial. Hero fullscreen, paleta negra/dorada.
 * DNA: 'aesthetic-luxe'
 */
(function(){

var CSS = `
.lyt-luxe{
  --lyt-bg:#FDFAF7;--lyt-surface:#F5EFE8;--lyt-ink:#1A0F0A;--lyt-ink2:#6B5446;
  --lyt-muted:#A8927E;--lyt-border:#E8DDD4;--lyt-accent:#B07D5A;--lyt-accent-fg:#FDFAF7;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:300;--lyt-h1-tracking:-.04em;
  --lyt-radius:10px;--lyt-nav-bg:rgba(253,250,247,.92);--lyt-section-bg:#FDFAF7;
  --lyt-hero-overlay:linear-gradient(to top,rgba(26,15,10,.85) 0%,rgba(26,15,10,.2) 55%,transparent 100%);
  --lyt-cta-bg:#B07D5A;--lyt-cta-ink:#FDFAF7;--lyt-cta-btn-bg:#B07D5A;--lyt-cta-btn-ink:#FDFAF7;
  --lyt-label:#A8927E;--sticky-accent:#B07D5A;
}
.lyt-luxe .cdm-nav{position:absolute;top:0;left:0;right:0;z-index:30;background:transparent;border-bottom:none}
.lyt-luxe .cdm-brand-name,.lyt-luxe .cdm-brand-esp{color:rgba(255,255,255,.95)}
.lyt-luxe .cdm-nav-btn{background:#B07D5A;color:#FDFAF7}
.lyt-luxe .cdm-hero{padding-top:0}
.lyt-luxe .cdm-hero-body{padding-top:40px;padding-bottom:32px}
.lyt-luxe .cdm-hero--fullscreen .cdm-btn-book{background:#B07D5A;color:#FDFAF7}
.lyt-luxe .cdm-section{border-top:1px solid #E8DDD4}
.lyt-luxe .cdm-svc-card{background:#F5EFE8;border-color:#E8DDD4}
.lyt-luxe .cdm-testi-card{background:#F5EFE8;border-color:#E82520}
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
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.location(config,doctor,locs,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['aesthetic-luxe']=render;
console.log('[Layouts] aesthetic-luxe ✓');
})();
