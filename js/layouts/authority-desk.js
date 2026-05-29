/**
 * CitaDoc — Layout: Authority Desk
 * Headline gigante sin foto en el hero. Barra de pilares oscura.
 * Servicios como lista con foto al costado (renderMAP style).
 * DNA: 'authority-desk'
 */
(function(){

var CSS = `
.lyt-adesk{
  --lyt-bg:#FAFAF9;--lyt-surface:#F2F0ED;--lyt-ink:#1A1A18;--lyt-ink2:#6B6860;
  --lyt-muted:#9A9890;--lyt-border:#E2DED8;--lyt-accent:#1A1A18;--lyt-accent-fg:#FAFAF9;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.045em;
  --lyt-radius:10px;--lyt-nav-bg:#FAFAF9;--lyt-section-bg:#FAFAF9;
  --lyt-cta-bg:#1A1A18;--lyt-cta-btn-bg:#FAFAF9;--lyt-cta-btn-ink:#1A1A18;
  --lyt-label:#9A9890;--sticky-accent:#1A1A18;
}
.lyt-adesk .cdm-nav{border-bottom:1.5px solid var(--lyt-border)}
.lyt-adesk .cdm-hero--authority{border-bottom:1.5px solid var(--lyt-border)}
.lyt-adesk .cdm-authority-h1{font-style:italic}
.lyt-adesk .cdm-authority-eyebrow::before{background:#1A1A18}
.lyt-adesk .cdm-pillars-band{background:#1A1A18;border-bottom:none}
.lyt-adesk .cdm-section{border-top:1.5px solid var(--lyt-border)}
.lyt-adesk .cdm-testi-card{background:#F2F0ED;border-color:#E2DED8}
.lyt-adesk .cdm-faq-item{background:#F2F0ED}
.lyt-adesk .cdm-authority-svc-row{border-bottom-color:#E2DED8}
.lyt-adesk .cdm-authority-svc-row:hover{background:#F2F0ED}
.lyt-adesk .cdm-footer{background:#1A1A18;color:#FAFAF9;border-top:none}
.lyt-adesk .cdm-footer-txt,.lyt-adesk .cdm-footer-txt a{color:rgba(250,250,249,.4)}
.lyt-adesk .cdm-sticky{background:rgba(26,26,24,.93);border-top-color:#333}
.lyt-adesk .cdm-sticky-lbl,.lyt-adesk .cdm-sticky-ico{color:rgba(250,250,249,.35)}
.lyt-adesk .cdm-sticky-primary .cdm-sticky-lbl{color:rgba(250,250,249,.85)}
.lyt-adesk .cdm-sticky-primary .cdm-sticky-ico{background:#FAFAF9;color:#1A1A18}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-adesk-css');
  var ws=Object.assign({},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-adesk">'
    +M.nav(config,doctor,ws)
    +M.heroAuthority(config,doctor,ws)
    +M.pillarsBand(config,ws)
    +M.servicesAuthority(config,doctor,ws)
    +M.metrics(config,doctor,ws)
    +M.testimonials(config,ws)
    +M.faq(config,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.location(config,doctor,locs,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['authority-desk']=render;
console.log('[Layouts] authority-desk ✓');
})();
