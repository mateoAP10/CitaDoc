// ── Patient helpers (pre-existing) ────────────────────────────────────────
function buscarOCrearPaciente(e,n,t,a){return fetch("https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/booking-resolve-patient",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre:n,email:t||null,telefono:a||null})}).then((function(r){return r.json()})).then((function(j){return j.ok?j.patient_id:null})).catch((function(){return null}))}

// ── Booking UI Module ──────────────────────────────────────────────────────
(function () {
  'use strict';

  // State
  var selectedDoctor     = null;
  var selectedDate       = null;
  var selectedSlot       = null;
  var selectedLocationId = null;
  var currentStep        = 1;
  var dispModal          = {};
  var _locationsModal    = [];
  var calYear            = new Date().getFullYear();
  var calMonth           = new Date().getMonth();

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    if (typeof window.logEvent === 'function') window.logEvent(name, detail);
  }

  function openModal(id) {
    var docs = window.ALL_DOCTORS || [];
    selectedDoctor = docs.find(function (d) { return d.id === id; });
    if (!selectedDoctor) return;
    window.setText('modalDocName', selectedDoctor.name);
    window.setText('modalDocMeta', selectedDoctor.specialty + ' · ' + selectedDoctor.city + ' · $' + selectedDoctor.price);
    var pl = window.el('btnVerPerfil');
    if (pl && selectedDoctor.slug) pl.href = 'citadoc-perfil.html?slug=' + selectedDoctor.slug;
    var bw = window.el('waBanner');
    if (bw) {
      if (selectedDoctor.whatsapp) {
        var waNum = selectedDoctor.whatsapp.replace(/[^0-9]/g, '');
        var waMsg = 'Hola ' + selectedDoctor.name + ', vi tu perfil en CitaDoc y quisiera agendar una cita.';
        var a = document.createElement('a');
        a.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(waMsg);
        a.target = '_blank';
        a.style.cssText = 'display:flex;align-items:center;gap:.6rem;background:#f0fdf4;border:1.5px solid #16a34a;border-radius:10px;padding:.65rem .9rem;margin-bottom:.9rem;text-decoration:none';
        a.innerHTML = '<span style="font-size:.82rem;font-weight:700;color:#16a34a">💬 Contactar por WhatsApp</span><span style="margin-left:auto;font-size:.78rem;color:#16a34a">Abrir →</span>';
        bw.innerHTML = ''; bw.appendChild(a);
      } else { bw.innerHTML = ''; }
    }
    selectedDate = null; selectedSlot = null; selectedLocationId = null; currentStep = 1;
    calYear = new Date().getFullYear(); calMonth = new Date().getMonth();
    resetSteps();
    window.el('slotsWrap').style.display = 'none';
    window.el('bookingForm').style.display = 'block';
    window.el('successState').style.display = 'none';
    window.el('btnSig1').disabled = true;
    window.el('btnSig1').style.opacity = '.4';
    window._sb.from('doctor_locations').select('*').eq('medico_id', selectedDoctor.id).order('created_at')
      .then(function (resLoc) {
        _locationsModal = resLoc.data || [];
        renderSedeSelectorModal(_locationsModal);
        cargarDispModal();
      });
    window.el('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    emit('booking-opened', { doctorId: id, doctorName: selectedDoctor.name });
  }

  function closeModal() {
    window.el('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function resetSteps() {
    [window.el('mStep1'), window.el('mStep2'), window.el('mStep3')].forEach(function (e, i) {
      if (e) e.style.display = i === 0 ? 'block' : 'none';
    });
    for (var i = 1; i <= 3; i++) {
      var n = window.el('msn' + i), l = window.el('msl' + i);
      if (n) { n.className = 'm-step-num' + (i === 1 ? ' active' : ''); n.textContent = i; }
      if (l) { l.className = 'm-step-label' + (i === 1 ? ' active' : ''); }
      if (i <= 2 && window.el('msc' + i)) window.el('msc' + i).className = 'm-connector';
    }
  }

  function goStep(n) {
    var MESES = window.MESES;
    if (n === 2 && !selectedSlot) { alert('Selecciona un horario.'); return; }
    if (n === 3) {
      var nom = window.el('inpNombre').value.trim();
      var tel = window.el('inpTel').value.trim();
      if (!nom || !tel) { alert('Completa nombre y teléfono.'); return; }
      window.setText('resMedico', selectedDoctor.name);
      var parts = selectedDate.split('-');
      var horaLabel = selectedSlot + ' · ' + parseInt(parts[2]) + ' ' + MESES[parseInt(parts[1]) - 1];
      if (selectedLocationId && _locationsModal.length) {
        var sedeSel = _locationsModal.find(function (l) { return String(l.id) === String(selectedLocationId); });
        if (sedeSel) horaLabel += ' · 📍 ' + (sedeSel.nombre || 'Consultorio');
      }
      window.setText('resHora', horaLabel);
      window.setText('resNombre', nom);
      window.setText('resTel', tel);
    }
    window.el('mStep' + currentStep).style.display = 'none';
    window.el('mStep' + n).style.display = 'block';
    for (var i = 1; i <= 3; i++) {
      var nm = window.el('msn' + i), lb = window.el('msl' + i), co = i <= 2 ? window.el('msc' + i) : null;
      if (i < n) { nm.className = 'm-step-num done'; nm.textContent = '✓'; lb.className = 'm-step-label done'; if (co) co.className = 'm-connector done'; }
      else if (i === n) { nm.className = 'm-step-num active'; nm.textContent = i; lb.className = 'm-step-label active'; }
      else { nm.className = 'm-step-num'; nm.textContent = i; lb.className = 'm-step-label'; }
    }
    currentStep = n;
  }

  // P6.2 -- mensaje inyectado por JS (no en el HTML estatico de cada
  // template) porque el modal de booking.js se embebe identico en varias
  // paginas (dna-*.html, index.html, demo.html, citadoc-web.html); un solo
  // lugar evita duplicar el markup en cada una.
  function toggleSedeSinHorarioMsgModal(show) {
    var wrap = window.el('sedeSelectorWrap');
    if (!wrap) return;
    var msg = window.el('sedeSinHorarioMsgModal');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'sedeSinHorarioMsgModal';
      msg.style.cssText = 'display:none;background:#f9fafb;border:1.5px dashed #e5e7eb;border-radius:12px;padding:.85rem 1rem;margin-bottom:1rem;font-size:.82rem;color:#6b7280;text-align:center';
      msg.textContent = 'Esta sede aún no tiene horarios configurados.';
      wrap.insertAdjacentElement('afterend', msg);
    }
    msg.style.display = show ? 'block' : 'none';
  }

  function cargarDispModal() {
    var hoy = new Date().toISOString().split('T')[0];
    var en60 = new Date(); en60.setDate(en60.getDate() + 60);
    window._sb.from('citas_disponibilidad').select('fecha,hora')
      .eq('medico_id', selectedDoctor.id)
      .gte('fecha', hoy).lte('fecha', en60.toISOString().split('T')[0])
      .neq('estado', 'cancelada')
      .then(function (res) {
        window.cargarDisponibilidadPorSede(selectedDoctor, res.data || [], window._sb, selectedLocationId)
          .then(function (r) { dispModal = r.disp; toggleSedeSinHorarioMsgModal(r.sedeConfigurada === false); renderCal(); });
      });
  }

  function renderSedeSelectorModal(locs) {
    _locationsModal = locs || [];
    var wrap = window.el('sedeSelectorWrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!locs || locs.length === 0) { wrap.style.display = 'none'; selectedLocationId = null; return; }
    if (locs.length === 1) {
      selectedLocationId = locs[0].id; wrap.style.display = 'block';
      var label = document.createElement('div'); label.className = 'sede-info-label';
      label.innerHTML = '📍 <strong>' + (locs[0].nombre || 'Consultorio') + '</strong> · ' + (locs[0].direccion ? locs[0].direccion.split(',').slice(0,2).join(',') : '');
      wrap.appendChild(label); return;
    }
    wrap.style.display = 'block';
    var title = document.createElement('div'); title.className = 'sede-selector-label'; title.textContent = 'Selecciona una sede';
    wrap.appendChild(title);
    locs.forEach(function (loc) {
      var card = document.createElement('div'); card.className = 'sede-card';
      if (String(selectedLocationId) === String(loc.id)) card.classList.add('selected');
      var name = document.createElement('div'); name.className = 'sede-name'; name.textContent = loc.nombre || 'Consultorio';
      var addr = document.createElement('div'); addr.className = 'sede-addr'; addr.textContent = loc.direccion ? loc.direccion.split(',').slice(0,2).join(',') : '';
      var chip = document.createElement('span'); chip.className = 'sede-chip'; chip.textContent = 'Elegir esta sede';
      card.appendChild(name); card.appendChild(addr); card.appendChild(chip);
      card.addEventListener('click', function () {
        selectedLocationId = loc.id; selectedDate = null; selectedSlot = null;
        window.el('slotsWrap').style.display = 'none';
        window.el('btnSig1').disabled = true; window.el('btnSig1').style.opacity = '.4';
        renderSedeSelectorModal(locs); cargarDispModal();
      });
      wrap.appendChild(card);
    });
  }

  function renderCal() {
    var MESES = window.MESES; var pad2 = window.pad2;
    var titleEl = window.el('calTitle');
    if (titleEl) titleEl.textContent = MESES[calMonth] + ' ' + calYear;
    var first = new Date(calYear, calMonth, 1).getDay();
    var days  = new Date(calYear, calMonth + 1, 0).getDate();
    var today = new Date(); today.setHours(0,0,0,0);
    var grid  = window.el('calGrid');
    if (!grid) return;
    grid.innerHTML = '';
    ['D','L','M','X','J','V','S'].forEach(function (d) { var div = document.createElement('div'); div.className = 'modal-cal-dow'; div.textContent = d; grid.appendChild(div); });
    for (var i = 0; i < first; i++) grid.appendChild(document.createElement('div'));
    for (var d = 1; d <= days; d++) {
      var date = new Date(calYear, calMonth, d);
      var fStr = calYear + '-' + pad2(calMonth+1) + '-' + pad2(d);
      var isPast = date < today, isAvail = !isPast && !!dispModal[fStr], isSel = selectedDate === fStr;
      var div = document.createElement('div');
      div.className = 'modal-cal-day' + (isPast?' past':'') + (date.getTime()===today.getTime()?' today':'') + (isAvail?' available':'') + (isSel?' selected':'');
      div.textContent = d;
      if (isAvail) (function(fs){ div.addEventListener('click', function(){ selectFecha(fs); }); })(fStr);
      grid.appendChild(div);
    }
    renderMobileDaysModal();
  }

  function renderMobileDaysModal() {
    var container = window.el('modalCalDaysMobile');
    if (!container) return;
    container.innerHTML = '';
    var today = new Date(); today.setHours(0,0,0,0);
    var diaNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    var mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var currentMonth = -1; var selCard = null;
    for (var i = 0; i < 60; i++) {
      var date = new Date(today); date.setDate(today.getDate() + i);
      var fStr = date.toISOString().split('T')[0];
      if (date.getMonth() !== currentMonth) {
        currentMonth = date.getMonth();
        var lw = document.createElement('div'); lw.className = 'modal-month-label';
        var ls = document.createElement('span'); ls.textContent = mesesCortos[currentMonth]; lw.appendChild(ls); container.appendChild(lw);
      }
      var card = document.createElement('div');
      card.className = 'modal-day-card' + (date.getTime()===today.getTime()?' today':'') + (dispModal[fStr]?' available':'') + (selectedDate===fStr?' selected':'');
      var ne = document.createElement('span'); ne.className = 'day-name'; ne.textContent = diaNames[date.getDay()]; card.appendChild(ne);
      var num = document.createElement('span'); num.className = 'day-num'; num.textContent = date.getDate(); card.appendChild(num);
      if (dispModal[fStr]) (function(fs){ card.addEventListener('click', function(){ selectFecha(fs); }); })(fStr);
      if (selectedDate === fStr) selCard = card;
      container.appendChild(card);
    }
    if (selCard) setTimeout(function(){ selCard.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' }); }, 50);
  }

  function selectFecha(fechaStr) {
    var MESES = window.MESES;
    selectedDate = fechaStr; selectedSlot = null; renderCal();
    var slots = dispModal[fechaStr] || [];
    var slotsEl = window.el('timeSlots'); slotsEl.innerHTML = '';
    if (!slots.length) {
      slotsEl.innerHTML = '<p style="font-size:.82rem;color:var(--muted2);grid-column:1/-1">Sin horarios este día</p>';
    } else {
      slots.forEach(function (t) {
        var btn = document.createElement('div'); btn.className = 'time-slot'; btn.textContent = t;
        btn.addEventListener('click', function () {
          document.querySelectorAll('.time-slot').forEach(function(s){ s.classList.remove('selected'); });
          btn.classList.add('selected'); selectedSlot = t;
          var b = window.el('btnSig1'); if (b) { b.disabled = false; b.style.opacity = '1'; }
        });
        slotsEl.appendChild(btn);
      });
    }
    var parts = fechaStr.split('-');
    window.setText('slotsLabel', 'Horarios - ' + parseInt(parts[2]) + ' ' + MESES[parseInt(parts[1])-1]);
    window.el('slotsWrap').style.display = 'block';
    window.el('btnSig1').disabled = true; window.el('btnSig1').style.opacity = '.4';
  }

  function confirmarCita() {
    var MESES = window.MESES;
    var nombre = window.el('inpNombre').value.trim();
    var tel    = window.el('inpTel').value.trim();
    var email  = window.el('inpEmail').value.trim();
    var motivo = window.el('inpMotivo').value.trim();
    if (!nombre || !tel || !selectedSlot || !selectedDate || !selectedDoctor) return;
    var btn = window.el('btnConfirmar');
    if (btn) { btn.textContent = 'Confirmando...'; btn.disabled = true; }
    var parts = selectedDate.split('-');
    var fechaLabel = parseInt(parts[2]) + ' de ' + MESES[parseInt(parts[1])-1] + ' ' + parts[0];
    window.buscarOCrearPaciente(window._sb, nombre, email, tel).then(function (pacienteId) {
      window._sb.from('citas_disponibilidad').select('medico_id')
        .eq('medico_id', selectedDoctor.id).eq('fecha', selectedDate).eq('hora', selectedSlot)
        .in('estado', ['confirmada','pendiente'])
        .then(function (check) {
          if (check.data && check.data.length > 0) {
            alert('Este horario acaba de ser reservado por otra persona. Por favor selecciona otro horario.');
            window.el('bookingForm').style.display = 'block'; window.el('successState').style.display = 'none';
            if (btn) { btn.textContent = 'Confirmar cita'; btn.disabled = false; }
            emit('booking-failed', { reason: 'slot_taken' }); return;
          }
          window._sb.from('citas').insert({
            medico_id: selectedDoctor.id, paciente_id: pacienteId||null,
            paciente_nombre: nombre, paciente_email: email||null, paciente_tel: tel,
            motivo: motivo||null, fecha: selectedDate, hora: selectedSlot, estado: 'confirmada'
          }).then(function (res) {
            if (res.error) {
              if (res.error.message && res.error.message.indexOf('unique_slot_cita') > -1) {
                alert('Ese horario acaba de ser reservado por otro paciente. Por favor selecciona otro.');
                window.el('bookingForm').style.display = 'block'; window.el('successState').style.display = 'none';
                cargarDispModal(); emit('booking-failed', { reason: 'unique_constraint' });
              } else { console.error('Error cita:', res.error); emit('booking-failed', { reason: res.error.message }); }
            }
          });
        });
    });
    if (email) window.citadocSendEmail('appointment', { to_email: email, doctor_name: selectedDoctor.name, patient_name: nombre, appointment_date: fechaLabel, appointment_time: selectedSlot, location_name: 'Consultorio médico', appointment_mode: '🏥 Presencial', public_profile_url: 'https://citadoc.lat/citadoc-perfil.html?slug='+(selectedDoctor.slug||''), lang: window._currentLang||'es' });
    if (selectedDoctor.email) window.citadocSendEmail('appointment', { to_email: selectedDoctor.email, doctor_name: selectedDoctor.name, patient_name: nombre, appointment_date: fechaLabel, appointment_time: selectedSlot, location_name: 'Consultorio médico', appointment_mode: '📋 Dashboard', public_profile_url: 'https://citadoc.lat/citadoc-dashboard.html', lang: (function(){var m={'ar':'es','bo':'es','br':'pt','cl':'es','co':'es','cr':'es','cu':'es','de':'de','ec':'es','eg':'ar','es':'es','fr':'fr','gb':'en','gt':'es','hn':'es','il':'en','in':'en','it':'it','jp':'ja','kr':'ko','mx':'es','ni':'es','pa':'es','pe':'es','pt':'pt','py':'es','ro':'ro','ru':'ru','sa':'ar','sg':'en','sv':'es','tr':'tr','ua':'ru','ae':'ar','us':'en','uy':'es','ve':'es','au':'en','ca':'en','nz':'en'};return m[selectedDoctor.country]||'es';})() });
    window.el('bookingForm').style.display = 'none'; window.el('successState').style.display = 'block';
    var sedeMsg = '';
    if (selectedLocationId && _locationsModal.length) {
      var sm = _locationsModal.find(function(l){ return String(l.id)===String(selectedLocationId); });
      if (sm) sedeMsg = ' 📍 ' + (sm.nombre || 'Consultorio');
    }
    window.setText('successMsg', nombre + ', tu cita con ' + selectedDoctor.name + ' está confirmada para el ' + fechaLabel + ' a las ' + selectedSlot + '.' + sedeMsg + (email ? ' Enviamos confirmación a ' + email + '.' : ''));
    if (btn) { btn.textContent = 'Confirmar cita'; btn.disabled = false; }
    var waWrapDir = window.el('waNotificarWrapDir'), waBtnDir = window.el('btnWANotificarDir');
    if (waWrapDir && waBtnDir && selectedDoctor.whatsapp) {
      var waNum = window.limpiarNumeroWA(selectedDoctor.whatsapp, selectedDoctor.country);
      if (waNum) { waBtnDir.href = 'https://wa.me/'+waNum+'?text='+encodeURIComponent('Hola '+selectedDoctor.name+', acabo de agendar una cita para el '+fechaLabel+' a las '+selectedSlot+'. Soy '+nombre+' ('+tel+'). ¡Muchas gracias!'); waWrapDir.style.display = 'block'; }
    }
    emit('booking-confirmed', { doctorId: selectedDoctor.id, doctorName: selectedDoctor.name, date: selectedDate, slot: selectedSlot, patient: nombre });
  }

  function initCalNav() {
    var prev = window.el('btnCalPrev'), next = window.el('btnCalNext');
    if (prev) prev.addEventListener('click', function(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCal(); });
    if (next) next.addEventListener('click', function(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCal(); });
  }

  // Public API
  window.openModal     = openModal;
  window.closeModal    = closeModal;
  window.goStep        = goStep;
  window.confirmarCita = confirmarCita;
  window.selectFecha   = selectFecha;
  window.renderCal     = renderCal;
  // Expose state getters — wrapped in try/catch to avoid conflicts with pages that define these vars globally
  var _defs = [
    ['selectedDoctor',     function(){ return selectedDoctor; },     null],
    ['selectedDate',       function(){ return selectedDate; },       null],
    ['selectedSlot',       function(){ return selectedSlot; },       null],
    ['selectedLocationId', function(){ return selectedLocationId; }, null],
    ['dispModal',          function(){ return dispModal; },          null],
    ['calYear',            function(){ return calYear; },            function(v){ calYear = v; }],
    ['calMonth',           function(){ return calMonth; },           function(v){ calMonth = v; }]
  ];
  _defs.forEach(function(d) {
    try {
      var desc = { get: d[1], configurable: true };
      if (d[2]) desc.set = d[2];
      Object.defineProperty(window, d[0], desc);
    } catch(e) { /* already defined as non-configurable global — skip */ }
  });

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initCalNav); } else { initCalNav(); }

})();