/**
 * CitaDoc — Layout: Personal Brand
 * El médico como marca personal. Foto avatar circular, nombre grande, historia.
 * DNA: 'personal-brand'
 */
(function(){

var CSS = `
.lyt-pbrand{
  --lyt-bg:#FAFAF8;--lyt-surface:#F2F0EB;--lyt-ink:#111111;--lyt-ink2:#4A4035;
  --lyt-muted:#9A8E7E;--lyt-border:#E4DFDA;--lyt-accent:#2D2D2D;--lyt-accent-fg:#FAFAF8;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.03em;
  --lyt-radius:16px;--lyt-nav-bg:#FAFAF8;--lyt-section-bg:#FAFAF8;
  --lyt-cta-bg:#2D2D2D;--lyt-label:#9A8E7E;--sticky-accent:#2D2D2D;
  --lyt-hero-body-bg:#FAFAF8;
}
/* Hero: avatar circular centrado */
.lyt-pbrand .cdm-hero{text-align:center;padding:0 0 8px}
.lyt-pbrand .cdm-hero-body{padding:20px 20px 28px;display:flex;flex-direction:column;align-items:center}
.lyt-pbrand .cdm-hero-h1{text-align:center}
.lyt-pbrand .cdm-hero-sub{text-align:center;margin-left:auto;margin-right:auto}
.lyt-pbrand .cdm-hero-ctas{align-items:center}
.lyt-pbrand .cdm-hero-eyebrow{justify-content:center}
/* Foto avatar */
.lyt-pbrand .cdm-hero-photo--avatar{
  width:100px;height:100px;border-radius:50%;
  margin:24px auto 0;
  overflow:hidden;border:3px solid var(--lyt-border);
  aspect-ratio:1;flex-shrink:0;
}
.lyt-pbrand .cdm-hero-photo--avatar img{height:100%;object-fit:cover;object-position:center 10%}
.lyt-pbrand .cdm-svc-card{background:#F2F0EB;border-color:#E4DFDA}
.lyt-pbrand .cdm-testi-card{background:#F2F0EB;border-color:#E4DFDA}
.lyt-pbrand .cdm-faq-item{background:#F2F0EB}
.lyt-pbrand .cdm-btn-book{border-radius:24px;width:auto;padding:0 24px}
.lyt-pbrand .cdm-btn-wa{border-radius:24px;width:auto;padding:0 20px}
.lyt-pbrand .cdm-nav-btn{border-radius:20px}

@media(min-width:768px){
  .lyt-pbrand .cdm-wrap{max-width:760px;margin:0 auto}
  .lyt-pbrand .cdm-nav{max-width:760px;margin:0 auto}
  .lyt-pbrand .cdm-hero-photo--avatar{width:130px;height:130px}
  .lyt-pbrand .cdm-hero-h1{font-size:clamp(2rem,4vw,3rem)}
  .lyt-pbrand .cdm-section{padding-top:40px;padding-bottom:40px}
  .lyt-pbrand .cdm-cta-block{border-radius:20px;margin:0 20px 20px}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-pbrand-css');
  var ws=Object.assign({hero_layout:'stacked',_hero_photo_class:'cdm-hero-photo--avatar'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-pbrand">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.testimonials(config,ws)
    +M.faq(config,ws)
    +M.location(config,doctor,locs,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['personal-brand']=render;
console.log('[Layouts] personal-brand ✓');
})();
