/**
 * CitaDoc — Module Registry
 * Fase 5: cada sección es un módulo con DOM, markup y ritmo propios.
 *
 * REGLA: ningún módulo comparte markup con otro de DNA distinto.
 * REGLA: el renderer solo llama MODULE_RENDERERS[type](config, wc, m, locs).
 * REGLA: si dos módulos de DNA distintos generan el mismo HTML — el sistema falló.
 */

// ── CSS DE MÓDULOS (inyectado una vez en <head>) ──────────────────────
var MODULE_CSS = `
/* ─────────────────────────────────────────
   SURGICAL AUTHORITY modules
   Prefijo .sa-
───────────────────────────────────────── */

/* hero-editorial */
.sa-hero{display:flex;flex-direction:column;background:var(--navy,#0B2341)}
.sa-hero-photo{height:62svh;min-height:360px;position:relative;overflow:hidden}
.sa-hero-photo img{width:100%;height:100%;object-fit:cover;object-position:center 10%;display:block}
.sa-hero-body{background:#fff;margin-top:-72px;position:relative;z-index:2;padding:2rem 7% calc(1.5rem + env(safe-area-inset-bottom))}
.sa-hero-tag{font-size:.52rem;font-weight:700;color:var(--navy,#0B2341);text-transform:uppercase;letter-spacing:.2em;margin-bottom:1rem;display:flex;align-items:center;gap:.6rem;opacity:.65}
.sa-hero-tag::before{content:'';width:18px;height:1px;background:currentColor;display:block}
.sa-hero-h1{font-family:'Fraunces',serif;font-size:clamp(2.8rem,10vw,4rem);font-weight:700;line-height:.93;letter-spacing:-.04em;color:var(--ink,#0D1B2A);margin-bottom:1.8rem}
.sa-hero-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--navy,#0B2341);color:#fff;border:none;height:52px;padding:0 2rem;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;letter-spacing:.08em;text-transform:uppercase}
@media(min-width:900px){
  .sa-hero{flex-direction:row;min-height:100vh;align-items:stretch}
  .sa-hero-photo{flex:1;height:auto;min-height:0;order:2;margin-top:0}
  .sa-hero-body{flex:0 0 40%;order:1;margin-top:0;padding:0 5% 0 7%;display:flex;flex-direction:column;justify-content:center}
  .sa-hero-tag{color:rgba(100,116,139,.7)}
  .sa-hero-h1{font-size:clamp(2.6rem,3.4vw,4rem)}
}

/* surgical-record */
.sa-record{padding:5rem 7%;border-bottom:1px solid var(--bo,#E5E7EB)}
.sa-record-grid{display:grid;grid-template-columns:1fr;gap:3rem}
.sa-record-row{display:grid;grid-template-columns:110px 1fr;border-bottom:.5px solid var(--bo,#E5E7EB);padding:.85rem 0}
.sa-record-row:last-child{border-bottom:none}
.sa-record-key{font-family:ui-monospace,'SF Mono',monospace;font-size:.56rem;color:var(--mu,#6B7280);text-transform:uppercase;letter-spacing:.06em;padding-top:.18rem}
.sa-record-val{font-size:.88rem;color:var(--ink,#0D1B2A);line-height:1.6}
.sa-record-bio{font-size:.86rem;color:var(--mu,#6B7280);line-height:1.85;padding-top:.25rem}
@media(min-width:900px){.sa-record-grid{grid-template-columns:1fr 1fr;gap:5rem}.sa-record{padding:6rem 7%}}

/* procedure-index — full-bleed navy */
.sa-proc{background:var(--navy,#0B2341);padding:5rem 7%}
.sa-proc-over{font-size:.52rem;font-weight:700;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.2em;margin-bottom:2.5rem}
.sa-proc-h2{font-family:'Fraunces',serif;font-size:clamp(1.5rem,3.5vw,2.1rem);font-weight:600;color:#fff;line-height:1.08;letter-spacing:-.025em;margin-bottom:2.5rem}
.sa-proc-table{width:100%;border-collapse:collapse}
.sa-proc-thead th{font-family:ui-monospace,'SF Mono',monospace;font-size:.52rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.1em;padding:.5rem 0;border-bottom:.5px solid rgba(255,255,255,.1);text-align:left}
.sa-proc-thead th:not(:first-child){padding-left:1.5rem}
.sa-proc-tr{border-bottom:.5px solid rgba(255,255,255,.07)}
.sa-proc-tr:last-child{border-bottom:none}
.sa-proc-tr td{padding:1.1rem 0;vertical-align:top}
.sa-proc-name{font-size:.9rem;font-weight:600;color:#fff}
.sa-proc-rec{font-family:ui-monospace,'SF Mono',monospace;font-size:.68rem;color:rgba(255,255,255,.45);padding-left:1.5rem;padding-top:.12rem}
.sa-proc-tech{font-size:.7rem;color:rgba(255,255,255,.32);padding-left:1.5rem;padding-top:.12rem}
@media(max-width:599px){.sa-proc-thead{display:none}.sa-proc-tr{display:flex;flex-direction:column;padding:1.2rem 0}.sa-proc-tr td{padding:0}.sa-proc-rec,.sa-proc-tech{padding-left:0;padding-top:.25rem}}
@media(min-width:900px){.sa-proc{padding:7rem 7%}}

/* caso-clinico */
.sa-case{padding:5rem 0;border-bottom:1px solid var(--bo,#E5E7EB)}
.sa-case-inner{padding:0 7%;display:grid;grid-template-columns:1fr;gap:2.5rem}
.sa-case-fig{position:relative;background:#080f18;overflow:hidden;aspect-ratio:4/3}
.sa-case-img{width:100%;height:100%;object-fit:cover;filter:grayscale(100%) contrast(1.12);opacity:.55;display:block}
.sa-case-ov{position:absolute;inset:0;padding:1.2rem;display:flex;flex-direction:column;justify-content:flex-end;gap:.28rem}
.sa-case-dr{font-family:ui-monospace,'SF Mono',monospace;font-size:.55rem;color:rgba(255,255,255,.45);letter-spacing:.06em;display:flex;gap:.7rem}
.sa-case-dk{color:rgba(255,255,255,.22)}
.sa-case-side{display:flex;flex-direction:column;justify-content:center;gap:1.4rem}
.sa-case-over{font-size:.52rem;font-weight:700;color:var(--navy,#0B2341);text-transform:uppercase;letter-spacing:.2em;opacity:.65}
.sa-case-h3{font-family:'Fraunces',serif;font-size:clamp(1.3rem,3vw,1.8rem);font-weight:600;color:var(--ink,#0D1B2A);line-height:1.12;letter-spacing:-.02em}
.sa-case-body{font-size:.84rem;color:var(--mu,#6B7280);line-height:1.88}
.sa-case-ref{font-family:ui-monospace,'SF Mono',monospace;font-size:.58rem;color:var(--mu,#6B7280);opacity:.4}
@media(min-width:900px){.sa-case-inner{grid-template-columns:1fr 1fr;gap:5rem;align-items:center}.sa-case{padding:6rem 0}.sa-case-fig{aspect-ratio:3/4}}

/* booking-minimal */
.sa-cta{padding:6rem 7% calc(7rem + env(safe-area-inset-bottom))}
.sa-cta-h2{font-family:'Fraunces',serif;font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;line-height:1.05;color:var(--ink,#0D1B2A);letter-spacing:-.03em;margin-bottom:.8rem}
.sa-cta-sub{font-size:.86rem;color:var(--mu,#6B7280);line-height:1.78;margin-bottom:2.2rem;max-width:400px}
.sa-cta-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--navy,#0B2341);color:#fff;border:none;height:54px;padding:0 2.2rem;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;letter-spacing:.08em;text-transform:uppercase}

/* ─────────────────────────────────────────
   PERFORMANCE ATHLETIC modules
   Prefijo .pa-
───────────────────────────────────────── */

/* hero-split-bold */
.pa-hero{display:flex;flex-direction:column;min-height:100svh;background:#fff}
.pa-hero-photo{height:58svh;min-height:320px;position:relative;overflow:hidden}
.pa-hero-photo img{width:100%;height:100%;object-fit:cover;object-position:center 8%;display:block}
.pa-hero-body{padding:2.5rem 6% calc(1.5rem + env(safe-area-inset-bottom));background:#fff}
.pa-hero-tag{font-size:.55rem;font-weight:700;color:var(--mu,#6B7280);text-transform:uppercase;letter-spacing:.25em;margin-bottom:1.2rem;display:inline-flex;align-items:center;gap:.5rem}
.pa-hero-h1{font-family:'Fraunces',serif;font-size:clamp(3rem,11vw,8.5rem);font-weight:900;line-height:.85;letter-spacing:-.07em;color:var(--ink,#0D1B2A);margin-bottom:1.4rem}
.pa-hero-h1 em{color:var(--p,#0E3B99);font-style:normal;display:block}
.pa-hero-actions{display:flex;gap:.6rem;flex-wrap:wrap}
.pa-hero-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--p,#0E3B99);color:#fff;border:none;height:54px;padding:0 1.8rem;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
.pa-hero-wa{display:inline-flex;align-items:center;gap:.5rem;height:54px;padding:0 1.4rem;border-radius:50px;border:1.5px solid var(--bo,#E5E7EB);color:var(--ink,#0D1B2A);font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:500;cursor:pointer;text-decoration:none;background:#fff}
.pa-hero-accent{height:4px;background:var(--p,#0E3B99);margin-top:2rem}
@media(min-width:900px){
  .pa-hero{flex-direction:row;align-items:stretch}
  .pa-hero-photo{flex:1;height:auto;min-height:0;order:2}
  .pa-hero-body{flex:0 0 50%;order:1;padding:0 5% 0 7%;display:flex;flex-direction:column;justify-content:center}
  .pa-hero-h1{font-size:clamp(3rem,6.5vw,8.5rem)}
  .pa-hero-accent{display:none}
}

/* recovery-metrics */
.pa-metrics{display:flex;flex-direction:column;border-bottom:1px solid var(--bo,#E5E7EB)}
.pa-metric{padding:2rem 6%;border-bottom:1px solid var(--bo,#E5E7EB);display:flex;align-items:baseline;gap:1rem}
.pa-metric:last-child{border-bottom:none}
.pa-metric-n{font-family:'Fraunces',serif;font-size:3rem;font-weight:700;color:var(--p,#0E3B99);line-height:1;letter-spacing:-.05em;flex-shrink:0}
.pa-metric-l{font-size:.78rem;color:var(--mu,#6B7280);line-height:1.4}
@media(min-width:600px){.pa-metrics{flex-direction:row}.pa-metric{flex:1;border-bottom:none;border-right:1px solid var(--bo,#E5E7EB);flex-direction:column;gap:.4rem}.pa-metric:last-child{border-right:none}.pa-metric-n{font-size:2.6rem}}

/* specialties-grid */
.pa-specs{padding:4rem 6%;background:var(--s,#EEF3FF);border-bottom:1px solid var(--bo,#E5E7EB)}
.pa-specs-h2{font-family:'Fraunces',serif;font-size:clamp(1.5rem,3.5vw,2.2rem);font-weight:900;line-height:.9;letter-spacing:-.05em;color:var(--ink,#0D1B2A);margin-bottom:2rem}
.pa-specs-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.pa-spec-card{background:#fff;border-radius:20px;padding:1.4rem 1.2rem;border:1px solid var(--bo,#E5E7EB);transition:transform .2s,box-shadow .2s}
.pa-spec-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.08)}
.pa-spec-icon{font-size:1.3rem;margin-bottom:.6rem}
.pa-spec-name{font-size:.88rem;font-weight:700;color:var(--ink,#0D1B2A);margin-bottom:.2rem}
.pa-spec-desc{font-size:.72rem;color:var(--mu,#6B7280);line-height:1.5}
@media(min-width:700px){.pa-specs-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:900px){.pa-specs{padding:5rem 7%}.pa-specs-grid{grid-template-columns:repeat(4,1fr)}}

/* booking-cta-strong */
.pa-cta{padding:5rem 6% calc(7rem + env(safe-area-inset-bottom));background:var(--s,#EEF3FF)}
.pa-cta-h2{font-family:'Fraunces',serif;font-size:clamp(1.8rem,5vw,3rem);font-weight:900;line-height:.9;letter-spacing:-.06em;color:var(--ink,#0D1B2A);margin-bottom:.8rem}
.pa-cta-h2 em{color:var(--p,#0E3B99);font-style:normal}
.pa-cta-sub{font-size:.88rem;color:var(--mu,#6B7280);line-height:1.7;margin-bottom:2rem;max-width:380px}
.pa-cta-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--p,#0E3B99);color:#fff;border:none;height:56px;padding:0 2rem;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}

/* ─────────────────────────────────────────
   SOFT CLINICAL LUXURY modules
   Prefijo .sl-
───────────────────────────────────────── */

/* hero-soft-card */
.sl-hero{display:flex;flex-direction:column;background:var(--bg,#FAF8FC);min-height:100svh}
.sl-hero-photo{padding:80px 6% 0;position:relative}
.sl-hero-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center 10%;border-radius:24px;display:block;box-shadow:0 20px 60px rgba(0,0,0,.1)}
.sl-hero-body{padding:2rem 6% calc(1.5rem + env(safe-area-inset-bottom))}
.sl-hero-tag{font-size:.55rem;font-weight:600;color:var(--p,#A78BC7);text-transform:uppercase;letter-spacing:.22em;margin-bottom:1rem;display:inline-flex;align-items:center;gap:.5rem}
.sl-hero-tag::before{content:'';width:16px;height:1px;background:currentColor;display:block;opacity:.5}
.sl-hero-h1{font-family:'Fraunces',serif;font-size:clamp(2rem,8vw,4.8rem);font-weight:700;line-height:1.04;letter-spacing:-.025em;color:var(--ink,#2B2430);margin-bottom:1rem}
.sl-hero-h1 em{display:block;font-style:italic;font-weight:300;color:var(--p,#A78BC7)}
.sl-hero-sub{font-size:.92rem;color:var(--mu,#7C6D8A);line-height:1.82;margin-bottom:1.6rem;font-weight:300;max-width:360px}
.sl-hero-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--p,#A78BC7);color:#fff;border:none;height:52px;padding:0 2rem;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;cursor:pointer;width:100%;max-width:280px}
@media(min-width:900px){
  .sl-hero{flex-direction:row;align-items:center;min-height:100vh;gap:0}
  .sl-hero-photo{flex:1;padding:100px 5% 80px 5%;order:2}
  .sl-hero-photo img{aspect-ratio:auto;height:75vh;border-radius:40px;box-shadow:0 32px 80px rgba(0,0,0,.12)}
  .sl-hero-body{flex:0 0 44%;order:1;padding:0 5% 0 7%}
  .sl-hero-h1{font-size:clamp(2rem,4vw,4.8rem)}
  .sl-hero-btn{width:auto}
}

/* trust-convictions */
.sl-trust{padding:5rem 7%;border-bottom:1px solid var(--bo,#E9E0F0);text-align:center}
.sl-trust-over{font-size:.52rem;font-weight:700;color:var(--p,#A78BC7);text-transform:uppercase;letter-spacing:.2em;margin-bottom:2rem;opacity:.75}
.sl-trust-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;max-width:680px;margin:0 auto}
.sl-trust-item{padding:2rem;border:1px solid var(--bo,#E9E0F0)}
.sl-trust-quote{font-family:'Fraunces',serif;font-size:1.05rem;font-style:italic;font-weight:300;color:var(--ink,#2B2430);line-height:1.65}
.sl-trust-attr{font-size:.68rem;color:var(--mu,#7C6D8A);margin-top:.8rem;letter-spacing:.04em}
@media(min-width:900px){.sl-trust-grid{grid-template-columns:repeat(3,1fr)}.sl-trust{padding:6rem 7%}}

/* booking-delicate */
.sl-cta{padding:5rem 7% calc(7rem + env(safe-area-inset-bottom));text-align:center}
.sl-cta-h2{font-family:'Fraunces',serif;font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:700;font-style:italic;color:var(--ink,#2B2430);line-height:1.08;margin-bottom:.8rem;letter-spacing:-.02em}
.sl-cta-sub{font-size:.88rem;color:var(--mu,#7C6D8A);line-height:1.82;margin-bottom:2rem;font-weight:300;max-width:360px;margin-left:auto;margin-right:auto}
.sl-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;background:var(--p,#A78BC7);color:#fff;border:none;height:52px;padding:0 2rem;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;cursor:pointer}

/* ─────────────────────────────────────────
   WARM HUMAN CARE modules
   Prefijo .wh-
───────────────────────────────────────── */

/* hero-warm-split */
.wh-hero{display:flex;flex-direction:column;background:var(--bg,#FFFBF5);min-height:100svh}
.wh-hero-photo{height:55svh;min-height:300px;position:relative;overflow:hidden}
.wh-hero-photo img{width:100%;height:100%;object-fit:cover;object-position:center 12%;display:block}
.wh-hero-body{padding:2rem 6% calc(1.5rem + env(safe-area-inset-bottom));background:var(--bg,#FFFBF5)}
.wh-hero-tag{font-size:.6rem;color:var(--p,#C2410C);font-weight:600;margin-bottom:.9rem;display:inline-flex;align-items:center;gap:.4rem}
.wh-hero-dot{width:6px;height:6px;border-radius:50%;background:var(--p,#C2410C);display:inline-block}
.wh-hero-h1{font-family:'Fraunces',serif;font-size:clamp(1.9rem,8vw,3.8rem);font-weight:700;line-height:1.05;letter-spacing:-.02em;color:var(--ink,#1C0A00);margin-bottom:1rem}
.wh-hero-h1 em{display:block;font-style:italic;font-weight:400;color:var(--p,#C2410C)}
.wh-hero-sub{font-size:.9rem;color:var(--mu,#92400E);line-height:1.75;margin-bottom:1.5rem;max-width:320px}
.wh-hero-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;background:var(--p,#C2410C);color:#fff;border:none;height:52px;padding:0 1.8rem;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;cursor:pointer;width:100%;max-width:260px}
@media(min-width:900px){
  .wh-hero{flex-direction:row;align-items:stretch}
  .wh-hero-photo{flex:0 0 62%;height:auto;min-height:0;order:2}
  .wh-hero-body{flex:0 0 38%;order:1;padding:0 4% 0 6%;display:flex;flex-direction:column;justify-content:center}
  .wh-hero-h1{font-size:clamp(1.9rem,3.5vw,3.8rem)}
  .wh-hero-btn{width:auto}
}

/* first-visit-steps — sección signature de warm human */
.wh-steps{padding:4rem 6%;background:var(--s,#FFF7ED);border-bottom:1px solid var(--bo,#FED7AA)}
.wh-steps-over{font-size:.58rem;font-weight:700;color:var(--p,#C2410C);text-transform:uppercase;letter-spacing:.16em;margin-bottom:.5rem;opacity:.75}
.wh-steps-h2{font-family:'Fraunces',serif;font-size:clamp(1.5rem,4vw,2rem);font-weight:700;color:var(--ink,#1C0A00);line-height:1.1;letter-spacing:-.02em;margin-bottom:2rem}
.wh-steps-list{display:flex;flex-direction:column;gap:1.4rem}
.wh-step{display:grid;grid-template-columns:40px 1fr;gap:1rem;align-items:flex-start}
.wh-step-n{width:40px;height:40px;border-radius:50%;background:var(--p,#C2410C);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:1rem;font-weight:700;flex-shrink:0}
.wh-step-title{font-size:.92rem;font-weight:700;color:var(--ink,#1C0A00);margin-bottom:.25rem}
.wh-step-desc{font-size:.8rem;color:var(--mu,#92400E);line-height:1.65}
@media(min-width:700px){.wh-steps-list{flex-direction:row}.wh-step{grid-template-columns:1fr;grid-template-rows:40px auto}.wh-step-n{margin-bottom:.5rem}}
@media(min-width:900px){.wh-steps{padding:5rem 7%}}

/* testimonials — solo warm human */
.wh-testi{padding:4rem 6%;border-bottom:1px solid var(--bo,#FED7AA)}
.wh-testi-over{font-size:.58rem;font-weight:700;color:var(--p,#C2410C);text-transform:uppercase;letter-spacing:.16em;margin-bottom:.5rem;opacity:.75}
.wh-testi-h2{font-family:'Fraunces',serif;font-size:clamp(1.4rem,3.5vw,2rem);font-weight:700;color:var(--ink,#1C0A00);letter-spacing:-.02em;margin-bottom:1.8rem}
.wh-testi-grid{display:flex;flex-direction:column;gap:1rem}
.wh-testi-card{background:var(--s,#FFF7ED);border:1px solid var(--bo,#FED7AA);border-radius:16px;padding:1.4rem}
.wh-testi-text{font-size:.88rem;color:var(--ink,#1C0A00);line-height:1.75;margin-bottom:1rem;font-style:italic}
.wh-testi-author{font-size:.72rem;font-weight:700;color:var(--mu,#92400E)}
@media(min-width:700px){.wh-testi-grid{flex-direction:row}}
@media(min-width:900px){.wh-testi{padding:5rem 7%}}

/* booking-warm */
.wh-cta{padding:4rem 6% calc(7rem + env(safe-area-inset-bottom))}
.wh-cta-h2{font-family:'Fraunces',serif;font-size:clamp(1.6rem,4vw,2.3rem);font-weight:700;color:var(--ink,#1C0A00);line-height:1.08;letter-spacing:-.02em;margin-bottom:.7rem}
.wh-cta-h2 em{font-style:italic;font-weight:400;color:var(--p,#C2410C)}
.wh-cta-sub{font-size:.88rem;color:var(--mu,#92400E);line-height:1.75;margin-bottom:1.8rem;max-width:360px}
.wh-cta-actions{display:flex;flex-direction:column;gap:.6rem;max-width:280px}
.wh-cta-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;background:var(--p,#C2410C);color:#fff;border:none;height:52px;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;cursor:pointer}
.wh-cta-wa{display:flex;align-items:center;justify-content:center;gap:.5rem;height:48px;border-radius:50px;border:1.5px solid var(--bo,#FED7AA);color:var(--p,#C2410C);font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;text-decoration:none;background:transparent}

/* ─────────────────────────────────────────
   SHARED modules
───────────────────────────────────────── */
.shared-sedes{padding:3.5rem 7%;border-bottom:1px solid var(--bo,#E5E7EB)}
.shared-sedes-over{font-size:.52rem;font-weight:700;color:var(--p,#0B2341);text-transform:uppercase;letter-spacing:.2em;margin-bottom:1.8rem;opacity:.6}
.shared-sede-item{padding:1.1rem 0;border-bottom:.5px solid var(--bo,#E5E7EB)}
.shared-sede-item:last-child{border-bottom:none}
.shared-sede-name{font-size:.88rem;font-weight:700;color:var(--ink,#0D1B2A);margin-bottom:.2rem}
.shared-sede-addr{font-size:.76rem;color:var(--mu,#6B7280);line-height:1.5}
.shared-sede-map{font-size:.68rem;color:var(--p,#0B2341);font-weight:600;text-decoration:none;display:inline-block;margin-top:.3rem;letter-spacing:.02em}
`;

// ── INYECTAR CSS UNA VEZ ────────────────────────────────────────────
(function() {
  if (document.getElementById('module-registry-css')) return;
  var style = document.createElement('style');
  style.id = 'module-registry-css';
  style.textContent = MODULE_CSS;
  document.head.appendChild(style);
})();

// ── MODULE RENDERERS ─────────────────────────────────────────────────
// Cada función recibe (sectionConfig, wc, doctor, locs) y devuelve HTML string.

var _mr = {}; // alias interno

/** Helpers compartidos */
function _e(v) { return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _wa(m) {
  if (!m.whatsapp_activo || !m.whatsapp) return null;
  return 'https://wa.me/' + m.whatsapp.replace(/\D/g,'');
}
function _nombre(m) { return (m.titulo||'Dr.')+' '+m.nombre+' '+m.apellido; }

// ── SURGICAL AUTHORITY ────────────────────────────────────────────────

_mr['hero-editorial'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var tagText = (esp+(m.ciudad?' · '+m.ciudad:'')).toUpperCase();
  var hl = wc.headline || nombre;

  return '<section class="sa-hero" id="inicio">'
    + '<div class="sa-hero-photo">'
    + (photo ? '<img src="'+_e(photo)+'" alt="'+_e(nombre)+'">' : '<div style="height:100%;background:var(--navy,#0B2341)"></div>')
    + '</div>'
    + '<div class="sa-hero-body">'
    + '<div class="sa-hero-tag">'+_e(tagText)+'</div>'
    + '<h1 class="sa-hero-h1">'+_e(hl)+'</h1>'
    + '<button class="sa-hero-btn" onclick="abrirBooking()">Agendar consulta</button>'
    + '</div>'
    + '</section>';
};

_mr['surgical-record'] = function(sc, wc, m, locs) {
  var esp = (m.especialidades||[])[0]||'';
  var bio = wc.about_text || wc.doctor_story || m.bio || '';
  var rows = [
    {k:'ESPECIALIDAD', v: esp},
    {k:'FORMACIÓN',    v: wc.formacion || m.universidad || null},
    {k:'REGISTRO',     v: m.senescyt ? 'SENESCYT '+m.senescyt : null},
    {k:'SEDE',         v: locs && locs[0] ? locs[0].nombre+(locs[0].ciudad?' — '+locs[0].ciudad:'') : null},
    {k:'ATENCIÓN',     v: m.dias_atencion && m.dias_atencion.length
        ? m.dias_atencion.slice(0,5).join(' · ')+' · '+(m.horario_desde||'07:00')+'–'+(m.horario_hasta||'20:00')
        : null}
  ].filter(function(r){ return r.v; });

  var rowsHtml = rows.map(function(r) {
    return '<div class="sa-record-row">'
      + '<span class="sa-record-key">'+r.k+'</span>'
      + '<span class="sa-record-val">'+_e(r.v)+'</span>'
      + '</div>';
  }).join('');

  return '<section class="sa-record">'
    + '<div class="sa-record-grid">'
    + '<div>'+rowsHtml+'</div>'
    + (bio ? '<div><p class="sa-record-bio">'+_e(bio)+'</p></div>' : '<div></div>')
    + '</div>'
    + '</section>';
};

_mr['procedure-index'] = function(sc, wc, m, locs) {
  var esp = (m.especialidades||[])[0]||'';
  var procs = wc.services && wc.services.length ? wc.services : _defaultProcs(esp);

  var rowsHtml = procs.slice(0,6).map(function(p) {
    return '<tr class="sa-proc-tr">'
      + '<td class="sa-proc-name">'+_e(p.t||p.titulo||p.name||'Procedimiento')+'</td>'
      + '<td class="sa-proc-rec">'+_e(p.rec||p.recuperacion||'Personalizada')+'</td>'
      + '<td class="sa-proc-tech">'+_e(p.tech||p.tecnica||p.d||'')+'</td>'
      + '</tr>';
  }).join('');

  return '<section class="sa-proc" id="servicios">'
    + '<div class="sa-proc-over">Índice de procedimientos</div>'
    + '<h2 class="sa-proc-h2">Procedimientos &amp; técnicas</h2>'
    + '<table class="sa-proc-table">'
    + '<thead class="sa-proc-thead"><tr><th>Procedimiento</th><th>Recuperación</th><th>Técnica</th></tr></thead>'
    + '<tbody>'+rowsHtml+'</tbody>'
    + '</table>'
    + '</section>';
};

_mr['caso-clinico'] = function(sc, wc, m, locs) {
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var esp = (m.especialidades||[])[0]||'';
  var caso = _defaultCaso(esp);
  var dataHtml = caso.data.map(function(d) {
    return '<div class="sa-case-dr"><span class="sa-case-dk">'+d.k+'</span><span>'+d.v+'</span></div>';
  }).join('');

  return '<section class="sa-case" id="caso">'
    + '<div class="sa-case-inner">'
    + '<figure class="sa-case-fig">'
    + (photo ? '<img class="sa-case-img" src="'+_e(photo)+'" alt="">' : '')
    + '<div class="sa-case-ov">'+dataHtml+'</div>'
    + '</figure>'
    + '<aside class="sa-case-side">'
    + '<div class="sa-case-over">Caso clínico</div>'
    + '<h3 class="sa-case-h3">'+_e(caso.title)+'</h3>'
    + '<p class="sa-case-body">'+_e(caso.body)+'</p>'
    + '</aside>'
    + '</div>'
    + '</section>';
};

_mr['booking-minimal'] = function(sc, wc, m, locs) {
  var h2 = wc.cta_final || 'Agendá tu consulta';
  var sub = wc.patient_experience || 'Diagnóstico preciso y atención de excelencia.';
  return '<section class="sa-cta" id="contacto">'
    + '<h2 class="sa-cta-h2">'+_e(h2)+'</h2>'
    + '<p class="sa-cta-sub">'+_e(sub)+'</p>'
    + '<button class="sa-cta-btn" onclick="abrirBooking()">Agendar consulta</button>'
    + '</section>';
};

// ── PERFORMANCE ATHLETIC ──────────────────────────────────────────────

_mr['hero-split-bold'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var hl = wc.headline || nombre;
  var parts = hl.split(' ');
  var line1 = parts.slice(0, Math.ceil(parts.length/2)).join(' ');
  var line2 = parts.slice(Math.ceil(parts.length/2)).join(' ');
  var wa = _wa(m);
  var tag = (esp+(m.ciudad?' · '+m.ciudad:'')).toUpperCase();

  return '<section class="pa-hero" id="inicio">'
    + '<div class="pa-hero-photo">'
    + (photo ? '<img src="'+_e(photo)+'" alt="'+_e(nombre)+'">' : '<div style="height:100%;background:#eef3ff"></div>')
    + '</div>'
    + '<div class="pa-hero-body">'
    + '<div class="pa-hero-tag">'+_e(tag)+'</div>'
    + '<h1 class="pa-hero-h1">'+_e(line1)+'<em>'+_e(line2)+'</em></h1>'
    + '<div class="pa-hero-actions">'
    + '<button class="pa-hero-btn" onclick="abrirBooking()">Agendar cita</button>'
    + (wa ? '<a class="pa-hero-wa" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>' : '')
    + '</div>'
    + '<div class="pa-hero-accent"></div>'
    + '</div>'
    + '</section>';
};

_mr['recovery-metrics'] = function(sc, wc, m, locs) {
  var anos = m.anos_experiencia;
  var esp = (m.especialidades||[])[0]||'';
  var metrics = [
    {n: anos ? anos+'+' : '10+', l: 'años de experiencia'},
    {n: '100%',                   l: 'atención personalizada'},
    {n: '24h',                    l: 'respuesta WhatsApp'},
    {n: '1era',                   l: 'consulta de evaluación'}
  ];
  return '<div class="pa-metrics">'
    + metrics.map(function(mt) {
      return '<div class="pa-metric"><div class="pa-metric-n">'+mt.n+'</div><div class="pa-metric-l">'+mt.l+'</div></div>';
    }).join('')
    + '</div>';
};

_mr['specialties-grid'] = function(sc, wc, m, locs) {
  var esp = (m.especialidades||[])[0]||'';
  var srvs = wc.services && wc.services.length ? wc.services : _defaultSrvs(esp);
  var icons = ['🦴','⚡','🔬','🏃','💪','🎯'];
  return '<section class="pa-specs" id="servicios">'
    + '<h2 class="pa-specs-h2">Especialidades</h2>'
    + '<div class="pa-specs-grid">'
    + srvs.slice(0,6).map(function(s,i) {
      return '<div class="pa-spec-card">'
        + '<div class="pa-spec-icon">'+icons[i%icons.length]+'</div>'
        + '<div class="pa-spec-name">'+_e(s.t||s.titulo||s.name||'Especialidad')+'</div>'
        + (s.d||s.descripcion ? '<div class="pa-spec-desc">'+_e(s.d||s.descripcion)+'</div>' : '')
        + '</div>';
    }).join('')
    + '</div>'
    + '</section>';
};

_mr['recovery-philosophy'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var bio = wc.about_text || wc.doctor_story || m.bio || '';
  var q = wc.philosophy || wc.sobre_quote || '"Recuperar el movimiento es recuperar la vida."';
  return '<section style="padding:4rem 6%;background:var(--s,#EEF3FF);border-bottom:1px solid var(--bo,#DBEAFE)" id="filosofia">'
    + '<div style="display:grid;grid-template-columns:1fr;gap:2.5rem;max-width:1000px;margin:0 auto">'
    + (photo ? '<div style="aspect-ratio:16/9;overflow:hidden;border-radius:16px"><img src="'+_e(photo)+'" alt="'+_e(nombre)+'" style="width:100%;height:100%;object-fit:cover;object-position:center 15%"></div>' : '')
    + '<div style="display:flex;flex-direction:column;gap:1.2rem">'
    + '<p style="font-family:\'Fraunces\',serif;font-size:clamp(1.2rem,3vw,1.6rem);font-style:italic;font-weight:400;color:var(--ink,#0D1B2A);line-height:1.5;border-left:3px solid var(--p,#0E3B99);padding-left:1rem">'+_e(q)+'</p>'
    + (bio ? '<p style="font-size:.88rem;color:var(--mu,#4B5563);line-height:1.82">'+_e(bio.slice(0,280)+(bio.length>280?'…':''))+'</p>' : '')
    + '</div>'
    + '</div>'
    + '</section>';
};

_mr['about-performance'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var bio = wc.about_text || wc.doctor_story || m.bio || ('Especialista en '+esp+' con sólida trayectoria clínica y deportiva.');
  var diffs = wc.differentiators || [];
  if (!diffs.length && m.anos_experiencia) diffs.push(m.anos_experiencia+' años de experiencia clínica');
  if (!diffs.length && esp) diffs.push('Especialista en '+esp);
  return '<section style="padding:4rem 6%;border-bottom:1px solid var(--bo,#DBEAFE)" id="sobre-mi">'
    + '<div style="display:grid;grid-template-columns:1fr;gap:2rem;max-width:900px;margin:0 auto">'
    + (photo ? '<img src="'+_e(photo)+'" alt="'+_e(nombre)+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center 10%;border-radius:16px">' : '')
    + '<div>'
    + '<div style="font-size:.55rem;font-weight:700;color:var(--p,#0E3B99);text-transform:uppercase;letter-spacing:.2em;margin-bottom:.5rem;opacity:.7">El especialista</div>'
    + '<h2 style="font-family:\'Fraunces\',serif;font-size:clamp(1.5rem,4vw,2rem);font-weight:900;color:var(--ink,#0D1B2A);line-height:.9;letter-spacing:-.06em;margin-bottom:1rem">'+_e(nombre)+'</h2>'
    + '<p style="font-size:.88rem;color:var(--mu,#4B5563);line-height:1.82;margin-bottom:1.2rem">'+_e(bio)+'</p>'
    + diffs.slice(0,4).map(function(d){return'<div style="display:flex;align-items:center;gap:.5rem;font-size:.82rem;color:var(--ink,#0D1B2A);margin-bottom:.35rem"><span style="color:var(--p,#0E3B99);font-weight:700">✓</span>'+_e(d)+'</div>';}).join('')
    + '</div>'
    + '</div>'
    + '</section>';
};

_mr['booking-cta-strong'] = function(sc, wc, m, locs) {
  var h2 = wc.cta_final || 'Recuperate hoy';
  var sub = wc.patient_experience || 'Diagnóstico especializado y plan de recuperación personalizado.';
  return '<section class="pa-cta" id="contacto">'
    + '<h2 class="pa-cta-h2"><em>'+_e(h2)+'</em></h2>'
    + '<p class="pa-cta-sub">'+_e(sub)+'</p>'
    + '<button class="pa-cta-btn" onclick="abrirBooking()">Agendar cita</button>'
    + '</section>';
};

// ── SOFT CLINICAL LUXURY ──────────────────────────────────────────────

_mr['hero-soft-card'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var hl = wc.headline || nombre;
  var sub = wc.subheadline || esp;
  var parts = hl.split(',');
  var h1main = (parts[0]||hl).trim();
  var h1em = (parts[1]||'').trim();
  var tag = esp.toUpperCase();

  return '<section class="sl-hero" id="inicio">'
    + '<div class="sl-hero-photo">'
    + (photo ? '<img src="'+_e(photo)+'" alt="'+_e(nombre)+'">' : '')
    + '</div>'
    + '<div class="sl-hero-body">'
    + '<div class="sl-hero-tag">'+_e(tag)+'</div>'
    + '<h1 class="sl-hero-h1">'+_e(h1main)+(h1em?'<em>'+_e(h1em)+'</em>':'')+'</h1>'
    + '<p class="sl-hero-sub">'+_e(sub)+'</p>'
    + '<button class="sl-hero-btn" onclick="abrirBooking()">Reservar consulta</button>'
    + '</div>'
    + '</section>';
};

_mr['trust-convictions'] = function(sc, wc, m, locs) {
  var diffs = wc.differentiators || [];
  var defaults = [
    '"Cada tratamiento es una experiencia diseñada para vos."',
    '"La precisión y el cuidado van de la mano en cada procedimiento."',
    '"Tu bienestar es el resultado que me importa."'
  ];
  var items = diffs.length >= 3 ? diffs.slice(0,3) : defaults;
  return '<section class="sl-trust" id="filosofia">'
    + '<div class="sl-trust-over">Filosofía</div>'
    + '<div class="sl-trust-grid">'
    + items.map(function(item) {
      return '<div class="sl-trust-item">'
        + '<p class="sl-trust-quote">'+_e(String(item).replace(/^"|"$/g,''))+'</p>'
        + '</div>';
    }).join('')
    + '</div>'
    + '</section>';
};

_mr['booking-delicate'] = function(sc, wc, m, locs) {
  var h2 = wc.cta_final || 'Reservá tu consulta';
  var sub = wc.patient_experience || 'Atención personalizada en un espacio diseñado para tu bienestar.';
  return '<section class="sl-cta" id="contacto">'
    + '<h2 class="sl-cta-h2">'+_e(h2)+'</h2>'
    + '<p class="sl-cta-sub">'+_e(sub)+'</p>'
    + '<button class="sl-cta-btn" onclick="abrirBooking()">Reservar mi consulta</button>'
    + '</section>';
};

// ── WARM HUMAN CARE ───────────────────────────────────────────────────

_mr['hero-warm-split'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var esp = (m.especialidades||[])[0]||'';
  var photo = wc.doctor_photo_url || m.foto_url || '';
  var hl = wc.headline || nombre;
  var sub = wc.subheadline || 'Atención médica con calidez y dedicación.';
  var parts = hl.split(',');
  var h1main = (parts[0]||hl).trim();
  var h1em = (parts[1]||'').trim();
  var tag = esp+(m.ciudad?' · '+m.ciudad:'');

  return '<section class="wh-hero" id="inicio">'
    + '<div class="wh-hero-photo">'
    + (photo ? '<img src="'+_e(photo)+'" alt="'+_e(nombre)+'">' : '<div style="height:100%;background:var(--s,#FFF7ED)"></div>')
    + '</div>'
    + '<div class="wh-hero-body">'
    + '<div class="wh-hero-tag"><span class="wh-hero-dot"></span>'+_e(tag)+'</div>'
    + '<h1 class="wh-hero-h1">'+_e(h1main)+(h1em?'<em>'+_e(h1em)+'</em>':'')+'</h1>'
    + '<p class="wh-hero-sub">'+_e(sub)+'</p>'
    + '<button class="wh-hero-btn" onclick="abrirBooking()">Agendá tu consulta</button>'
    + '</div>'
    + '</section>';
};

_mr['first-visit-steps'] = function(sc, wc, m, locs) {
  var nombre = _nombre(m);
  var steps = [
    {n:'01', title:'Contanos tu caso', desc:'Completá el formulario de agendamiento. En minutos te confirmamos tu turno.'},
    {n:'02', title:'Tu primera consulta', desc:'El '+nombre+' escucha tu historia completa antes de cualquier diagnóstico.'},
    {n:'03', title:'Plan personalizado', desc:'Recibís un plan de tratamiento diseñado específicamente para vos.'}
  ];
  return '<section class="wh-steps" id="primera-consulta">'
    + '<div class="wh-steps-over">Cómo funciona</div>'
    + '<h2 class="wh-steps-h2">Cómo es tu primera consulta</h2>'
    + '<div class="wh-steps-list">'
    + steps.map(function(s) {
      return '<div class="wh-step">'
        + '<div class="wh-step-n">'+s.n+'</div>'
        + '<div><div class="wh-step-title">'+s.title+'</div><div class="wh-step-desc">'+s.desc+'</div></div>'
        + '</div>';
    }).join('')
    + '</div>'
    + '</section>';
};

_mr['testimonials'] = function(sc, wc, m, locs) {
  var testi = wc.testimonials || [];
  if (!testi.length) return '';
  return '<section class="wh-testi" id="testimonios">'
    + '<div class="wh-testi-over">Lo que dicen</div>'
    + '<h2 class="wh-testi-h2">Experiencias reales</h2>'
    + '<div class="wh-testi-grid">'
    + testi.slice(0,3).map(function(t) {
      return '<div class="wh-testi-card">'
        + '<p class="wh-testi-text">"'+_e(t.text||t.body||'')+ '"</p>'
        + '<div class="wh-testi-author">'+_e(t.name||t.autor||'Paciente')+'</div>'
        + '</div>';
    }).join('')
    + '</div>'
    + '</section>';
};

_mr['booking-warm'] = function(sc, wc, m, locs) {
  var h2 = wc.cta_final || 'Agendá tu consulta';
  var sub = wc.patient_experience || 'Atención cálida, personalizada y comprometida con tu bienestar.';
  var wa = _wa(m);
  return '<section class="wh-cta" id="contacto">'
    + '<h2 class="wh-cta-h2"><em>'+_e(h2)+'</em></h2>'
    + '<p class="wh-cta-sub">'+_e(sub)+'</p>'
    + '<div class="wh-cta-actions">'
    + '<button class="wh-cta-btn" onclick="abrirBooking()">Agendá tu consulta</button>'
    + (wa ? '<a class="wh-cta-wa" href="'+wa+'" target="_blank" rel="noopener">Escribinos por WhatsApp</a>' : '')
    + '</div>'
    + '</section>';
};

// ── SHARED ────────────────────────────────────────────────────────────

_mr['sedes'] = function(sc, wc, m, locs) {
  if (!locs || !locs.length) return '';
  return '<section class="shared-sedes" id="sedes">'
    + '<div class="shared-sedes-over">Dónde atendemos</div>'
    + locs.map(function(l) {
      return '<div class="shared-sede-item">'
        + '<div class="shared-sede-name">'+_e(l.nombre||'Consultorio')+'</div>'
        + '<div class="shared-sede-addr">'+_e(l.direccion||'')+(l.ciudad?', '+_e(l.ciudad):'')+'</div>'
        + (l.maps_url ? '<a class="shared-sede-map" href="'+_e(l.maps_url)+'" target="_blank" rel="noopener">Ver ubicación →</a>' : '')
        + '</div>';
    }).join('')
    + '</section>';
};

// ── FALLBACK DATA HELPERS ─────────────────────────────────────────────

function _defaultProcs(esp) {
  var e = (esp||'').toLowerCase();
  if (e.indexOf('traumat')>-1||e.indexOf('ortop')>-1) return [
    {t:'Artroscopía de rodilla',     rec:'4–6 semanas',  tech:'Mínimamente invasiva'},
    {t:'Ligamentoplastia LCA',       rec:'6–9 meses',    tech:'Aloinjerto'},
    {t:'Prótesis de cadera',         rec:'3–4 meses',    tech:'Abordaje anterolateral'},
    {t:'Fijación de fracturas',      rec:'8–12 semanas', tech:'Osteosíntesis interna'},
    {t:'Cirugía de hombro',          rec:'3–6 meses',    tech:'Artroscópica'}
  ];
  if (e.indexOf('neuro')>-1) return [
    {t:'Microcirugía de columna',    rec:'4–8 semanas',  tech:'Endoscópica'},
    {t:'Craneotomía descompresiva',  rec:'6–12 semanas', tech:'Navegación intraoperatoria'},
    {t:'Laminectomía lumbar',        rec:'4–6 semanas',  tech:'Mínimamente invasiva'},
    {t:'Cirugía de hernia discal',   rec:'3–5 semanas',  tech:'Microquirúrgica'},
    {t:'Estimulación cerebral',      rec:'Variable',     tech:'Estereotáxica'}
  ];
  return [
    {t:'Consulta especializada',   rec:'Inmediata',    tech:'Evaluación integral'},
    {t:'Diagnóstico por imágenes', rec:'1 semana',     tech:'RX / TAC / RMN'},
    {t:'Plan de tratamiento',      rec:'Personalizado',tech:'Basado en evidencia'},
    {t:'Seguimiento clínico',      rec:'Continuo',     tech:'Protocolos internacionales'}
  ];
}

function _defaultSrvs(esp) {
  return [
    {t:'Consulta integral',        d:'Evaluación clínica completa.'},
    {t:'Diagnóstico de precisión', d:'Estudios con tecnología avanzada.'},
    {t:'Plan de tratamiento',      d:'Protocolo personalizado.'},
    {t:'Seguimiento continuo',     d:'Acompañamiento en la recuperación.'}
  ];
}

function _defaultCaso(esp) {
  var e = (esp||'').toLowerCase();
  if (e.indexOf('traumat')>-1||e.indexOf('ortop')>-1) return {
    title: 'Rotura de LCA en deportista',
    body:  'Paciente de 28 años con rotura completa del ligamento cruzado anterior. Ligamentoplastia artroscópica con aloinjerto. Alta a las 48h. Retorno deportivo completo a los 7 meses.',
    data:  [{k:'DX',v:'Rotura LCA grado III'},{k:'TÉCNICA',v:'Ligamentoplastia artroscópica'},{k:'RESULTADO',v:'Retorno deportivo completo'}]
  };
  return {
    title: 'Diagnóstico y resolución clínica',
    body:  'Evaluación integral con protocolo diagnóstico de precisión. Tratamiento personalizado con seguimiento continuo hasta la recuperación completa.',
    data:  [{k:'EVALUACIÓN',v:'Clínica + imagen'},{k:'PLAN',v:'Personalizado'},{k:'SEGUIMIENTO',v:'Continuo'}]
  };
}

// ── MODULE REGISTRY — PÚBLICO ─────────────────────────────────────────

window.MODULE_RENDERERS = _mr;

/**
 * renderByPlan(compositionPlan, wc, doctor, locs, container)
 * Materializa el plan de composición en un contenedor DOM.
 * El renderer principal lo llama — no lo llama el HTML.
 */
window.renderByPlan = function(compositionPlan, wc, doctor, locs, container) {
  if (!container) { console.error('[Modules] No container element'); return; }
  container.innerHTML = '';

  compositionPlan.forEach(function(section) {
    var renderer = window.MODULE_RENDERERS[section.type];
    if (!renderer) {
      console.warn('[Modules] No renderer for type: ' + section.type);
      return;
    }
    var html = renderer(section.config || {}, wc, doctor, locs || []);
    if (html) container.insertAdjacentHTML('beforeend', html);
  });
};

/**
 * Verificar que todos los types del plan tienen renderer.
 */
window.validateModuleRegistry = function(compositionPlan) {
  var missing = compositionPlan.filter(function(s) {
    return !window.MODULE_RENDERERS[s.type];
  }).map(function(s) { return s.type; });

  if (missing.length) {
    console.warn('[Modules] Missing renderers for: ' + missing.join(', '));
    return false;
  }
  return true;
};
