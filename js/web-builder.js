/**
 * CitaDoc Website Builder — Editor vertical simple
 * Uso:  webBuilderOpen(slug, opts)
 *       webBuilderClose()
 *
 * opts = { sb, isAdmin, onSave, onDeploy, onClose }
 */
(function (window, document) {
  'use strict';

  /* ── State ─────────────────────────────────────────────────────────────── */
  var _slug = null, _opts = {}, _wsSettings = {}, _gallery = [],
      _photoUrl = null, _logoUrl = null, _isLive = false,
      _refreshTimer = null, _injected = false;

  var _WS_DEFAULTS = {
    show_whatsapp: true, show_booking: true, show_carousel: true,
    show_calculator: false, show_services: true, show_doctors: false,
    show_instagram: false, show_map: false, show_insurance: false,
    show_cta: true, hero_layout: 'split', services_layout: 'grid',
    navbar_style: 'transparent', dna: 'authority'
  };

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function _esc(v) {
    return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _el(id) { return document.getElementById(id); }
  function _sb()   { return _opts.sb; }

  /* ── CSS ────────────────────────────────────────────────────────────────── */
  var _CSS = [
    '#wbe-modal{display:none;position:fixed;inset:0;z-index:9000;background:#f4f6f8;flex-direction:column;font-family:"DM Sans",system-ui,sans-serif}',
    '#wbe-modal.open{display:flex}',
    '#wbe-topbar{background:#fff;border-bottom:1.5px solid #e5e7eb;padding:.65rem 1.25rem;display:flex;align-items:center;gap:.6rem;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
    '#wbe-body{flex:1;overflow-y:auto;padding:1.5rem 1.25rem 3rem}',
    '#wbe-body::-webkit-scrollbar{width:5px}#wbe-body::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}',
    '.wbe-form{max-width:680px;margin:0 auto;display:grid;gap:1.25rem}',
    '.wbe-card{background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;overflow:hidden}',
    '.wbe-card-hd{padding:.75rem 1.1rem;border-bottom:1px solid #f1f3f5;display:flex;align-items:center;gap:.5rem}',
    '.wbe-card-title{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:#374151}',
    '.wbe-card-body{padding:.9rem 1.1rem;display:grid;gap:.65rem}',
    '.wbe-inp{width:100%;padding:.58rem .78rem;border-radius:9px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:inherit;font-size:.85rem;outline:0;box-sizing:border-box;transition:border-color .15s}',
    '.wbe-inp:focus{border-color:#0b7c6e;box-shadow:0 0 0 3px rgba(11,124,110,.09)}',
    '.wbe-ta{width:100%;padding:.58rem .78rem;border-radius:9px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:inherit;font-size:.85rem;outline:0;box-sizing:border-box;resize:none;line-height:1.5;transition:border-color .15s}',
    '.wbe-ta:focus{border-color:#0b7c6e;box-shadow:0 0 0 3px rgba(11,124,110,.09)}',
    '.wbe-label{font-size:.67rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.3rem;display:block}',
    '.wbe-2col{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}',
    '.wbe-3col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem}',
    '.wbe-upload-btn{display:flex;align-items:center;gap:.6rem;padding:.6rem .85rem;border:1.5px dashed #d1d5db;border-radius:11px;cursor:pointer;background:#fafafa;transition:border-color .15s;width:100%;box-sizing:border-box}',
    '.wbe-upload-btn:hover{border-color:#0b7c6e}',
    '.wbe-upload-thumb{width:38px;height:38px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;overflow:hidden}',
    '.wbe-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:.55rem 0;border-bottom:1px solid #f3f4f6}',
    '.wbe-toggle-row:last-child{border-bottom:none}',
    '.wbe-sw{position:relative;width:40px;height:22px;flex-shrink:0}',
    '.wbe-sw input{opacity:0;width:0;height:0;position:absolute}',
    '.wbe-sw-track{position:absolute;inset:0;background:#d1d5db;border-radius:22px;cursor:pointer;transition:.2s}',
    '.wbe-sw-track:before{content:"";position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
    '.wbe-sw input:checked+.wbe-sw-track{background:#0b7c6e}',
    '.wbe-sw input:checked+.wbe-sw-track:before{transform:translateX(18px)}',
    '.wbe-lo-group{display:flex;gap:.4rem}',
    '.wbe-lo{flex:1;border:2px solid #e5e7eb;border-radius:10px;padding:.6rem .4rem;cursor:pointer;text-align:center;font-family:inherit;font-size:.7rem;color:#6b7280;font-weight:500;background:#fff;transition:all .15s}',
    '.wbe-lo:hover{border-color:#9ecfca}.wbe-lo.sel{border-color:#0b7c6e;background:#f0fdf8;color:#0b7c6e;font-weight:700}',
    '.wbe-svc-row{background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:10px;padding:.6rem .7rem;display:grid;gap:.35rem;position:relative}',
    '.wbe-score-bar{height:4px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:.25rem 0 .5rem}',
    '.wbe-score-fill{height:100%;border-radius:4px;transition:width .5s}',
    '.wbe-live-warn{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:8px;padding:.5rem .8rem;font-size:.74rem;color:#c2410c;font-weight:500;display:none;margin-bottom:.5rem}',
    '@media(max-width:640px){.wbe-2col,.wbe-3col{grid-template-columns:1fr!important}.wbe-form{gap:1rem}#wbe-body{padding:1rem .75rem 3rem}}'
  ].join('');

  /* ── HTML ───────────────────────────────────────────────────────────────── */
  function _HTML() {
    return '<div id="wbe-modal" aria-label="Editor de sitio web">'

    /* TOP BAR */
    + '<div id="wbe-topbar">'
    +   '<button onclick="_wbe.close()" style="padding:.35rem .7rem;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;color:#374151;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:.3rem;flex-shrink:0">← Volver</button>'
    +   '<code id="wbe-slug-lbl" style="font-size:.72rem;color:#9ca3af;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0"></code>'
    +   '<div id="wbe-status-badge" style="padding:.22rem .65rem;border-radius:20px;font-size:.68rem;font-weight:800;background:#fef3c7;color:#b45309;flex-shrink:0;white-space:nowrap">● Demo</div>'
    +   '<button onclick="_wbe.view()" style="padding:.35rem .75rem;border:1.5px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#374151;font-size:.76rem;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">Ver ↗</button>'
    +   '<button id="wbe-btn-deploy" onclick="_wbe.deploy()" style="padding:.35rem .8rem;border-radius:8px;background:#fef3c7;color:#b45309;font-size:.76rem;font-weight:700;cursor:pointer;border:1.5px solid #fde68a;font-family:inherit;flex-shrink:0">→ Deploy</button>'
    +   '<button id="wbe-btn-save" onclick="_wbe.save()" style="padding:.35rem .9rem;border-radius:8px;background:linear-gradient(135deg,#0b7c6e,#0e9d8c);color:#fff;font-size:.76rem;font-weight:700;cursor:pointer;border:none;font-family:inherit;flex-shrink:0">Guardar</button>'
    + '</div>'

    /* BODY */
    + '<div id="wbe-body">'
    + '<div class="wbe-form">'

    /* Live warning */
    + '<div id="wbe-live-warn" class="wbe-live-warn">⚡ Los cambios impactan inmediatamente tu sitio publicado.</div>'

    /* Score */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-body" style="padding:.75rem 1.1rem">'
    +     '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.78rem;font-weight:600;color:#374151">Completitud del perfil</span><span id="wbe-score-pct" style="font-size:.82rem;font-weight:800;color:#0b7c6e">0%</span></div>'
    +     '<div class="wbe-score-bar"><div id="wbe-score-fill" class="wbe-score-fill" style="width:0%;background:linear-gradient(90deg,#0b7c6e,#34d399)"></div></div>'
    +     '<div id="wbe-score-checks" style="display:flex;flex-wrap:wrap;gap:.2rem .3rem;font-size:.66rem"></div>'
    +   '</div>'
    + '</div>'

    /* ── IDENTIDAD ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd"><span style="font-size:1rem">🏥</span><span class="wbe-card-title">Identidad</span></div>'
    +   '<div class="wbe-card-body">'
    +     '<div><label class="wbe-label">Nombre del médico</label><input id="wbe-nombre" class="wbe-inp" placeholder="Dr. María González" oninput="_wbe.schedRefresh()"></div>'
    +     '<div class="wbe-2col">'
    +       '<div><label class="wbe-label">Especialidad</label><input id="wbe-especialidad" class="wbe-inp" placeholder="Cardiología" oninput="_wbe.schedRefresh()"></div>'
    +       '<div><label class="wbe-label">Ciudad</label><input id="wbe-ciudad" class="wbe-inp" placeholder="Ciudad" oninput="_wbe.schedRefresh()"></div>'
    +     '</div>'
    +     '<div class="wbe-2col">'
    +       '<div><label class="wbe-label">Foto del médico</label>'
    +         '<div class="wbe-upload-btn" onclick="document.getElementById(\'wbe-photo-input\').click()">'
    +           '<div id="wbe-photo-thumb" class="wbe-upload-thumb">📷</div>'
    +           '<div><div style="font-size:.78rem;font-weight:600;color:#374151">Foto</div><div id="wbe-photo-st" style="font-size:.65rem;color:#9ca3af">Subir imagen</div></div>'
    +         '</div>'
    +         '<input type="file" id="wbe-photo-input" accept="image/*" style="display:none" onchange="_wbe.uploadMedia(\'photo\',this)">'
    +       '</div>'
    +       '<div><label class="wbe-label">Logo</label>'
    +         '<div class="wbe-upload-btn" onclick="document.getElementById(\'wbe-logo-input\').click()">'
    +           '<div id="wbe-logo-thumb" class="wbe-upload-thumb">🏥</div>'
    +           '<div><div style="font-size:.78rem;font-weight:600;color:#374151">Logo</div><div id="wbe-logo-st" style="font-size:.65rem;color:#9ca3af">Subir imagen</div></div>'
    +         '</div>'
    +         '<input type="file" id="wbe-logo-input" accept="image/*" style="display:none" onchange="_wbe.uploadMedia(\'logo\',this)">'
    +       '</div>'
    +     '</div>'
    +     '<div><label class="wbe-label">Color principal</label>'
    +       '<div style="display:flex;align-items:center;gap:.75rem">'
    +         '<input type="color" id="wbe-color" value="#0b7c6e" oninput="document.getElementById(\'wbe-color-val\').textContent=this.value;_wbe.schedRefresh()" style="width:44px;height:36px;border-radius:8px;border:1.5px solid #e5e7eb;cursor:pointer;padding:2px;background:#fff">'
    +         '<span id="wbe-color-val" style="font-size:.82rem;color:#6b7280;font-family:monospace">#0b7c6e</span>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'

    /* ── HERO ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd"><span style="font-size:1rem">✦</span><span class="wbe-card-title">Hero — primera pantalla</span></div>'
    +   '<div class="wbe-card-body">'
    +     '<div><label class="wbe-label">Titular principal</label><input id="wbe-headline" class="wbe-inp" placeholder="Cuida tu corazón con el mejor equipo" oninput="_wbe.schedRefresh()"></div>'
    +     '<div><label class="wbe-label">Subtitular</label><textarea id="wbe-subheadline" class="wbe-ta" rows="2" placeholder="Descripción breve e impactante..." oninput="_wbe.schedRefresh()"></textarea></div>'
    +     '<div><label class="wbe-label">Bio / Tagline</label><textarea id="wbe-bio" class="wbe-ta" rows="2" placeholder="Una frase que te defina..." oninput="_wbe.schedRefresh()"></textarea></div>'
    +   '</div>'
    + '</div>'

    /* ── SERVICIOS ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd" style="justify-content:space-between">'
    +     '<div style="display:flex;align-items:center;gap:.5rem"><span style="font-size:1rem">💉</span><span class="wbe-card-title">Servicios</span></div>'
    +     '<button onclick="_wbe.addSvc()" style="padding:.25rem .65rem;background:#f0fdf8;border:1.5px solid #a7f3d0;border-radius:7px;color:#0b7c6e;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit">+ Agregar</button>'
    +   '</div>'
    +   '<div class="wbe-card-body"><div id="wbe-services-list" style="display:grid;gap:.4rem"></div></div>'
    + '</div>'

    /* ── SOBRE MÍ ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd"><span style="font-size:1rem">👤</span><span class="wbe-card-title">Sobre el médico</span></div>'
    +   '<div class="wbe-card-body">'
    +     '<div><label class="wbe-label">Texto de presentación</label><textarea id="wbe-about" class="wbe-ta" rows="3" placeholder="Cuéntale a tus pacientes sobre ti..." oninput="_wbe.schedRefresh()"></textarea></div>'
    +     '<div><label class="wbe-label">Diferenciadores <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:.65rem">(uno por línea)</span></label><textarea id="wbe-diffs" class="wbe-ta" rows="3" placeholder="15 años de experiencia&#10;Tecnología de punta&#10;Atención personalizada" oninput="_wbe.schedRefresh()"></textarea></div>'
    +     '<div class="wbe-2col">'
    +       '<div><label class="wbe-label">Filosofía</label><input id="wbe-philosophy" class="wbe-inp" placeholder="Mi filosofía..." oninput="_wbe.schedRefresh()"></div>'
    +       '<div><label class="wbe-label">CTA final</label><input id="wbe-cta" class="wbe-inp" placeholder="Agenda tu cita hoy..." oninput="_wbe.schedRefresh()"></div>'
    +     '</div>'
    +   '</div>'
    + '</div>'

    /* ── GALERÍA ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd" style="justify-content:space-between">'
    +     '<div style="display:flex;align-items:center;gap:.5rem"><span style="font-size:1rem">📷</span><span class="wbe-card-title">Galería / Carrusel</span></div>'
    +     '<button onclick="document.getElementById(\'wbe-gallery-input\').click()" style="padding:.25rem .65rem;background:#f0fdf8;border:1.5px solid #a7f3d0;border-radius:7px;color:#0b7c6e;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit">+ Fotos</button>'
    +   '</div>'
    +   '<div class="wbe-card-body">'
    +     '<input type="file" id="wbe-gallery-input" accept="image/*" multiple style="display:none" onchange="_wbe.uploadGallery(this)">'
    +     '<div id="wbe-gallery-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:.35rem"></div>'
    +   '</div>'
    + '</div>'

    /* ── APARIENCIA & LAYOUT ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd"><span style="font-size:1rem">🎨</span><span class="wbe-card-title">Apariencia y layout</span></div>'
    +   '<div class="wbe-card-body">'
    +     '<div><label class="wbe-label">DNA / Estilo visual</label>'
    +       '<select id="wbe-dna" class="wbe-inp" onchange="_wbe.settings()">'
    +         '<option value="authority">Authority — oscuro, clínico, experto</option>'
    +         '<option value="clinic">Clinic — azul, limpio, moderno</option>'
    +         '<option value="warm">Warm — cálido, humano, cercano</option>'
    +         '<option value="modern">Modern — dinámico, colorido</option>'
    +         '<option value="luxury">Luxury — premium, estético</option>'
    +       '</select>'
    +     '</div>'
    +     '<div><label class="wbe-label">Layout del Hero</label>'
    +       '<div class="wbe-lo-group">'
    +         '<button class="wbe-lo" id="wbl-hero-centered" onclick="_wbe.layout(\'hero\',\'centered\')"><div style="height:22px;background:linear-gradient(#e2e8f0,#e2e8f0);border-radius:5px;margin-bottom:.3rem;display:flex;align-items:center;justify-content:center"><div style="width:60%;height:4px;background:#94a3b8;border-radius:2px"></div></div>Centrado</button>'
    +         '<button class="wbe-lo sel" id="wbl-hero-split" onclick="_wbe.layout(\'hero\',\'split\')"><div style="height:22px;background:linear-gradient(90deg,#e2e8f0 50%,#dbeafe 50%);border-radius:5px;margin-bottom:.3rem"></div>Split</button>'
    +         '<button class="wbe-lo" id="wbl-hero-fullscreen" onclick="_wbe.layout(\'hero\',\'fullscreen\')"><div style="height:22px;background:#0f172a;border-radius:5px;margin-bottom:.3rem"></div>Fullscreen</button>'
    +       '</div>'
    +     '</div>'
    +     '<div><label class="wbe-label">Layout de Servicios</label>'
    +       '<div class="wbe-lo-group" style="max-width:260px">'
    +         '<button class="wbe-lo sel" id="wbl-services-grid" onclick="_wbe.layout(\'services\',\'grid\')">⊞ Grid</button>'
    +         '<button class="wbe-lo" id="wbl-services-list" onclick="_wbe.layout(\'services\',\'list\')">☰ Lista</button>'
    +       '</div>'
    +     '</div>'
    +     '<div><label class="wbe-label">Navbar</label>'
    +       '<div class="wbe-lo-group" style="max-width:260px">'
    +         '<button class="wbe-lo sel" id="wbs-nav-transparent" onclick="_wbe.nav(\'transparent\')">Transparente</button>'
    +         '<button class="wbe-lo" id="wbs-nav-solid" onclick="_wbe.nav(\'solid\')">Sólida</button>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'

    /* ── MÓDULOS ── */
    + '<div class="wbe-card">'
    +   '<div class="wbe-card-hd"><span style="font-size:1rem">⚙️</span><span class="wbe-card-title">Módulos activos</span></div>'
    +   '<div class="wbe-card-body" style="padding:.5rem 1.1rem">'
    + _toggleRow('show_whatsapp', 'WhatsApp',  'Botón flotante de contacto')
    + _toggleRow('show_booking',  'Booking',   'Botón y flujo de citas')
    + _toggleRow('show_carousel', 'Carrusel',  'Galería de fotos')
    + _toggleRow('show_services', 'Servicios', 'Sección de tratamientos')
    + _toggleRow('show_cta',      'CTA',       'Llamada a la acción')
    + _toggleRow('show_map',      'Mapa',      'Ubicación del consultorio')
    + _toggleRow('show_instagram','Instagram', 'Feed de publicaciones')
    + _toggleRow('show_insurance','Seguros',   'Aseguradoras aceptadas')
    + _toggleRow('show_calculator','Calculadora','Estimador de precios')
    + _toggleRow('show_doctors',  'Equipo',    'Médicos del centro')
    +   '</div>'
    + '</div>'

    /* error */
    + '<div id="wbe-error" style="display:none;font-size:.77rem;color:#dc2626;padding:.6rem .85rem;background:#fef2f2;border-radius:9px;border:1px solid #fecaca"></div>'

    + '</div>' /* /wbe-form */
    + '</div>' /* /wbe-body */
    + '</div>'; /* /wbe-modal */
  }

  function _toggleRow(key, label, sub) {
    return '<div class="wbe-toggle-row">'
      + '<div><div style="font-size:.83rem;font-weight:600;color:#111827">' + label + '</div><div style="font-size:.68rem;color:#9ca3af">' + sub + '</div></div>'
      + '<label class="wbe-sw"><input type="checkbox" id="ws-' + key + '" onchange="_wbe.settings()"><span class="wbe-sw-track"></span></label>'
      + '</div>';
  }

  /* ── Inject ─────────────────────────────────────────────────────────────── */
  function _inject() {
    if (_injected) return;
    var s = document.createElement('style');
    s.id = 'wbe-css';
    s.textContent = _CSS;
    document.head.appendChild(s);
    document.body.insertAdjacentHTML('beforeend', _HTML());
    _injected = true;
  }

  /* ── Status UI ──────────────────────────────────────────────────────────── */
  function _updateStatusUI() {
    var badge = _el('wbe-status-badge');
    var warn  = _el('wbe-live-warn');
    var dep   = _el('wbe-btn-deploy');
    if (_isLive) {
      if (badge) { badge.textContent = '● Live'; badge.style.cssText = 'padding:.22rem .65rem;border-radius:20px;font-size:.68rem;font-weight:800;background:#dcfce7;color:#15803d;flex-shrink:0;white-space:nowrap'; }
      if (warn)  warn.style.display = '';
      if (dep)   { dep.textContent = 'Retirar'; dep.style.cssText = 'padding:.35rem .8rem;border-radius:8px;background:#fef2f2;color:#dc2626;font-size:.76rem;font-weight:700;cursor:pointer;border:1.5px solid #fecaca;font-family:inherit;flex-shrink:0'; }
    } else {
      if (badge) { badge.textContent = '● Demo'; badge.style.cssText = 'padding:.22rem .65rem;border-radius:20px;font-size:.68rem;font-weight:800;background:#fef3c7;color:#b45309;flex-shrink:0;white-space:nowrap'; }
      if (warn)  warn.style.display = 'none';
      if (dep)   { dep.textContent = _opts.isAdmin ? '→ Deploy' : '→ Publicar'; dep.style.cssText = 'padding:.35rem .8rem;border-radius:8px;background:#fef3c7;color:#b45309;font-size:.76rem;font-weight:700;cursor:pointer;border:1.5px solid #fde68a;font-family:inherit;flex-shrink:0'; }
    }
  }

  /* ── Health score ───────────────────────────────────────────────────────── */
  function _updateScore() {
    var fill = _el('wbe-score-fill'); if (!fill) return;
    var checks = [
      { label: 'Foto',      ok: !!(_photoUrl || (_el('wbe-photo-thumb') && _el('wbe-photo-thumb').querySelector('img'))) },
      { label: 'Titular',   ok: !!(_el('wbe-headline')    && _el('wbe-headline').value.trim().length > 5) },
      { label: 'Servicios', ok: !!(_el('wbe-services-list') && _el('wbe-services-list').querySelectorAll('[data-svc]').length > 0) },
      { label: 'Bio',       ok: !!(_el('wbe-bio')          && _el('wbe-bio').value.trim().length > 5) },
      { label: 'Sobre mí',  ok: !!(_el('wbe-about')        && _el('wbe-about').value.trim().length > 15) }
    ];
    var pct = Math.round(checks.filter(function(c){return c.ok;}).length / checks.length * 100);
    var pctEl = _el('wbe-score-pct'); if (pctEl) pctEl.textContent = pct + '%';
    fill.style.width = pct + '%';
    fill.style.background = pct >= 80 ? 'linear-gradient(90deg,#0b7c6e,#34d399)' : pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)';
    var checksEl = _el('wbe-score-checks');
    if (checksEl) checksEl.innerHTML = checks.map(function(c) {
      return '<span style="display:inline-flex;align-items:center;gap:.2rem;padding:.1rem .38rem;border-radius:20px;background:' + (c.ok?'#dcfce7':'#f1f5f9') + ';color:' + (c.ok?'#15803d':'#9ca3af') + '">' + (c.ok?'✓':'○') + ' ' + c.label + '</span>';
    }).join('');
  }

  /* ── Layout / Nav setters ───────────────────────────────────────────────── */
  function _setLayout(section, value) {
    if (section === 'hero') {
      ['centered','split','fullscreen'].forEach(function(v) { var b = _el('wbl-hero-' + v); if (b) b.classList.toggle('sel', v === value); });
      _wsSettings.hero_layout = value;
    } else if (section === 'services') {
      ['grid','list'].forEach(function(v) { var b = _el('wbl-services-' + v); if (b) b.classList.toggle('sel', v === value); });
      _wsSettings.services_layout = value;
    }
    _saveSettings();
  }

  function _setNav(style) {
    ['transparent','solid'].forEach(function(v) { var b = _el('wbs-nav-' + v); if (b) b.classList.toggle('sel', v === style); });
    _wsSettings.navbar_style = style;
    _saveSettings();
  }

  /* ── Settings save ──────────────────────────────────────────────────────── */
  async function _saveSettings() {
    ['show_whatsapp','show_booking','show_carousel','show_calculator','show_services','show_doctors','show_instagram','show_map','show_insurance','show_cta'].forEach(function(k) {
      var el = _el('ws-' + k); if (el) _wsSettings[k] = el.checked;
    });
    var dnaEl = _el('wbe-dna'); if (dnaEl) _wsSettings.dna = dnaEl.value;
    await _sb().from('generated_demos').update({ web_settings: _wsSettings }).eq('slug', _slug).catch(console.error);
    _updateScore();
  }

  /* ── Gallery ────────────────────────────────────────────────────────────── */
  function _renderGallery() {
    var el = _el('wbe-gallery-grid'); if (!el) return;
    if (!_gallery.length) {
      el.innerHTML = '<div style="grid-column:1/-1;font-size:.72rem;color:#9ca3af;text-align:center;padding:.7rem;border:1.5px dashed #e5e7eb;border-radius:8px">Sin imágenes — sube fotos para el carrusel</div>';
      return;
    }
    el.innerHTML = _gallery.map(function(url, i) {
      return '<div style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#f3f4f6">'
        + '<img src="' + _esc(url) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy">'
        + '<button onclick="_wbe.delGallery(' + i + ')" style="position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);border:none;color:#fca5a5;font-size:.72rem;cursor:pointer;line-height:18px;text-align:center;padding:0">×</button>'
        + '</div>';
    }).join('');
  }

  function _deleteGallery(idx) { _gallery.splice(idx, 1); _renderGallery(); }

  /* ── Upload media ───────────────────────────────────────────────────────── */
  async function _uploadMedia(type, input) {
    var file = input.files[0]; if (!file) return;
    var st = _el('wbe-' + type + '-st');
    var th = _el('wbe-' + type + '-thumb');
    if (st) st.textContent = 'Subiendo...';
    var ext  = file.name.split('.').pop();
    var path = 'demo-media/' + _slug + '/' + type + '-' + Date.now() + '.' + ext;
    var res  = await _sb().storage.from('growth-creatives').upload(path, file, { upsert: true, contentType: file.type });
    if (res.error) { if (st) st.textContent = 'Error'; console.error(res.error); return; }
    var pub = _sb().storage.from('growth-creatives').getPublicUrl(path).data.publicUrl;
    if (th) th.innerHTML = '<img src="' + pub + '" style="width:100%;height:100%;object-fit:cover">';
    if (st) st.textContent = '✓ Cargada';
    if (type === 'photo') _photoUrl = pub; else _logoUrl = pub;
    input.value = '';
    _updateScore();
  }

  async function _uploadGallery(input) {
    var files = Array.from(input.files); if (!files.length) return;
    var btn = document.querySelector('[onclick*="wbe-gallery-input"]');
    if (btn) { btn.textContent = 'Subiendo...'; btn.disabled = true; }
    var ts = Date.now();
    for (var i = 0; i < files.length; i++) {
      var f = files[i], ext = f.name.split('.').pop();
      var path = 'demo-media/' + _slug + '/gallery/' + ts + '_' + i + '.' + ext;
      var res = await _sb().storage.from('growth-creatives').upload(path, f, { upsert: true, contentType: f.type });
      if (res.error) { console.error(res.error); continue; }
      _gallery.push(_sb().storage.from('growth-creatives').getPublicUrl(path).data.publicUrl);
    }
    input.value = '';
    if (btn) { btn.textContent = '+ Fotos'; btn.disabled = false; }
    _renderGallery();
  }

  /* ── Services ───────────────────────────────────────────────────────────── */
  function _serviceRow(icon, title, desc) {
    var el = document.createElement('div');
    el.setAttribute('data-svc', '');
    el.className = 'wbe-svc-row';
    el.innerHTML = '<button onclick="this.closest(\'[data-svc]\').remove();_wbe.schedRefresh()" style="position:absolute;top:.4rem;right:.5rem;background:0;border:none;color:rgba(239,68,68,.45);cursor:pointer;font-size:1rem;line-height:1;padding:0">×</button>'
      + '<div style="display:grid;grid-template-columns:50px 1fr;gap:.4rem">'
      + '<input class="svc-icon wbe-inp" placeholder="✦" maxlength="4" value="' + _esc(icon || '') + '" style="text-align:center;font-size:1rem;padding:.4rem" oninput="_wbe.schedRefresh()">'
      + '<input class="svc-title wbe-inp" placeholder="Nombre del servicio" value="' + _esc(title || '') + '" oninput="_wbe.schedRefresh()">'
      + '</div>'
      + '<textarea class="svc-desc wbe-ta" rows="1" placeholder="Descripción breve..." oninput="_wbe.schedRefresh()">' + _esc(desc || '') + '</textarea>';
    return el;
  }

  function _addService() {
    var list = _el('wbe-services-list'); if (!list) return;
    list.appendChild(_serviceRow('', '', ''));
  }

  function _getServices() {
    var rows = (_el('wbe-services-list') || document.createElement('div')).querySelectorAll('[data-svc]');
    var arr = [];
    rows.forEach(function(r) {
      var t = r.querySelector('.svc-title').value.trim(); if (!t) return;
      arr.push({ i: r.querySelector('.svc-icon').value.trim() || '✦', t: t, d: r.querySelector('.svc-desc').value.trim() });
    });
    return arr;
  }

  /* ── Schedule preview refresh (no-op — no iframe) ──────────────────────── */
  function _scheduleRefresh() { _updateScore(); }

  /* ── Load data into form ────────────────────────────────────────────────── */
  function _loadData(d) {
    var config = d.web_config_jsonb || {};
    var ws     = d.web_settings    || {};
    _wsSettings = Object.assign({}, _WS_DEFAULTS, { dna: d.dna || 'authority' }, ws);
    _isLive     = !!d.activated_at;
    _photoUrl   = null; _logoUrl = null;
    _gallery    = Array.isArray(config.gallery) ? config.gallery.slice() : [];

    var lbl = _el('wbe-slug-lbl'); if (lbl) lbl.textContent = '/' + _slug;
    _updateStatusUI();

    // Thumbnails
    var purl = d.photo_url || config.doctor_photo_url || null;
    var th_p = _el('wbe-photo-thumb'), st_p = _el('wbe-photo-st');
    if (th_p) th_p.innerHTML = purl ? '<img src="' + _esc(purl) + '" style="width:100%;height:100%;object-fit:cover">' : '📷';
    if (st_p) st_p.textContent = purl ? '✓ Cargada' : 'Subir imagen';

    var lurl = d.logo_url || config.logo_url || null;
    var th_l = _el('wbe-logo-thumb'), st_l = _el('wbe-logo-st');
    if (th_l) th_l.innerHTML = lurl ? '<img src="' + _esc(lurl) + '" style="width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply">' : '🏥';
    if (st_l) st_l.textContent = lurl ? '✓ Cargado' : 'Subir imagen';
    _renderGallery();

    // Fields
    function _set(id, v) { var el = _el(id); if (el) el.value = v || ''; }
    _set('wbe-nombre',      d.doctor_name || '');
    _set('wbe-especialidad', d.specialty  || '');
    _set('wbe-ciudad',      config.city   || '');
    _set('wbe-headline',    config.headline    || '');
    _set('wbe-subheadline', config.subheadline || '');
    _set('wbe-bio',         config.hero_text || config.tagline || '');
    _set('wbe-about',       config.about_text  || '');
    _set('wbe-philosophy',  config.philosophy   || '');
    _set('wbe-cta',         config.cta_final    || '');

    var col = config.primary_color || '#0b7c6e';
    var colorEl = _el('wbe-color'); if (colorEl) colorEl.value = col;
    var colorVal = _el('wbe-color-val'); if (colorVal) colorVal.textContent = col;

    var diffs = Array.isArray(config.differentiators) ? config.differentiators : [];
    _set('wbe-diffs', diffs.map(function(x) { return typeof x === 'string' ? x : (x.t || x.text || x.title || ''); }).join('\n'));

    var list = _el('wbe-services-list');
    if (list) {
      list.innerHTML = '';
      var svcs = Array.isArray(config.services) ? config.services : (Array.isArray(config.servicios) ? config.servicios : []);
      svcs.forEach(function(s) { list.appendChild(_serviceRow(s.i || s.icon || '✦', s.t || s.title || s.name || '', s.d || s.desc || s.description || '')); });
      if (!svcs.length) list.appendChild(_serviceRow('', '', ''));
    }

    // Toggles
    ['show_whatsapp','show_booking','show_carousel','show_calculator','show_services','show_doctors','show_instagram','show_map','show_insurance','show_cta'].forEach(function(k) {
      var el = _el('ws-' + k); if (el) el.checked = _wsSettings[k] !== false;
    });

    // Layout buttons
    ['centered','split','fullscreen'].forEach(function(v) { var b = _el('wbl-hero-' + v); if (b) b.classList.toggle('sel', (_wsSettings.hero_layout || 'split') === v); });
    ['grid','list'].forEach(function(v) { var b = _el('wbl-services-' + v); if (b) b.classList.toggle('sel', (_wsSettings.services_layout || 'grid') === v); });
    ['transparent','solid'].forEach(function(v) { var b = _el('wbs-nav-' + v); if (b) b.classList.toggle('sel', (_wsSettings.navbar_style || 'transparent') === v); });

    var dnaEl = _el('wbe-dna'); if (dnaEl) dnaEl.value = _wsSettings.dna || d.dna || 'authority';

    var saveBtn = _el('wbe-btn-save'); if (saveBtn) { saveBtn.textContent = 'Guardar'; saveBtn.disabled = false; }
    var errEl = _el('wbe-error'); if (errEl) errEl.style.display = 'none';

    // Scroll to top
    var body = _el('wbe-body'); if (body) body.scrollTop = 0;
    _updateScore();
  }

  /* ── Save ───────────────────────────────────────────────────────────────── */
  async function _save(silent) {
    var btn = _el('wbe-btn-save');
    if (!silent && btn) { btn.textContent = 'Guardando...'; btn.disabled = true; }
    try {
      var cur = await _sb().from('generated_demos').select('web_config_jsonb').eq('slug', _slug).single();
      var config = (cur.data && cur.data.web_config_jsonb) || {};
      var nombre   = (_el('wbe-nombre')      || {}).value || '';
      var espec    = (_el('wbe-especialidad') || {}).value || '';
      var ciudad   = (_el('wbe-ciudad')       || {}).value || '';
      var headline = (_el('wbe-headline')     || {}).value || '';
      var subhl    = (_el('wbe-subheadline')  || {}).value || '';
      var bio      = (_el('wbe-bio')          || {}).value || '';
      var about    = (_el('wbe-about')        || {}).value || '';
      var diffs    = ((_el('wbe-diffs') || {}).value || '').split('\n').map(function(l){return l.trim();}).filter(Boolean);
      var phi      = (_el('wbe-philosophy')   || {}).value || '';
      var cta      = (_el('wbe-cta')          || {}).value || '';
      var services = _getServices();
      if (ciudad)    config.city             = ciudad;
      if (headline)  config.headline         = headline;
      if (subhl)     config.subheadline      = subhl;
      if (bio)       config.hero_text        = bio;
      if (about)     config.about_text       = about;
      if (diffs.length) config.differentiators = diffs;
      if (phi)       config.philosophy       = phi;
      if (cta)       config.cta_final        = cta;
      config.primary_color = (_el('wbe-color') || {}).value || '#0b7c6e';
      config.services  = services;
      config.servicios = services;
      config.gallery   = _gallery;
      if (_photoUrl) config.doctor_photo_url = _photoUrl;
      if (_logoUrl)  config.logo_url = _logoUrl;
      if (_wsSettings.dna) config.dna = _wsSettings.dna;

      var upd = { doctor_name: nombre, specialty: espec, web_config_jsonb: config, web_settings: _wsSettings };
      if (_photoUrl) upd.photo_url = _photoUrl;
      if (_logoUrl)  upd.logo_url  = _logoUrl;
      if (_wsSettings.dna) upd.dna = _wsSettings.dna;

      await _sb().from('generated_demos').update(upd).eq('slug', _slug);

      if (silent) {
        _updateScore();
      } else {
        if (_opts.onSave) _opts.onSave();
        close();
      }
    } catch(e) {
      var errEl = _el('wbe-error');
      if (errEl) { errEl.textContent = 'Error al guardar: ' + (e.message || e); errEl.style.display = ''; }
      if (!silent && btn) { btn.textContent = 'Guardar'; btn.disabled = false; }
    }
  }

  /* ── Deploy ─────────────────────────────────────────────────────────────── */
  async function _deployWeb() {
    if (!_slug) return;
    var btn = _el('wbe-btn-deploy');
    if (_isLive) {
      if (!confirm(_opts.isAdmin ? '¿Retirar el sitio de producción?' : '¿Despublicar tu sitio web?')) return;
      if (btn) { btn.textContent = 'Retirando...'; btn.disabled = true; }
      await _sb().from('generated_demos').update({ activated_at: null }).eq('slug', _slug);
      _isLive = false;
    } else {
      if (btn) { btn.textContent = 'Publicando...'; btn.disabled = true; }
      await _save(true);
      await _sb().from('generated_demos').update({ activated_at: new Date().toISOString() }).eq('slug', _slug);
      _isLive = true;
    }
    _updateStatusUI();
    if (btn) btn.disabled = false;
    if (_opts.onDeploy) _opts.onDeploy(_isLive);
  }

  /* ── View ───────────────────────────────────────────────────────────────── */
  function _verWeb() {
    if (!_slug) return;
    var url = _isLive ? 'https://' + _slug + '.citadoc.lat' : 'https://citadoc.lat/demo/' + _slug;
    window.open(url, '_blank');
  }

  /* ── Open ───────────────────────────────────────────────────────────────── */
  function open(slug, opts) {
    _opts = opts || {};
    _slug = slug;
    _inject();

    var dep = _el('wbe-btn-deploy');
    if (dep) dep.textContent = _opts.isAdmin ? '→ Deploy' : '→ Publicar';

    var modal = _el('wbe-modal');
    if (modal) modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    var saveBtn = _el('wbe-btn-save');
    if (saveBtn) { saveBtn.textContent = 'Cargando...'; saveBtn.disabled = true; }

    _sb().from('generated_demos')
      .select('slug,doctor_name,specialty,photo_url,logo_url,dna,web_config_jsonb,web_settings,activated_at')
      .eq('slug', slug)
      .maybeSingle()
      .then(function(res) {
        if (res.error) { console.error('[WebBuilder]', res.error); return; }
        if (!res.data) {
          var body = _el('wbe-body');
          if (body) body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:.75rem;color:#9ca3af">'
            + '<div style="font-size:2.5rem">🏗️</div>'
            + '<div style="font-size:.95rem;font-weight:600;color:#374151">Sitio no configurado aún</div>'
            + '<div style="font-size:.8rem;text-align:center;max-width:300px;line-height:1.6">El equipo de CitaDoc activará este sitio pronto.</div>'
            + '</div>';
          return;
        }
        _loadData(res.data);
      });
  }

  /* ── Close ──────────────────────────────────────────────────────────────── */
  function close() {
    var modal = _el('wbe-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
    if (_opts.onClose) _opts.onClose();
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  window.webBuilderOpen  = open;
  window.webBuilderClose = close;
  window._wbe = {
    close:        close,
    save:         function() { _save(false); },
    layout:       _setLayout,
    nav:          _setNav,
    settings:     _saveSettings,
    addSvc:       _addService,
    delGallery:   _deleteGallery,
    uploadMedia:  _uploadMedia,
    uploadGallery:_uploadGallery,
    deploy:       _deployWeb,
    view:         _verWeb,
    schedRefresh: _scheduleRefresh
  };

})(window, document);
