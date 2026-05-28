/**
 * CitaDoc — Layout: Surgical Authority
 * Clínico, oscuro, experto. Foto sticky izquierda + contenido derecha en desktop.
 * DNA: 'surgical-authority'
 */
(function(){

var CSS = `
.lyt-surgical{
  --lyt-bg:#F5F0E8;--lyt-surface:#EDE8DF;--lyt-ink:#1A1A1A;--lyt-ink2:#5C5248;
  --lyt-muted:#9A8F82;--lyt-border:#DDD5C8;--lyt-accent:#1A1A1A;--lyt-accent-fg:#F5F0E8;
  --lyt-display:'Fraunces',Georgia,serif;--lyt-h1-weight:400;--lyt-h1-tracking:-.035em;
  --lyt-radius:10px;--lyt-nav-bg:#F5F0E8;--lyt-section-bg:#F5F0E8;
  --lyt-cta-bg:#1A1A1A;--lyt-label:#9A8F82;--sticky-accent:#1A1A1A;
}
.lyt-surgical .cdm-hero-eyebrow::before{content:'';width:16px;height:1px;background:var(--lyt-muted);display:block}
.lyt-surgical .cdm-hero-h1{color:#1A1A1A}
.lyt-surgical .cdm-hero-photo img{filter:grayscale(45%) contrast(1.06)}
.lyt-surgical .cdm-svc-card{background:#EDE8DF;border-color:#DDD5C8}
.lyt-surgical .cdm-testi-card{background:#EDE8DF;border-color:#DDD5C8}
.lyt-surgical .cdm-faq-item{background:#EDE8DF}

/* desktop: split sticky */
@media(min-width:768px){
  .lyt-surgical{
    display:grid;
    grid-template-columns:50% 50%;
    grid-template-rows:auto 1fr;
    min-height:100vh;
  }
  .lyt-surgical .cdm-nav{grid-column:1/-1;background:#F5F0E8}
  .lyt-surgical .cdm-hero{
    grid-column:1;grid-row:2;
    position:sticky;top:68px;
    height:calc(100vh - 68px);
    overflow:hidden;
  }
  .lyt-surgical .cdm-hero-photo{
    height:100%;margin:0;border-radius:0;aspect-ratio:unset;
  }
  .lyt-surgical .cdm-hero-photo img{height:100%}
  .lyt-surgical .cdm-hero-body{display:none}
  .lyt-surgical .cdm-section{grid-column:2;padding:40px 48px}
  .lyt-surgical footer{grid-column:2;padding:24px 48px}
  .lyt-surgical .cdm-hero-dtop{display:block}
  .lyt-surgical .cdm-cta-block{grid-column:2}
  .lyt-surgical .cdm-section:first-of-type{padding-top:48px}
}
@media(min-width:1200px){
  .lyt-surgical .cdm-section{padding:48px 64px}
  .lyt-surgical footer{padding:28px 64px}
}
`;

function render(config,doctor,locs,container){
  var M=window.WebModules;
  M.injectBaseCSS();
  M.injectLayoutCSS(CSS,'lyt-surgical-css');
  var ws=Object.assign({hero_layout:'split',_hero_photo_class:'cdm-hero-photo--card'},config._ws||{});

  container.innerHTML='<div class="cdm-wrap lyt-surgical">'
    +M.nav(config,doctor,ws)
    +M.hero(config,doctor,ws)
    +M.about(config,doctor,ws)
    +M.services(config,ws)
    +M.metrics(config,doctor,ws)
    +M.gallery(config,ws)
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
window.LAYOUT_RENDERERS['surgical-authority']=render;
console.log('[Layouts] surgical-authority ✓');
})();
