/**
 * CitaDoc — Layout: Doctor Profile Terra
 * Perfil cálido terroso. Cover natural, tonos tierra, orgánico.
 * Misma arquitectura que doctor-profile. Personalidad: humano, natural, cercano.
 * DNA: 'doctor-profile-terra'
 */
(function(){

var CSS = `
.lyt-dpterra{
  --lyt-bg:#FDFAF5;--lyt-surface:#F2EBE0;--lyt-ink:#2D1F10;--lyt-ink2:#6B5040;
  --lyt-muted:#B09070;--lyt-border:#E8DACE;--lyt-accent:#A0522D;--lyt-accent-fg:#FDFAF5;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.025em;
  --lyt-radius:18px;--lyt-nav-bg:rgba(253,250,245,.9);--lyt-section-bg:#FDFAF5;
  --lyt-cta-bg:#A0522D;--lyt-cta-ink:#FDFAF5;--lyt-cta-btn-bg:#FDFAF5;--lyt-cta-btn-ink:#A0522D;
  --lyt-label:#B09070;--sticky-accent:#A0522D;
}
.lyt-dpterra .cdm-nav{backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(160,82,45,.1)}
.lyt-dpterra .cdm-profile-cover::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(45,31,16,.2) 100%);pointer-events:none}
.lyt-dpterra .cdm-profile-avatar{border-color:#FDFAF5;box-shadow:0 4px 16px rgba(45,31,16,.18)}
.lyt-dpterra .cdm-profile-card{background:#FDFAF5}
.lyt-dpterra .cdm-profile-esp{color:#B09070}
.lyt-dpterra .cdm-profile-stats{border-color:#E8DACE}
.lyt-dpterra .cdm-profile-stat{border-right-color:#E8DACE}
.lyt-dpterra .cdm-section{border-top:1px solid #E8DACE;background:#FDFAF5}
.lyt-dpterra .cdm-svc-chip{background:#F2EBE0;border-color:#E8DACE;border-radius:18px}
.lyt-dpterra .cdm-svc-chip:hover{border-color:#A0522D}
.lyt-dpterra .cdm-svc-chip-name{font-style:italic;color:#2D1F10}
.lyt-dpterra .cdm-testi-card{background:#F2EBE0;border-color:#E8DACE;border-radius:18px}
.lyt-dpterra .cdm-faq-item{background:#F2EBE0;border-radius:18px}
.lyt-dpterra .cdm-footer{background:#F2EBE0;border-top:1px solid #E8DACE}
.lyt-dpterra .cdm-btn-wa{border-color:#E8DACE;color:#6B5040}
.lyt-dpterra .cdm-sticky{background:rgba(253,250,245,.95);border-top-color:#E8DACE}
.lyt-dpterra .cdm-sticky-lbl,.lyt-dpterra .cdm-sticky-ico{color:#B09070}
.lyt-dpterra .cdm-sticky-primary .cdm-sticky-lbl{color:#A0522D}
.lyt-dpterra .cdm-sticky-primary .cdm-sticky-ico{background:#A0522D;color:#FDFAF5}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-dpterra-css');
  var ws=Object.assign({},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-dpterra">'
    +M.nav(config,doctor,ws)
    +M.heroProfile(config,doctor,ws)
    +M.servicesScroll(config,ws)
    +M.testimonials(config,ws)
    +M.about(config,doctor,ws)
    +M.gallery(config,ws)
    +M.faq(config,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.location(config,doctor,locs,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['doctor-profile-terra']=render;
console.log('[Layouts] doctor-profile-terra ✓');
})();
