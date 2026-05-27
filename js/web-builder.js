/**
 * CitaDoc Website Builder — Módulo compartido
 * Uso:  webBuilderOpen(slug, opts)
 *       webBuilderClose()
 *
 * opts = {
 *   sb          : supabaseClient  (requerido)
 *   isAdmin     : bool            (default false)
 *   onSave      : fn(data)        (callback post-save, admin-only generalmente)
 *   onClose     : fn()            (callback al cerrar)
 * }
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
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _el(id) { return document.getElementById(id); }
  function _sb()   { return _opts.sb; }

  /* ── CSS ────────────────────────────────────────────────────────────────── */
  var _CSS = [
    '#wbe-modal{display:none;position:fixed;inset:0;z-index:9000;font-family:"DM Sans",sans-serif;flex-direction:column;background:#fff}',
    '#wbe-modal.open{display:flex}',
    '#wbe-sidebar::-webkit-scrollbar{width:4px}#wbe-sidebar::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}',
    '.wbe-tab{padding:.4rem .85rem;border-radius:8px;font-size:.77rem;font-weight:600;cursor:pointer;border:none;background:transparent;color:#6b7280;transition:all .15s;font-family:"DM Sans",sans-serif}',
    '.wbe-tab.active{background:#f0fdf4;color:#16a34a}',
    '.wbe-label{font-size:.67rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.45rem;display:block}',
    '.wbe-input{width:100%;padding:.52rem .72rem;border-radius:9px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:"DM Sans",sans-serif;font-size:.84rem;outline:0;box-sizing:border-box;transition:border-color .15s}',
    '.wbe-input:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08)}',
    '.wbe-textarea{width:100%;padding:.52rem .72rem;border-radius:9px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:"DM Sans",sans-serif;font-size:.84rem;outline:0;box-sizing:border-box;resize:none;line-height:1.5;transition:border-color .15s}',
    '.wbe-textarea:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08)}',
    '.wbe-card{background:#fff;border:1.5px solid #e5e7eb;border-radius:14px;padding:.9rem 1rem;margin-bottom:.6rem}',
    '.wbe-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid #f3f4f6}',
    '.wbe-toggle-row:last-child{border-bottom:none}',
    '.wbe-toggle{position:relative;width:42px;height:24px;flex-shrink:0;cursor:pointer}',
    '.wbe-toggle input{opacity:0;width:0;height:0;position:absolute}',
    '.wbe-tsl{position:absolute;inset:0;background:#d1d5db;border-radius:24px;cursor:pointer;transition:.2s}',
    '.wbe-tsl:before{content:"";position:absolute;width:18px;height:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
    '.wbe-toggle input:checked+.wbe-tsl{background:#16a34a}',
    '.wbe-toggle input:checked+.wbe-tsl:before{transform:translateX(18px)}',
    '.wbe-lo{border:2px solid #e5e7eb;border-radius:10px;padding:.65rem .5rem;cursor:pointer;text-align:center;transition:all .15s;flex:1;background:#fff;font-family:"DM Sans",sans-serif;font-size:.71rem;color:#374151;font-weight:500}',
    '.wbe-lo:hover{border-color:#86efac}.wbe-lo.sel{border-color:#16a34a;background:#f0fdf4;color:#16a34a}',
    '.wbe-score-bar{height:5px;background:#e5e7eb;border-radius:5px;overflow:hidden;margin:.35rem 0}',
    '.wbe-score-fill{height:100%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:5px;transition:width .5s cubic-bezier(.16,1,.3,1)}',
    '.wbe-live-warning{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:.6rem .8rem;font-size:.75rem;color:#c2410c;font-weight:500;margin-bottom:.75rem;display:none}',
    '.wbe-section{margin-bottom:1.25rem}',
    '.wbe-svc-inp{width:100%;padding:.45rem .6rem;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:"DM Sans",sans-serif;font-size:.82rem;outline:0;box-sizing:border-box}'
  ].join('');

  /* ── HTML ───────────────────────────────────────────────────────────────── */
  function _HTML(isAdmin) {
    var deployBtn = isAdmin
      ? '<button id="wbe-btn-deploy" onclick="_wbe.deploy()" style="padding:.38rem .85rem;border-radius:8px;background:#fef3c7;color:#b45309;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid #fde68a;font-family:\'DM Sans\',sans-serif">→ Deploy</button>'
      : '<button id="wbe-btn-deploy" onclick="_wbe.deploy()" style="padding:.38rem .85rem;border-radius:8px;background:#fef3c7;color:#b45309;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid #fde68a;font-family:\'DM Sans\',sans-serif">→ Publicar</button>';

    return '<div id="wbe-modal" aria-label="Website Builder">'

    /* TOP BAR */
    + '<div style="background:#fff;border-bottom:1.5px solid #e5e7eb;padding:.6rem 1.1rem;display:flex;align-items:center;gap:.65rem;height:52px;box-sizing:border-box;flex-shrink:0">'
    +   '<button onclick="_wbe.close()" style="padding:.32rem .65rem;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#374151;font-size:.78rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;display:flex;align-items:center;gap:.3rem;flex-shrink:0">← Volver</button>'
    +   '<code id="wbe-slug-lbl" style="font-size:.72rem;color:#9ca3af;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></code>'
    +   '<div id="wbe-status-badge" style="display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .6rem;border-radius:20px;font-size:.7rem;font-weight:700;background:#fef3c7;color:#b45309;flex-shrink:0">● Demo</div>'
    +   '<div style="display:flex;gap:.35rem;flex-shrink:0">'
    +     '<button id="wbe-btn-view" onclick="_wbe.view()" style="padding:.38rem .85rem;border-radius:8px;background:#f1f5f9;color:#374151;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;font-family:\'DM Sans\',sans-serif">Ver ↗</button>'
    +     deployBtn
    +     '<button id="wbe-btn-save" onclick="_wbe.save()" style="padding:.38rem .95rem;border-radius:8px;background:#16a34a;color:#fff;font-size:.78rem;font-weight:600;cursor:pointer;border:none;font-family:\'DM Sans\',sans-serif">Guardar</button>'
    +   '</div>'
    + '</div>'

    /* MAIN SPLIT */
    + '<div style="display:flex;height:calc(100svh - 52px)">'

    /* ── LEFT SIDEBAR ── */
    + '<div id="wbe-sidebar" style="width:360px;flex-shrink:0;background:#f8f9fb;border-right:1.5px solid #e5e7eb;overflow-y:auto;display:flex;flex-direction:column">'

    /* Health Score */
    + '<div style="padding:.85rem 1rem .7rem;border-bottom:1px solid #e9ecef;background:#fff">'
    +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem">'
    +     '<span style="font-size:.73rem;font-weight:700;color:#374151">Completitud del perfil</span>'
    +     '<span id="wbe-score-pct" style="font-size:.8rem;font-weight:800;color:#16a34a">0%</span>'
    +   '</div>'
    +   '<div class="wbe-score-bar"><div id="wbe-score-fill" class="wbe-score-fill" style="width:0%"></div></div>'
    +   '<div id="wbe-score-checks" style="display:flex;flex-wrap:wrap;gap:.2rem .35rem;margin-top:.4rem;font-size:.66rem;color:#6b7280"></div>'
    + '</div>'

    /* Tabs */
    + '<div style="display:flex;gap:.15rem;padding:.5rem .65rem;border-bottom:1px solid #e5e7eb;background:#fff;position:sticky;top:0;z-index:10;flex-shrink:0">'
    +   '<button class="wbe-tab active" onclick="_wbe.tab(\'contenido\')" id="wbt-contenido">Contenido</button>'
    +   '<button class="wbe-tab" onclick="_wbe.tab(\'modulos\')" id="wbt-modulos">Módulos</button>'
    +   '<button class="wbe-tab" onclick="_wbe.tab(\'apariencia\')" id="wbt-apariencia">Apariencia</button>'
    +   '<button class="wbe-tab" onclick="_wbe.tab(\'layout\')" id="wbt-layout">Layout</button>'
    + '</div>'

    /* ── Tab: Contenido ── */
    + '<div id="wbtab-contenido" style="padding:.9rem 1rem">'
    +   '<div id="wbe-live-warning" class="wbe-live-warning">⚡ Los cambios impactan inmediatamente tu sitio web publicado.</div>'

    /* Identidad */
    +   '<div class="wbe-section"><span class="wbe-label">Identidad</span>'
    +     '<div style="display:grid;gap:.4rem">'
    +       '<input id="wbe-nombre" placeholder="Nombre del médico" class="wbe-input" oninput="_wbe.schedRefresh()">'
    +       '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">'
    +         '<input id="wbe-especialidad" placeholder="Especialidad" class="wbe-input" oninput="_wbe.schedRefresh()">'
    +         '<input id="wbe-ciudad" placeholder="Ciudad" class="wbe-input" oninput="_wbe.schedRefresh()">'
    +       '</div>'
    +     '</div>'
    +   '</div>'

    /* Media */
    +   '<div class="wbe-section"><span class="wbe-label">Foto y logo</span>'
    +     '<div style="display:flex;gap:.45rem">'
    +       '<div onclick="document.getElementById(\'wbe-photo-input\').click()" style="display:flex;align-items:center;gap:.55rem;padding:.55rem .7rem;border:1.5px dashed #d1d5db;border-radius:11px;cursor:pointer;background:#fafafa;flex:1;transition:border-color .15s" onmouseenter="this.style.borderColor=\'#86efac\'" onmouseleave="this.style.borderColor=\'#d1d5db\'">'
    +         '<div id="wbe-photo-thumb" style="width:36px;height:36px;border-radius:7px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;overflow:hidden">📷</div>'
    +         '<div><div style="font-size:.73rem;font-weight:600;color:#374151">Foto</div><div id="wbe-photo-st" style="font-size:.63rem;color:#9ca3af">Cambiar</div></div>'
    +       '</div>'
    +       '<div onclick="document.getElementById(\'wbe-logo-input\').click()" style="display:flex;align-items:center;gap:.55rem;padding:.55rem .7rem;border:1.5px dashed #d1d5db;border-radius:11px;cursor:pointer;background:#fafafa;flex:1;transition:border-color .15s" onmouseenter="this.style.borderColor=\'#86efac\'" onmouseleave="this.style.borderColor=\'#d1d5db\'">'
    +         '<div id="wbe-logo-thumb" style="width:36px;height:36px;border-radius:7px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;overflow:hidden">🏥</div>'
    +         '<div><div style="font-size:.73rem;font-weight:600;color:#374151">Logo</div><div id="wbe-logo-st" style="font-size:.63rem;color:#9ca3af">Cambiar</div></div>'
    +       '</div>'
    +     '</div>'
    +     '<input type="file" id="wbe-photo-input" accept="image/*" style="display:none" onchange="_wbe.uploadMedia(\'photo\',this)">'
    +     '<input type="file" id="wbe-logo-input" accept="image/*" style="display:none" onchange="_wbe.uploadMedia(\'logo\',this)">'
    +   '</div>'

    /* Hero */
    +   '<div class="wbe-section"><span class="wbe-label">Hero</span>'
    +     '<div style="display:grid;gap:.4rem">'
    +       '<input id="wbe-headline" placeholder="Titular principal..." class="wbe-input" oninput="_wbe.schedRefresh()">'
    +       '<textarea id="wbe-subheadline" rows="2" placeholder="Subtitular..." class="wbe-textarea" oninput="_wbe.schedRefresh()"></textarea>'
    +       '<textarea id="wbe-bio" rows="2" placeholder="Bio / tagline..." class="wbe-textarea" oninput="_wbe.schedRefresh()"></textarea>'
    +     '</div>'
    +   '</div>'

    /* Servicios */
    +   '<div class="wbe-section">'
    +     '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.45rem">'
    +       '<span class="wbe-label" style="margin:0">Servicios</span>'
    +       '<button onclick="_wbe.addSvc()" style="padding:.22rem .6rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;color:#16a34a;font-size:.7rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif">+ Agregar</button>'
    +     '</div>'
    +     '<div id="wbe-services-list" style="display:grid;gap:.3rem"></div>'
    +   '</div>'

    /* Sobre */
    +   '<div class="wbe-section"><span class="wbe-label">Sobre el médico</span>'
    +     '<textarea id="wbe-about" rows="3" placeholder="Texto de presentación..." class="wbe-textarea" oninput="_wbe.schedRefresh()"></textarea>'
    +   '</div>'

    /* Diferenciadores */
    +   '<div class="wbe-section"><span class="wbe-label">Diferenciadores <span style="font-weight:400;text-transform:none;letter-spacing:0">(uno por línea)</span></span>'
    +     '<textarea id="wbe-diffs" rows="3" placeholder="15 años de experiencia&#10;Tecnología de punta&#10;Atención personalizada" class="wbe-textarea" oninput="_wbe.schedRefresh()"></textarea>'
    +   '</div>'

    /* Filosofía */
    +   '<div class="wbe-section"><span class="wbe-label">Filosofía y CTA</span>'
    +     '<div style="display:grid;gap:.4rem">'
    +       '<input id="wbe-philosophy" placeholder="Filosofía de la práctica..." class="wbe-input" oninput="_wbe.schedRefresh()">'
    +       '<input id="wbe-cta" placeholder="CTA final..." class="wbe-input" oninput="_wbe.schedRefresh()">'
    +     '</div>'
    +   '</div>'

    /* Galería */
    +   '<div class="wbe-section">'
    +     '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.45rem">'
    +       '<span class="wbe-label" style="margin:0">Galería / Carrusel</span>'
    +       '<button onclick="document.getElementById(\'wbe-gallery-input\').click()" style="padding:.22rem .6rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;color:#16a34a;font-size:.7rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif">+ Fotos</button>'
    +     '</div>'
    +     '<input type="file" id="wbe-gallery-input" accept="image/*" multiple style="display:none" onchange="_wbe.uploadGallery(this)">'
    +     '<div id="wbe-gallery-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:.3rem">'
    +       '<div style="grid-column:1/-1;font-size:.72rem;color:#9ca3af;text-align:center;padding:.55rem;border:1.5px dashed #e5e7eb;border-radius:8px">Sin imágenes</div>'
    +     '</div>'
    +   '</div>'

    +   '<div id="wbe-error" style="display:none;font-size:.76rem;color:#dc2626;margin-bottom:.5rem;padding:.5rem .7rem;background:#fef2f2;border-radius:8px;border:1px solid #fecaca"></div>'
    + '</div>' /* /wbtab-contenido */

    /* ── Tab: Módulos ── */
    + '<div id="wbtab-modulos" style="display:none;padding:.9rem 1rem">'
    +   '<p style="font-size:.77rem;color:#6b7280;margin-bottom:.8rem;line-height:1.55">Activa o desactiva secciones completas de la web.</p>'
    +   '<div class="wbe-card">'
    + _toggleRow('show_whatsapp', 'WhatsApp', 'Botón flotante de contacto')
    + _toggleRow('show_booking',  'Agenda / Booking', 'Calendario de citas en línea')
    + _toggleRow('show_carousel', 'Carrusel', 'Galería de fotos deslizable')
    + _toggleRow('show_calculator','Calculadora', 'Estimador de precios')
    + _toggleRow('show_services', 'Servicios', 'Listado de tratamientos')
    + _toggleRow('show_doctors',  'Médicos', 'Equipo del centro médico')
    + _toggleRow('show_instagram','Instagram', 'Feed de publicaciones')
    + _toggleRow('show_map',      'Mapa', 'Ubicación del consultorio')
    + _toggleRow('show_insurance','Seguros', 'Aseguradoras aceptadas')
    + _toggleRow('show_cta',      'CTA', 'Sección llamada a la acción')
    +   '</div>'
    + '</div>'

    /* ── Tab: Apariencia ── */
    + '<div id="wbtab-apariencia" style="display:none;padding:.9rem 1rem">'
    +   '<div class="wbe-section"><span class="wbe-label">Color principal</span>'
    +     '<div style="display:flex;align-items:center;gap:.75rem">'
    +       '<input type="color" id="wbe-color" value="#1e5c3a" oninput="document.getElementById(\'wbe-color-val\').textContent=this.value;_wbe.schedRefresh()" style="width:48px;height:40px;border-radius:10px;border:1.5px solid #e5e7eb;cursor:pointer;padding:2px;background:#fff">'
    +       '<span id="wbe-color-val" style="font-size:.82rem;color:#6b7280;font-family:monospace">#1e5c3a</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="wbe-section"><span class="wbe-label">Navbar</span>'
    +     '<div style="display:flex;gap:.45rem">'
    +       '<button class="wbe-lo sel" id="wbs-nav-transparent" onclick="_wbe.nav(\'transparent\')" style="font-size:.72rem"><div style="height:18px;background:linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.25));border-radius:5px;margin-bottom:.35rem"></div>Transparente</button>'
    +       '<button class="wbe-lo" id="wbs-nav-solid" onclick="_wbe.nav(\'solid\')" style="font-size:.72rem"><div style="height:18px;background:#1e5c3a;border-radius:5px;margin-bottom:.35rem"></div>Sólida</button>'
    +     '</div>'
    +   '</div>'
    + '</div>'

    /* ── Tab: Layout ── */
    + '<div id="wbtab-layout" style="display:none;padding:.9rem 1rem">'
    +   '<div class="wbe-section"><span class="wbe-label">Hero</span>'
    +     '<div style="display:flex;gap:.4rem">'
    +       '<button class="wbe-lo" id="wbl-hero-centered" onclick="_wbe.layout(\'hero\',\'centered\')" style="font-size:.7rem"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" style="display:block;margin:0 auto .35rem"><rect width="46" height="30" rx="4" fill="#f1f5f9"/><rect x="13" y="7" width="20" height="3" rx="1.5" fill="#94a3b8"/><rect x="15" y="12" width="16" height="2" rx="1" fill="#cbd5e1"/><rect x="17" y="17" width="12" height="7" rx="2" fill="#16a34a"/></svg>Centrado</button>'
    +       '<button class="wbe-lo sel" id="wbl-hero-split" onclick="_wbe.layout(\'hero\',\'split\')" style="font-size:.7rem"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" style="display:block;margin:0 auto .35rem"><rect width="46" height="30" rx="4" fill="#f1f5f9"/><rect x="3" y="7" width="18" height="3" rx="1.5" fill="#94a3b8"/><rect x="3" y="12" width="14" height="2" rx="1" fill="#cbd5e1"/><rect x="3" y="17" width="10" height="7" rx="2" fill="#16a34a"/><rect x="27" y="3" width="16" height="24" rx="3" fill="#dbeafe"/></svg>Split</button>'
    +       '<button class="wbe-lo" id="wbl-hero-fullscreen" onclick="_wbe.layout(\'hero\',\'fullscreen\')" style="font-size:.7rem"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" style="display:block;margin:0 auto .35rem"><rect width="46" height="30" rx="4" fill="#0f172a"/><rect x="8" y="8" width="30" height="3" rx="1.5" fill="rgba(255,255,255,.55)"/><rect x="11" y="13" width="24" height="2" rx="1" fill="rgba(255,255,255,.25)"/><rect x="15" y="18" width="16" height="7" rx="2" fill="#16a34a"/></svg>Fullscreen</button>'
    +     '</div>'
    +   '</div>'
    +   '<div class="wbe-section"><span class="wbe-label">Servicios</span>'
    +     '<div style="display:flex;gap:.4rem">'
    +       '<button class="wbe-lo sel" id="wbl-services-grid" onclick="_wbe.layout(\'services\',\'grid\')" style="font-size:.7rem"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" style="display:block;margin:0 auto .35rem"><rect width="46" height="30" rx="4" fill="#f1f5f9"/><rect x="3" y="5" width="18" height="8" rx="2" fill="#e2e8f0"/><rect x="25" y="5" width="18" height="8" rx="2" fill="#e2e8f0"/><rect x="3" y="17" width="18" height="8" rx="2" fill="#e2e8f0"/><rect x="25" y="17" width="18" height="8" rx="2" fill="#e2e8f0"/></svg>Grid</button>'
    +       '<button class="wbe-lo" id="wbl-services-list" onclick="_wbe.layout(\'services\',\'list\')" style="font-size:.7rem"><svg width="46" height="30" viewBox="0 0 46 30" fill="none" style="display:block;margin:0 auto .35rem"><rect width="46" height="30" rx="4" fill="#f1f5f9"/><rect x="3" y="5" width="40" height="5" rx="2" fill="#e2e8f0"/><rect x="3" y="13" width="40" height="5" rx="2" fill="#e2e8f0"/><rect x="3" y="21" width="40" height="5" rx="2" fill="#e2e8f0"/></svg>Lista</button>'
    +     '</div>'
    +   '</div>'
    +   '<div class="wbe-section"><span class="wbe-label">DNA / Estilo visual</span>'
    +     '<select id="wbe-dna" class="wbe-input" onchange="_wbe.settings()">'
    +       '<option value="authority">Authority — oscuro, clínico</option>'
    +       '<option value="clinic">Clinic — azul, limpio</option>'
    +       '<option value="warm">Warm — cálido, humano</option>'
    +       '<option value="modern">Modern — dinámico</option>'
    +       '<option value="luxury">Luxury — premium, estético</option>'
    +     '</select>'
    +   '</div>'
    + '</div>'

    + '</div>' /* /wbe-sidebar */

    /* ── RIGHT PREVIEW ── */
    + '<div style="flex:1;background:#e5e7eb;display:flex;flex-direction:column;overflow:hidden;min-width:0">'
    +   '<div style="padding:.5rem .9rem;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:.5rem;flex-shrink:0">'
    +     '<span style="font-size:.7rem;font-weight:600;color:#9ca3af;flex:1">Vista previa</span>'
    +     '<button id="wbp-desktop" onclick="_wbe.preview(\'desktop\')" style="padding:.3rem .65rem;border-radius:7px;border:1.5px solid #16a34a;background:#f0fdf4;color:#16a34a;font-size:.72rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif">🖥 Desktop</button>'
    +     '<button id="wbp-mobile" onclick="_wbe.preview(\'mobile\')" style="padding:.3rem .65rem;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-size:.72rem;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif">📱 Mobile</button>'
    +     '<button onclick="_wbe.refresh()" title="Actualizar" style="padding:.3rem .55rem;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:.78rem;cursor:pointer">↻</button>'
    +   '</div>'
    +   '<div id="wbe-preview-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;padding:1.25rem;overflow:hidden">'
    +     '<div id="wbe-preview-device" style="width:100%;height:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 28px rgba(0,0,0,.14);transition:all .3s">'
    +       '<iframe id="wbe-preview-iframe" style="width:100%;height:100%;border:none" src="about:blank"></iframe>'
    +     '</div>'
    +   '</div>'
    + '</div>'

    + '</div>' /* /main-split */
    + '</div>'; /* /wbe-modal */
  }

  function _toggleRow(key, label, sub) {
    return '<div class="wbe-toggle-row">'
      + '<div><div style="font-size:.82rem;font-weight:600;color:#111827">'+label+'</div><div style="font-size:.68rem;color:#9ca3af">'+sub+'</div></div>'
      + '<label class="wbe-toggle"><input type="checkbox" id="ws-'+key+'" onchange="_wbe.settings()"><span class="wbe-tsl"></span></label>'
      + '</div>';
  }

  /* ── Inject modal into DOM ──────────────────────────────────────────────── */
  function _inject() {
    if (_injected) return;
    var s = document.createElement('style');
    s.id = 'wbe-css';
    s.textContent = _CSS;
    document.head.appendChild(s);
    document.body.insertAdjacentHTML('beforeend', _HTML(_opts.isAdmin));
    _injected = true;
  }

  /* ── Tab switching ──────────────────────────────────────────────────────── */
  function _setTab(tab) {
    ['contenido','modulos','apariencia','layout'].forEach(function(t) {
      var el = _el('wbtab-' + t); if (el) el.style.display = t === tab ? '' : 'none';
      var btn = _el('wbt-' + t);  if (btn) btn.classList.toggle('active', t === tab);
    });
  }

  /* ── Preview mode ───────────────────────────────────────────────────────── */
  function _setPreview(mode) {
    var dev  = _el('wbe-preview-device');
    var dBtn = _el('wbp-desktop');
    var mBtn = _el('wbp-mobile');
    var act  = 'padding:.3rem .65rem;border-radius:7px;border:1.5px solid #16a34a;background:#f0fdf4;color:#16a34a;font-size:.72rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif';
    var inact= 'padding:.3rem .65rem;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-size:.72rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif';
    if (mode === 'mobile') {
      dev.style.cssText = 'width:390px;height:100%;max-height:820px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 28px rgba(0,0,0,.18);transition:all .3s';
      if (dBtn) dBtn.style.cssText = inact;
      if (mBtn) mBtn.style.cssText = act;
    } else {
      dev.style.cssText = 'width:100%;height:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 28px rgba(0,0,0,.14);transition:all .3s';
      if (dBtn) dBtn.style.cssText = act;
      if (mBtn) mBtn.style.cssText = inact;
    }
  }

  /* ── Preview refresh ────────────────────────────────────────────────────── */
  function _refreshPreview() {
    var iframe = _el('wbe-preview-iframe');
    if (_slug && iframe) {
      iframe.src = '/demo.html?slug=' + encodeURIComponent(_slug) + '&preview=true&_t=' + Date.now();
    }
  }
  function _scheduleRefresh() {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(_refreshPreview, 2500);
  }

  /* ── Status UI ──────────────────────────────────────────────────────────── */
  function _updateStatusUI() {
    var badge = _el('wbe-status-badge');
    var warn  = _el('wbe-live-warning');
    var dep   = _el('wbe-btn-deploy');
    if (_isLive) {
      if (badge) { badge.textContent = '● Live'; badge.style.cssText = 'display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .6rem;border-radius:20px;font-size:.7rem;font-weight:700;background:#dcfce7;color:#16a34a;flex-shrink:0'; }
      if (warn)  warn.style.display = '';
      if (dep)   { dep.textContent = _opts.isAdmin ? 'Retirar' : 'Retirar'; dep.style.cssText = 'padding:.38rem .85rem;border-radius:8px;background:#fef2f2;color:#dc2626;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid #fecaca;font-family:DM Sans,sans-serif'; }
    } else {
      if (badge) { badge.textContent = '● Demo'; badge.style.cssText = 'display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .6rem;border-radius:20px;font-size:.7rem;font-weight:700;background:#fef3c7;color:#b45309;flex-shrink:0'; }
      if (warn)  warn.style.display = 'none';
      if (dep)   { dep.textContent = _opts.isAdmin ? '→ Deploy' : '→ Publicar'; dep.style.cssText = 'padding:.38rem .85rem;border-radius:8px;background:#fef3c7;color:#b45309;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid #fde68a;font-family:DM Sans,sans-serif'; }
    }
  }

  /* ── Health score ───────────────────────────────────────────────────────── */
  function _updateScore() {
    var checks = [
      { label: 'Foto',       ok: !!(_photoUrl || (_el('wbe-photo-thumb') && _el('wbe-photo-thumb').querySelector('img'))) },
      { label: 'Logo',       ok: !!(_logoUrl  || (_el('wbe-logo-thumb')  && _el('wbe-logo-thumb').querySelector('img')))  },
      { label: 'Titular',    ok: (_el('wbe-headline') && _el('wbe-headline').value.trim().length > 5) },
      { label: 'Servicios',  ok: (_el('wbe-services-list') && _el('wbe-services-list').querySelectorAll('[data-svc]').length > 0) },
      { label: 'Bio',        ok: (_el('wbe-bio') && _el('wbe-bio').value.trim().length > 10) },
      { label: 'Sobre',      ok: (_el('wbe-about') && _el('wbe-about').value.trim().length > 20) },
      { label: 'WhatsApp',   ok: (_el('ws-show_whatsapp') && _el('ws-show_whatsapp').checked) }
    ];
    var done = checks.filter(function(c) { return c.ok; }).length;
    var pct  = Math.round(done / checks.length * 100);
    var fill = _el('wbe-score-fill'); if (!fill) return;
    _el('wbe-score-pct').textContent = pct + '%';
    fill.style.width = pct + '%';
    fill.style.background = pct >= 80 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)';
    _el('wbe-score-checks').innerHTML = checks.map(function(c) {
      return '<span style="display:inline-flex;align-items:center;gap:.2rem;padding:.1rem .38rem;border-radius:20px;background:' + (c.ok ? '#dcfce7' : '#f1f5f9') + ';color:' + (c.ok ? '#16a34a' : '#9ca3af') + '">' + (c.ok ? '✓' : '○') + ' ' + c.label + '</span>';
    }).join('');
  }

  /* ── Layout/nav setters ─────────────────────────────────────────────────── */
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
    _scheduleRefresh();
  }

  /* ── Gallery ────────────────────────────────────────────────────────────── */
  function _renderGallery() {
    var el = _el('wbe-gallery-grid');
    if (!el) return;
    if (!_gallery.length) {
      el.innerHTML = '<div style="grid-column:1/-1;font-size:.72rem;color:#9ca3af;text-align:center;padding:.55rem;border:1.5px dashed #e5e7eb;border-radius:8px">Sin imágenes — sube fotos para el carrusel</div>';
      return;
    }
    el.innerHTML = _gallery.map(function(url, i) {
      return '<div style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#f3f4f6">'
        + '<img src="' + _esc(url) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy">'
        + '<button onclick="_wbe.delGallery(' + i + ')" style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.65);border:none;color:#fca5a5;font-size:.8rem;cursor:pointer;line-height:20px;text-align:center;padding:0">×</button>'
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
    if (st) st.textContent = '✓ Listo';
    if (type === 'photo') _photoUrl = pub; else _logoUrl = pub;
    input.value = '';
  }

  async function _uploadGallery(input) {
    var files = Array.from(input.files); if (!files.length) return;
    var btn = document.querySelector('[onclick*="wbe-gallery-input"]');
    if (btn) { btn.textContent = 'Subiendo...'; btn.disabled = true; }
    var ts = Date.now();
    for (var i = 0; i < files.length; i++) {
      var f    = files[i];
      var ext  = f.name.split('.').pop();
      var path = 'demo-media/' + _slug + '/gallery/' + ts + '_' + i + '.' + ext;
      var res  = await _sb().storage.from('growth-creatives').upload(path, f, { upsert: true, contentType: f.type });
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
    el.style.cssText = 'background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:.65rem .7rem;display:grid;gap:.35rem;position:relative';
    el.innerHTML = '<button onclick="this.closest(\'[data-svc]\').remove()" style="position:absolute;top:.35rem;right:.5rem;background:0;border:none;color:rgba(248,113,113,.5);cursor:pointer;font-size:1.05rem;line-height:1">×</button>'
      + '<div style="display:grid;grid-template-columns:52px 1fr;gap:.4rem">'
      + '<input class="svc-icon" placeholder="✦" maxlength="4" value="' + _esc(icon || '') + '" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:DM Sans,sans-serif;font-size:.82rem;outline:0;box-sizing:border-box;text-align:center;font-size:1.05rem">'
      + '<input class="svc-title" placeholder="Nombre del servicio" value="' + _esc(title || '') + '" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:DM Sans,sans-serif;font-size:.82rem;outline:0;box-sizing:border-box">'
      + '</div>'
      + '<textarea class="svc-desc" rows="2" placeholder="Descripción breve..." style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#111827;font-family:DM Sans,sans-serif;font-size:.82rem;outline:0;box-sizing:border-box;resize:none;line-height:1.4">' + _esc(desc || '') + '</textarea>';
    return el;
  }

  function _addService() {
    _el('wbe-services-list').appendChild(_serviceRow('', '', ''));
  }

  function _getServices() {
    var rows = _el('wbe-services-list').querySelectorAll('[data-svc]');
    var arr = [];
    rows.forEach(function(r) {
      var t = r.querySelector('.svc-title').value.trim();
      if (!t) return;
      arr.push({ i: r.querySelector('.svc-icon').value.trim() || '✦', t: t, d: r.querySelector('.svc-desc').value.trim() });
    });
    return arr;
  }

  /* ── Load data into form ────────────────────────────────────────────────── */
  function _loadData(d) {
    var config = d.web_config_jsonb || {};
    var ws     = d.web_settings    || {};
    _wsSettings = Object.assign({}, _WS_DEFAULTS, { dna: d.dna || 'authority' }, ws);
    _isLive     = !!d.activated_at;
    _photoUrl   = null; _logoUrl = null;
    _gallery    = Array.isArray(config.gallery) ? config.gallery.slice() : [];

    // Slug label
    var lbl = _el('wbe-slug-lbl'); if (lbl) lbl.textContent = '/' + _slug;
    _updateStatusUI();

    // Media thumbnails
    var purl = d.photo_url || config.doctor_photo_url || null;
    var th_p = _el('wbe-photo-thumb'); var st_p = _el('wbe-photo-st');
    if (th_p) th_p.innerHTML = purl ? '<img src="' + _esc(purl) + '" style="width:100%;height:100%;object-fit:cover">' : '📷';
    if (st_p) st_p.textContent = purl ? '✓ Cargada' : 'Cambiar';

    var lurl = d.logo_url || config.logo_url || null;
    var th_l = _el('wbe-logo-thumb'); var st_l = _el('wbe-logo-st');
    if (th_l) th_l.innerHTML = lurl ? '<img src="' + _esc(lurl) + '" style="width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply">' : '🏥';
    if (st_l) st_l.textContent = lurl ? '✓ Cargado' : 'Cambiar';
    _renderGallery();

    // Form fields
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

    var col = config.primary_color || '#1e5c3a';
    var colorEl = _el('wbe-color'); if (colorEl) colorEl.value = col;
    var colorVal = _el('wbe-color-val'); if (colorVal) colorVal.textContent = col;

    var diffs = Array.isArray(config.differentiators) ? config.differentiators : [];
    _set('wbe-diffs', diffs.map(function(x) { return typeof x === 'string' ? x : (x.t || x.text || x.title || x.name || ''); }).join('\n'));

    var list = _el('wbe-services-list');
    if (list) {
      list.innerHTML = '';
      var svcs = Array.isArray(config.services) ? config.services : (Array.isArray(config.servicios) ? config.servicios : []);
      svcs.forEach(function(s) { list.appendChild(_serviceRow(s.i || s.icon || '✦', s.t || s.title || s.name || '', s.d || s.desc || s.description || '')); });
      if (!svcs.length) list.appendChild(_serviceRow('', '', ''));
    }

    // Module toggles
    ['show_whatsapp','show_booking','show_carousel','show_calculator','show_services','show_doctors','show_instagram','show_map','show_insurance','show_cta'].forEach(function(k) {
      var el = _el('ws-' + k); if (el) el.checked = _wsSettings[k] !== false;
    });

    // Layout buttons
    ['centered','split','fullscreen'].forEach(function(v) { var b = _el('wbl-hero-' + v); if (b) b.classList.toggle('sel', (_wsSettings.hero_layout || 'split') === v); });
    ['grid','list'].forEach(function(v) { var b = _el('wbl-services-' + v); if (b) b.classList.toggle('sel', (_wsSettings.services_layout || 'grid') === v); });
    ['transparent','solid'].forEach(function(v) { var b = _el('wbs-nav-' + v); if (b) b.classList.toggle('sel', (_wsSettings.navbar_style || 'transparent') === v); });

    // DNA
    var dnaEl = _el('wbe-dna'); if (dnaEl) dnaEl.value = _wsSettings.dna || d.dna || 'authority';

    // UI reset
    var errEl = _el('wbe-error'); if (errEl) errEl.style.display = 'none';
    var saveBtn = _el('wbe-btn-save'); if (saveBtn) { saveBtn.textContent = 'Guardar'; saveBtn.disabled = false; }
    _setTab('contenido');
    _setPreview('desktop');
    setTimeout(_refreshPreview, 300);
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
      var diffs    = ((_el('wbe-diffs')       || {}).value || '').split('\n').map(function(l){return l.trim();}).filter(Boolean);
      var phi      = (_el('wbe-philosophy')   || {}).value || '';
      var cta      = (_el('wbe-cta')          || {}).value || '';
      var services = _getServices();
      if (ciudad)    config.city            = ciudad;
      if (headline)  config.headline        = headline;
      if (subhl)     config.subheadline     = subhl;
      if (bio)       config.hero_text       = bio;
      if (about)     config.about_text      = about;
      if (diffs.length) config.differentiators = diffs;
      if (phi)       config.philosophy      = phi;
      if (cta)       config.cta_final       = cta;
      config.primary_color = (_el('wbe-color') || {}).value || '#1e5c3a';
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
      if (errEl) { errEl.textContent = 'Error al guardar: ' + e.message; errEl.style.display = ''; }
      if (!silent && btn) { btn.textContent = 'Guardar'; btn.disabled = false; }
    }
  }

  /* ── Deploy / Publish ───────────────────────────────────────────────────── */
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

  /* ── View live ──────────────────────────────────────────────────────────── */
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

    // Re-update deploy button text (isAdmin might change between calls)
    var dep = _el('wbe-btn-deploy');
    if (dep) dep.textContent = _opts.isAdmin ? '→ Deploy' : '→ Publicar';

    var modal = _el('wbe-modal');
    if (modal) modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    var saveBtn = _el('wbe-btn-save'); if (saveBtn) { saveBtn.textContent = 'Guardando...'; saveBtn.disabled = true; }

    _sb().from('generated_demos')
      .select('slug,doctor_name,specialty,photo_url,logo_url,dna,web_config_jsonb,web_settings,activated_at')
      .eq('slug', slug)
      .maybeSingle()
      .then(function(res) {
        if (res.error) { console.error('[WebBuilder]', res.error); return; }
        if (!res.data) {
          // No record — show informative state
          var sidebar = _el('wbe-sidebar');
          if (sidebar) sidebar.innerHTML = '<div style="padding:2rem 1.5rem;text-align:center">'
            + '<div style="font-size:2rem;margin-bottom:.75rem">🏗️</div>'
            + '<div style="font-size:.92rem;font-weight:600;color:#374151;margin-bottom:.5rem">Sitio web no configurado</div>'
            + '<div style="font-size:.78rem;color:#9ca3af;line-height:1.6">Tu sitio web aún no está listo. El equipo de CitaDoc lo está configurando. Una vez activo podrás editarlo aquí.</div>'
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

  /* ── Public API (window exports) ────────────────────────────────────────── */
  window.webBuilderOpen  = open;
  window.webBuilderClose = close;

  // Namespace for inline event handlers in the modal HTML
  window._wbe = {
    close:        close,
    save:         function() { _save(false); },
    tab:          _setTab,
    preview:      _setPreview,
    layout:       _setLayout,
    nav:          _setNav,
    settings:     _saveSettings,
    addSvc:       _addService,
    delGallery:   _deleteGallery,
    uploadMedia:  _uploadMedia,
    uploadGallery:_uploadGallery,
    deploy:       _deployWeb,
    view:         _verWeb,
    refresh:      _refreshPreview,
    schedRefresh: _scheduleRefresh
  };

})(window, document);
