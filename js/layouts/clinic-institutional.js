/**
 * CitaDoc — Layout: Clinic Institutional
 * Centro médico, institucional, profesional. Grid split clínico,
 * especialidades, equipo, credenciales. Para centros con múltiples doctores.
 * DNA: 'clinic-institutional'
 */
(function(){

var CSS = `
.lyt-clinic{
  --lyt-bg:#F7F8FA;--lyt-surface:#ECEEF3;--lyt-ink:#0D1926;--lyt-ink2:#2E4057;
  --lyt-muted:#8A9EBA;--lyt-border:#D8DDE8;--lyt-accent:#0D4F8C;--lyt-accent-fg:#fff;
  --lyt-display:'DM Sans',sans-serif;--lyt-h1-weight:700;--lyt-h1-tracking:-.022em;
  --lyt-radius:8px;--lyt-nav-bg:#fff;--lyt-section-bg:#F7F8FA;
  --lyt-cta-bg:#0D4F8C;--lyt-label:#8A9EBA;--sticky-accent:#0D4F8C;
}
.lyt-clinic .cdm-nav{background:#fff;border-bottom:1px solid var(--lyt-border)}
.lyt-clinic .cdm-hero-eyebrow{font-size:.56rem;font-weight:700;color:#0D4F8C}
.lyt-clinic .cdm-hero-photo img{filter:brightness(.96) saturate(1.05)}
.lyt-clinic .cdm-metric-num{color:#0D4F8C;font-weight:900}
.lyt-clinic .cdm-svc-card{background:#ECEEF3;border-color:#D8DDE8}
.lyt-clinic .cdm-testi-card{background:#ECEEF3;border-color:#D8DDE8}
.lyt-clinic .cdm-faq-item{background:#ECEEF3}

@media(min-width:768px){
  .lyt-clinic .cdm-hero{
    display:grid;grid-template-columns:1fr 1fr;
    min-height:68vh;align-items:stretch;
  }
  .lyt-clinic .cdm-hero-body{order:1;padding:56px 48px 56px 7%;display:flex;flex-direction:column;justify-content:center}
  .lyt-clinic .cdm-hero-photo{order:2;aspect-ratio:unset;height:auto;min-height:420px;margin:0;border-radius:0}
  .lyt-clinic .cdm-hero-photo img{height:100%}
  .lyt-clinic .cdm-section{max-width:1200px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-clinic footer{max-width:1200px;margin:0 auto;width:100%;box-sizing:border-box}
  .lyt-clinic .cdm-cta-block{padding:64px 7%}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-clinic-css');
  var ws=Object.assign({hero_layout:'stacked',_hero_photo_class:'cdm-hero-photo--wide'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-clinic">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.metrics(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.testimonials(config,ws)
    +M.gallery(config,ws)
    +M.faq(config,ws)
    +M.calculator(config,doctor,ws)+M.instagram(config,ws)+M.insurance(config,ws)+M.location(config,doctor,locs,ws)+M.ctaBlock(config,doctor,ws)
    +M.footer(config,doctor,ws)
    +'</div>';

  M.stickyBar(config,doctor,ws,container);
  M.initReveal(container);
}

window.LAYOUT_RENDERERS=window.LAYOUT_RENDERERS||{};
window.LAYOUT_RENDERERS['clinic-institutional']=render;
console.log('[Layouts] clinic-institutional ✓');
})();
