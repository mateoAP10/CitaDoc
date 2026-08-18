// Sección de reseñas para el perfil público del médico (cinema-v1..v5).
// Un solo módulo compartido en vez de duplicar markup en cada template --
// se auto-inserta como bloque independiente (fondo/colores propios, no
// depende de las variables CSS de cada template) justo antes de la sección
// del CTA final, que es el único ancla presente en las 5 plantillas.
//
// Privacidad: resenas NUNCA guarda nombre/email del paciente (solo
// cita_id, medico_id, ratings, comentario) -- no hay nada que enmascarar,
// siempre se firma "Paciente verificado".
(function(){
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function stars(n){
    n = Math.round(n||0);
    var s = '';
    for(var i=1;i<=5;i++) s += i<=n ? '★' : '☆';
    return s;
  }

  // opts: {before:'id'} inserta el bloque justo antes de la sección/panel que
  // contiene ese id (ej. justo antes del CTA final); {after:'id'} lo inserta
  // justo después de ese elemento. Los 5 templates cinema-v1..v5 no comparten
  // exactamente la misma estructura de secciones -- cinema-v4 en particular no
  // tiene el ancla cCtaSub que usan los otros 4, así que necesita su propio
  // punto de inserción (after: pLoc, el último panel de contenido real).
  async function mount(sb, medico, opts){
    if(!medico || !medico.id) return;
    var total = medico.total_resenas || 0;
    if(total < 1) return; // sin reseñas todavía -- no mostrar nada, no un placeholder vacío

    opts = opts || {};
    var mode = opts.before ? 'before' : 'after';
    var anchor = document.getElementById(opts.before || opts.after);
    var target = anchor ? (anchor.closest('section') || anchor.closest('.spanel') || anchor.parentElement) : null;
    if(!target || !target.parentNode) return;

    var r = await sb.from('resenas')
      .select('rating_medico,comentario,created_at')
      .eq('medico_id', medico.id)
      .not('comentario', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6);
    var reviews = (r.data || []).filter(function(x){ return x.comentario && x.comentario.trim(); });

    var accColor = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#0b7c6e';
    var rating = (medico.rating_promedio || 0).toFixed(1);

    var cardsHtml = reviews.map(function(rv){
      return '<div style="background:#fff;border-radius:18px;padding:26px 28px;box-shadow:0 4px 20px rgba(0,0,0,.07);width:320px;max-width:100%;text-align:left;flex-shrink:0">'
        + '<div style="color:'+accColor+';font-size:1.05rem;letter-spacing:2px;margin-bottom:.7rem">'+stars(rv.rating_medico)+'</div>'
        + '<p style="color:#1a1a1a;font-size:.92rem;line-height:1.65;margin-bottom:1.1rem">&ldquo;'+esc(rv.comentario)+'&rdquo;</p>'
        + '<div style="color:#8a8a8a;font-size:.76rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Paciente verificado</div>'
        + '</div>';
    }).join('');

    var wrap = document.createElement('div');
    wrap.id = 'citadocReviewsSection';
    wrap.style.cssText = 'background:#faf8f5;padding:72px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    wrap.innerHTML =
      '<div style="max-width:1040px;margin:0 auto;text-align:center">'
      +   '<div style="display:inline-flex;align-items:center;gap:.5rem;background:#fff;border-radius:50px;padding:.6rem 1.3rem;margin-bottom:2rem;box-shadow:0 2px 12px rgba(0,0,0,.07)">'
      +     '<span style="color:'+accColor+';font-size:1rem">★</span>'
      +     '<span style="font-weight:800;font-size:1rem;color:#1a1a1a">'+rating+'</span>'
      +     '<span style="color:#a0a0a0;font-size:.85rem">&nbsp;·&nbsp;'+total+' reseña'+(total===1?'':'s')+'</span>'
      +   '</div>'
      +   '<h2 style="font-size:1.7rem;font-weight:800;color:#1a1a1a;margin:0 0 2.2rem;letter-spacing:-.02em">Lo que dicen mis pacientes</h2>'
      +   (cardsHtml
            ? '<div style="display:flex;gap:20px;overflow-x:auto;padding:6px 2px 14px;justify-content:center;flex-wrap:wrap">'+cardsHtml+'</div>'
            : '<p style="color:#8a8a8a;font-size:.9rem">Aún no hay comentarios escritos.</p>')
      + '</div>';

    if(mode === 'before') target.parentNode.insertBefore(wrap, target);
    else target.parentNode.insertBefore(wrap, target.nextSibling);
  }

  window.CitaDocReviews = { mount: mount };
})();
