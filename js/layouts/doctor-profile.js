/**
 * CitaDoc — Layout: Doctor Profile
 * Perfil social médico. Cover panorámica + avatar circular + bio + servicios en chips.
 * Arquitectura completamente distinta: no hay "hero" tradicional.
 * DNA: 'doctor-profile'
 */
(function(){

var CSS = `
.lyt-dpro{
  --lyt-bg:#FFFFFF;--lyt-surface:#F4F4F5;--lyt-ink:#09090B;--lyt-ink2:#52525B;
  --lyt-muted:#A1A1AA;--lyt-border:#E4E4E7;--lyt-accent:#0B7C6E;--lyt-accent-fg:#fff;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:700;--lyt-h1-tracking:-.025em;
  --lyt-radius:14px;--lyt-nav-bg:#fff;--lyt-section-bg:#fff;
  --lyt-cta-bg:#0B7C6E;--lyt-label:#A1A1AA;--sticky-accent:#0B7C6E;
}
.lyt-dpro .cdm-nav{border-bottom:1.5px solid var(--lyt-border)}
.lyt-dpro .cdm-section{border-top:1px solid var(--lyt-border)}
.lyt-dpro .cdm-testi-card{background:#F4F4F5;border:none;border-radius:18px}
.lyt-dpro .cdm-faq-item{background:#F4F4F5;border-radius:14px}
.lyt-dpro .cdm-svc-card{background:#F4F4F5;border:none;border-radius:14px}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-dpro-css');
  var ws=Object.assign({},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-dpro">'
    +M.nav(config,doctor,ws)
    +M.heroProfile(config,doctor,ws)
    +M.servicesScroll(config,ws)
    +M.testimonials(config,ws)
    +M.gallery(config,ws)
    +M.about(config,doctor,ws)
    +M.faq(config,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.location(config,doctor,locs,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['doctor-profile']=render;
console.log('[Layouts] doctor-profile ✓');
})();
