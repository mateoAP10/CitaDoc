/**
 * CitaDoc — Layout: Doctor Profile Noir
 * Perfil premium oscuro. Cover cinematográfica, glassmorphism, dorado.
 * Misma arquitectura que doctor-profile. Personalidad: lujo, noche, premium.
 * DNA: 'doctor-profile-noir'
 */
(function(){

var CSS = `
.lyt-dpnoir{
  --lyt-bg:#0D0D0D;--lyt-surface:#1A1A1A;--lyt-ink:#F5F2ED;--lyt-ink2:#A09888;
  --lyt-muted:#5C5248;--lyt-border:#2A2520;--lyt-accent:#C9A84C;--lyt-accent-fg:#0D0D0D;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.035em;
  --lyt-radius:14px;--lyt-nav-bg:rgba(13,13,13,.92);--lyt-section-bg:#0D0D0D;
  --lyt-cta-bg:#C9A84C;--lyt-cta-ink:#0D0D0D;--lyt-cta-btn-bg:#C9A84C;--lyt-cta-btn-ink:#0D0D0D;
  --lyt-label:#5C5248;--sticky-accent:#C9A84C;
}
.lyt-dpnoir .cdm-nav{background:rgba(13,13,13,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}
.lyt-dpnoir .cdm-profile-cover::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,transparent 30%,rgba(13,13,13,.75) 100%);pointer-events:none}
.lyt-dpnoir .cdm-profile-avatar{border-color:#0D0D0D;box-shadow:0 0 0 1px rgba(201,168,76,.3),0 4px 20px rgba(0,0,0,.6)}
.lyt-dpnoir .cdm-profile-card{background:#0D0D0D}
.lyt-dpnoir .cdm-profile-stats{border-color:#2A2520}
.lyt-dpnoir .cdm-profile-stat{border-right-color:#2A2520}
.lyt-dpnoir .cdm-section{border-top:1px solid #2A2520;background:#0D0D0D}
.lyt-dpnoir .cdm-svc-chip{background:#1A1A1A;border-color:#2A2520}
.lyt-dpnoir .cdm-svc-chip:hover{border-color:#C9A84C}
.lyt-dpnoir .cdm-svc-chip-name{color:#F5F2ED}
.lyt-dpnoir .cdm-testi-card{background:#1A1A1A;border-color:#2A2520}
.lyt-dpnoir .cdm-faq-item{background:#1A1A1A}
.lyt-dpnoir .cdm-faq-item summary{color:#F5F2ED}
.lyt-dpnoir .cdm-footer{background:#080808;border-top-color:#2A2520}
.lyt-dpnoir .cdm-btn-wa{border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.7);background:rgba(255,255,255,.04)}
.lyt-dpnoir .cdm-sticky{background:rgba(13,13,13,.95);border-top-color:#2A2520}
.lyt-dpnoir .cdm-sticky-lbl,.lyt-dpnoir .cdm-sticky-ico{color:#5C5248}
.lyt-dpnoir .cdm-sticky-primary .cdm-sticky-lbl{color:#C9A84C}
.lyt-dpnoir .cdm-sticky-primary .cdm-sticky-ico{background:#C9A84C;color:#0D0D0D}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-dpnoir-css');
  var ws=Object.assign({},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-dpnoir">'
    +M.nav(config,doctor,ws)
    +M.heroProfile(config,doctor,ws)
    +M.servicesScroll(config,ws)
    +M.about(config,doctor,ws)
    +M.gallery(config,ws)
    +M.testimonials(config,ws)
    +M.faq(config,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.location(config,doctor,locs,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['doctor-profile-noir']=render;
console.log('[Layouts] doctor-profile-noir ✓');
})();
