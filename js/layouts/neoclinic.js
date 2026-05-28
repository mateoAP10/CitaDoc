/**
 * CitaDoc — Layout: Neoclinic
 * Moderno, tecnológico, institucional. Blanco limpio con azul eléctrico.
 * Para centros médicos y clínicas. Foto sticky derecha en desktop.
 * DNA: 'neoclinic'
 */
(function(){

var CSS = `
.lyt-neo{
  --lyt-bg:#FFFFFF;--lyt-surface:#F4F6FA;--lyt-ink:#0C1A35;--lyt-ink2:#3D5480;
  --lyt-muted:#8FA5C9;--lyt-border:#DDE5F0;--lyt-accent:#1A4FD8;--lyt-accent-fg:#fff;
  --lyt-display:'DM Sans',sans-serif;--lyt-h1-weight:700;--lyt-h1-tracking:-.025em;
  --lyt-radius:10px;--lyt-nav-bg:#fff;--lyt-section-bg:#fff;
  --lyt-cta-bg:#1A4FD8;--lyt-label:#8FA5C9;--sticky-accent:#1A4FD8;
}
.lyt-neo .cdm-hero-eyebrow{font-size:.56rem;font-weight:700;color:#1A4FD8;letter-spacing:.14em}
.lyt-neo .cdm-hero-photo img{filter:brightness(.95) saturate(1.1)}
.lyt-neo .cdm-svc-card{background:#F4F6FA;border-color:#DDE5F0}
.lyt-neo .cdm-testi-card{background:#F4F6FA;border-color:#DDE5F0}
.lyt-neo .cdm-faq-item{background:#F4F6FA}
.lyt-neo .cdm-metric-num{color:#1A4FD8}
.lyt-neo .cdm-btn-book{border-radius:8px}

/* desktop: split sticky — foto lado derecho */
@media(min-width:768px){
  .lyt-neo{
    display:grid;
    grid-template-columns:50% 50%;
    grid-template-rows:auto 1fr;
    min-height:100vh;
  }
  .lyt-neo .cdm-nav{grid-column:1/-1;background:#fff}
  .lyt-neo .cdm-hero{
    grid-column:2;grid-row:2;
    position:sticky;top:68px;
    height:calc(100vh - 68px);
    overflow:hidden;
  }
  .lyt-neo .cdm-hero-photo{
    height:100%;margin:0;border-radius:0;aspect-ratio:unset;
  }
  .lyt-neo .cdm-hero-photo img{height:100%}
  .lyt-neo .cdm-hero-body{display:none}
  .lyt-neo .cdm-section{grid-column:1;padding:40px 48px}
  .lyt-neo footer{grid-column:1;padding:24px 48px}
  .lyt-neo .cdm-hero-dtop{display:block}
  .lyt-neo .cdm-cta-block{grid-column:1}
}
@media(min-width:1200px){
  .lyt-neo .cdm-section{padding:48px 64px}
  .lyt-neo footer{padding:28px 64px}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-neo-css');
  var ws=Object.assign({hero_layout:'split',_hero_photo_class:'cdm-hero-photo--card'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-neo">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.metrics(config,doctor,ws)
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
window.LAYOUT_RENDERERS['neoclinic']=render;
console.log('[Layouts] neoclinic ✓');
})();
