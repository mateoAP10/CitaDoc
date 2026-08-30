/* AgendarCinema — inline booking modal for cinema templates
   Uses: window._sb (Supabase), window.buscarOCrearPaciente, window.cargarDisponibilidadPorSede (from shared.js)
*/
(function(){
'use strict';

var EMAIL_FN='https://qxoomcqaafogczrvsyhg.supabase.co/functions/v1/send-email';
var EMAIL_KEY='citadoc-public-2026';
var MO=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
var MO_LARGO=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var DI=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

var _medico=null,_locs=[],_locSel=null,_date=null,_slot=null,_disp={},_step=1;

function sendEmail(payload){
  try{fetch(EMAIL_FN,{method:'POST',headers:{'Content-Type':'application/json','x-citadoc-public-key':EMAIL_KEY},body:JSON.stringify(payload)});}catch(e){}
}

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ─── INJECT CSS + HTML ──────────────────────────────────────────────────────
function inject(){
  if(document.getElementById('acOverlay')) return;

  var style=document.createElement('style');
  style.textContent=[
    '#acOverlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;align-items:flex-end;justify-content:center;}',
    '#acOverlay.open{display:flex}',
    '@media(min-width:600px){#acOverlay{align-items:center}}',
    '#acSheet{width:100%;max-width:480px;background:#0E0E14;border-radius:20px 20px 0 0;max-height:92svh;overflow-y:auto;position:relative;padding-bottom:env(safe-area-inset-bottom,16px);}',
    '@media(min-width:600px){#acSheet{border-radius:20px;max-height:88vh;}}',
    '#acHandle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.1);margin:12px auto 0;}',
    '#acHead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07);}',
    '#acTitle{font-family:"Inter",sans-serif;font-size:.98rem;font-weight:700;color:#fff;}',
    '#acClose{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.07);color:rgba(255,255,255,.55);font-size:.82rem;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;flex-shrink:0;font-family:inherit;}',
    '#acClose:hover{background:rgba(255,255,255,.13)}',
    '#acStepBar{display:flex;align-items:center;gap:6px;padding:14px 20px 0;}',
    '.ac-pill{height:3px;border-radius:2px;flex:1;background:rgba(255,255,255,.1);transition:background .3s;}',
    '.ac-pill.done,.ac-pill.active{background:var(--acc,#4F8CFF);}',
    '#acStepLbl{font-size:.7rem;font-weight:600;letter-spacing:.06em;color:rgba(255,255,255,.3);text-transform:uppercase;padding:7px 20px 0;}',
    '#acBody{padding:4px 20px 8px;}',
    '.ac-sec{font-size:.7rem;font-weight:700;letter-spacing:.07em;color:rgba(255,255,255,.35);text-transform:uppercase;margin:16px 0 8px;}',
    '.ac-sec:first-child{margin-top:10px;}',
    '.ac-sede{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:12px;border:1.5px solid rgba(255,255,255,.07);cursor:pointer;margin-bottom:7px;transition:border-color .2s,background .2s;}',
    '.ac-sede.sel,.ac-sede:hover{border-color:var(--acc,#4F8CFF);background:rgba(79,140,255,.07);}',
    '.ac-sede-ico{width:32px;height:32px;border-radius:9px;background:rgba(79,140,255,.12);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;}',
    '.ac-sede-n{font-size:.84rem;font-weight:600;color:#fff}',
    '.ac-sede-a{font-size:.73rem;color:rgba(255,255,255,.38);margin-top:1px}',
    '#acDayScroll{display:flex;gap:7px;overflow-x:auto;padding:0 20px 4px;margin:0 -20px;scrollbar-width:none;}',
    '#acDayScroll::-webkit-scrollbar{display:none}',
    '.ac-mosep{font-size:.62rem;font-weight:700;color:rgba(255,255,255,.22);letter-spacing:.06em;text-transform:uppercase;align-self:center;flex-shrink:0;padding-top:4px;}',
    '.ac-day{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:50px;padding:9px 0;border-radius:12px;border:1.5px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);cursor:default;opacity:.3;flex-shrink:0;transition:border-color .2s,background .2s,opacity .2s;}',
    '.ac-day.av{opacity:1;cursor:pointer;}',
    '.ac-day.av:hover,.ac-day.sel{border-color:var(--acc,#4F8CFF);background:rgba(79,140,255,.1);}',
    '.ac-dn{font-size:.62rem;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:.04em}',
    '.ac-dd{font-size:1.1rem;font-weight:800;color:#fff}',
    '#acSlotsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:4px;}',
    '.ac-slot{padding:9px 0;border-radius:10px;border:1.5px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);font-size:.8rem;font-weight:600;color:rgba(255,255,255,.8);text-align:center;cursor:pointer;transition:border-color .2s,background .2s,color .2s;}',
    '.ac-slot:hover,.ac-slot.sel{border-color:var(--acc,#4F8CFF);background:rgba(79,140,255,.12);color:var(--acc,#4F8CFF);}',
    '.ac-slots-empty{font-size:.8rem;color:rgba(255,255,255,.28);padding:12px 0;grid-column:1/-1;}',
    '.ac-lbl{font-size:.72rem;font-weight:600;letter-spacing:.04em;color:rgba(255,255,255,.35);margin:16px 0 5px;}',
    '.ac-lbl:first-child{margin-top:8px;}',
    '.ac-inp{width:100%;padding:11px 13px;border-radius:11px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.08);color:#fff;font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s;}',
    '.ac-inp:focus{border-color:var(--acc,#4F8CFF);}',
    '.ac-inp::placeholder{color:rgba(255,255,255,.22)}',
    '.ac-sum{border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);padding:14px;margin:10px 0;}',
    '.ac-sr{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);}',
    '.ac-sr:last-child{border-bottom:none}',
    '.ac-sk{font-size:.73rem;color:rgba(255,255,255,.38);}',
    '.ac-sv{font-size:.8rem;font-weight:600;color:#fff;text-align:right;max-width:58%;}',
    '#acSuccess{padding:32px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;}',
    '.ac-ok-i{font-size:2.2rem;line-height:1}',
    '.ac-ok-t{font-family:"Inter",sans-serif;font-size:1.05rem;font-weight:800;color:#fff}',
    '.ac-ok-m{font-size:.82rem;color:rgba(255,255,255,.45);line-height:1.55;max-width:300px}',
    '.ac-wa{display:inline-flex;align-items:center;gap:8px;background:rgba(37,211,102,.1);border:1.5px solid rgba(37,211,102,.22);border-radius:12px;padding:10px 18px;color:#25D366;font-weight:700;font-size:.84rem;text-decoration:none;margin-top:6px;}',
    '#acFoot{padding:12px 20px 4px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;}',
    '#acBack{height:44px;padding:0 16px;border-radius:12px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);font-size:.88rem;font-weight:600;border:none;cursor:pointer;font-family:inherit;flex-shrink:0;}',
    '#acNext{flex:1;height:44px;border-radius:12px;background:var(--acc,#4F8CFF);color:#fff;font-size:.92rem;font-weight:700;border:none;cursor:pointer;font-family:"Inter",sans-serif;transition:opacity .2s;}',
    '#acNext:disabled{opacity:.35;cursor:default;}'
  ].join('');
  document.head.appendChild(style);

  var div=document.createElement('div');
  div.innerHTML='<div id="acOverlay">'
    +'<div id="acSheet">'
    +'<div id="acHandle"></div>'
    +'<div id="acHead"><div id="acTitle">Agendar consulta</div><button id="acClose">✕</button></div>'
    +'<div id="acStepBar"><div class="ac-pill" id="acP1"></div><div class="ac-pill" id="acP2"></div><div class="ac-pill" id="acP3"></div></div>'
    +'<div id="acStepLbl"></div>'
    +'<div id="acBody"></div>'
    +'<div id="acFoot"><button id="acBack">Atrás</button><button id="acNext" disabled>Continuar</button></div>'
    +'</div></div>';
  document.body.appendChild(div.firstChild);

  document.getElementById('acClose').addEventListener('click', acClose);
  document.getElementById('acOverlay').addEventListener('click', function(e){if(e.target===this) acClose();});
  document.getElementById('acBack').addEventListener('click', goBack);
  document.getElementById('acNext').addEventListener('click', goNext);
}

// ─── STEP UI ────────────────────────────────────────────────────────────────
var LBLS=['Selecciona fecha y hora','Tus datos','Confirmar cita'];

function updateStepUI(){
  document.getElementById('acStepLbl').textContent=LBLS[_step-1];
  ['acP1','acP2','acP3'].forEach(function(id,i){
    var p=document.getElementById(id);
    p.className='ac-pill'+(i<_step-1?' done':i===_step-1?' active':'');
  });
  document.getElementById('acBack').style.display=_step>1?'block':'none';
  var nx=document.getElementById('acNext');
  nx.textContent=_step===3?'Confirmar cita':'Continuar';
  if(_step===1) nx.disabled=!(_date&&_slot);
  else if(_step===2) nx.disabled=false;
}

function renderStep(){
  var suc=document.getElementById('acSuccess');if(suc)suc.remove();
  document.getElementById('acFoot').style.display='flex';
  if(_step===1) renderStep1();
  else if(_step===2) renderStep2();
  else renderStep3();
  updateStepUI();
}

// ─── STEP 1: dates + slots ───────────────────────────────────────────────────
function renderStep1(){
  var body=document.getElementById('acBody');
  body.innerHTML='';

  // Sede
  if(_locs.length>1){
    var t=document.createElement('div');t.className='ac-sec';t.textContent='Selecciona una sede';body.appendChild(t);
    _locs.forEach(function(l){
      var c=document.createElement('div');
      c.className='ac-sede'+(String(_locSel)===String(l.id)?' sel':'');
      c.innerHTML='<div class="ac-sede-ico">📍</div><div><div class="ac-sede-n">'+esc(l.nombre||'Consultorio')+'</div><div class="ac-sede-a">'+esc((l.direccion||'')+(l.ciudad?', '+l.ciudad:''))+'</div></div>';
      c.addEventListener('click',function(){_locSel=l.id;_date=null;_slot=null;renderStep1();loadDisp();});
      body.appendChild(c);
    });
  } else if(_locs.length===1){
    _locSel=_locs[0].id;
    var si=document.createElement('div');si.className='ac-sede sel';
    si.innerHTML='<div class="ac-sede-ico">📍</div><div><div class="ac-sede-n">'+esc(_locs[0].nombre||'Consultorio')+'</div><div class="ac-sede-a">'+esc((_locs[0].direccion||'')+(_locs[0].ciudad?', '+_locs[0].ciudad:''))+'</div></div>';
    body.appendChild(si);
  }

  // P6.2 -- mensaje de "sede sin horario propio", oculto por defecto. Se
  // reconstruye en cada render de step1 (igual que todo lo demas acá) y lo
  // togglea loadDisp() cuando resuelve la disponibilidad real.
  var sinHorarioMsg=document.createElement('div');
  sinHorarioMsg.id='acSedeSinHorarioMsg';
  sinHorarioMsg.style.cssText='display:none;background:rgba(255,255,255,.04);border:1.5px dashed rgba(255,255,255,.15);border-radius:12px;padding:.75rem 1rem;margin-bottom:.8rem;font-size:.8rem;color:rgba(255,255,255,.55);text-align:center';
  sinHorarioMsg.textContent='Esta sede aún no tiene horarios configurados.';
  body.appendChild(sinHorarioMsg);

  // Day label + scroll
  var dl=document.createElement('div');dl.className='ac-sec';dl.textContent='Elige una fecha';body.appendChild(dl);
  var scroll=document.createElement('div');scroll.id='acDayScroll';body.appendChild(scroll);

  // Slots (initially hidden)
  var sll=document.createElement('div');sll.className='ac-sec';sll.id='acSlotsLbl';sll.style.display='none';sll.textContent='Horarios disponibles';body.appendChild(sll);
  var sg=document.createElement('div');sg.id='acSlotsGrid';sg.style.display='none';body.appendChild(sg);

  renderDays();
}

function renderDays(){
  var scroll=document.getElementById('acDayScroll');
  if(!scroll) return;
  scroll.innerHTML='';
  var today=new Date();today.setHours(0,0,0,0);
  var lastMo=-1;
  for(var i=0;i<60;i++){
    var d=new Date(today);d.setDate(today.getDate()+i);
    var fs=d.toISOString().split('T')[0];
    var mo=d.getMonth();
    if(mo!==lastMo){
      lastMo=mo;
      var sep=document.createElement('div');sep.className='ac-mosep';sep.textContent=MO[mo];scroll.appendChild(sep);
    }
    var avail=!!_disp[fs];
    var card=document.createElement('div');
    card.className='ac-day'+(avail?' av':'')+(fs===_date?' sel':'');
    card.innerHTML='<span class="ac-dn">'+DI[d.getDay()]+'</span><span class="ac-dd">'+d.getDate()+'</span>';
    if(avail)(function(fStr){card.addEventListener('click',function(){selectDate(fStr);});})(fs);
    scroll.appendChild(card);
    if(fs===_date) setTimeout(function(){card.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});},80);
  }
}

function selectDate(fs){
  _date=fs;_slot=null;
  renderDays();
  renderSlots();
  updateStepUI();
}

function renderSlots(){
  var sg=document.getElementById('acSlotsGrid');
  var sl=document.getElementById('acSlotsLbl');
  if(!sg) return;
  sl.style.display='';sg.style.display='';
  var slots=_disp[_date]||[];
  sg.innerHTML='';
  if(!slots.length){
    var e=document.createElement('div');e.className='ac-slots-empty';e.textContent='Sin horarios disponibles este día.';sg.appendChild(e);return;
  }
  slots.forEach(function(t){
    var btn=document.createElement('div');btn.className='ac-slot'+(t===_slot?' sel':'');btn.textContent=t;
    btn.addEventListener('click',function(){
      _slot=t;
      sg.querySelectorAll('.ac-slot').forEach(function(b){b.classList.remove('sel');});
      btn.classList.add('sel');
      updateStepUI();
    });
    sg.appendChild(btn);
  });
}

function loadDisp(){
  if(!_medico||!window._sb) return;
  var today=new Date().toISOString().split('T')[0];
  var en60=new Date();en60.setDate(en60.getDate()+60);
  window._sb.from('citas_disponibilidad').select('fecha,hora')
    .eq('medico_id',_medico.id).gte('fecha',today).lte('fecha',en60.toISOString().split('T')[0]).neq('estado','cancelada')
    .then(function(res){
      cargarDisponibilidadPorSede(_medico,res.data||[],window._sb,_locSel||null)
        .then(function(r){
          _disp=r.disp;
          var m=document.getElementById('acSedeSinHorarioMsg');
          if(m)m.style.display=(r.sedeConfigurada===false)?'block':'none';
          renderDays();
          if(_date) renderSlots();
          updateStepUI();
        });
    });
}

// ─── STEP 2: patient form ────────────────────────────────────────────────────
function renderStep2(){
  var body=document.getElementById('acBody');
  body.innerHTML='<div class="ac-lbl">Tu nombre completo *</div>'
    +'<input class="ac-inp" id="acNombre" type="text" placeholder="Nombre Apellido" autocomplete="name">'
    +'<div class="ac-lbl">WhatsApp / Teléfono *</div>'
    +'<input class="ac-inp" id="acTel" type="tel" placeholder="+1 555 000 0000" autocomplete="tel">'
    +'<div class="ac-lbl">Email (para tu confirmación)</div>'
    +'<input class="ac-inp" id="acEmail" type="email" placeholder="tu@email.com" autocomplete="email">'
    +'<div class="ac-lbl">Motivo de consulta</div>'
    +'<input class="ac-inp" id="acMotivo" type="text" placeholder="¿Qué te trae hoy?">';
  ['acNombre','acTel'].forEach(function(id){
    document.getElementById(id).addEventListener('input',function(){
      var n=(document.getElementById('acNombre')||{}).value||'';
      var t=(document.getElementById('acTel')||{}).value||'';
      document.getElementById('acNext').disabled=!(n.trim()&&t.trim());
    });
  });
  document.getElementById('acNext').disabled=true;
}

// ─── STEP 3: summary ─────────────────────────────────────────────────────────
function renderStep3(){
  var nom=document.getElementById('acNombre').value.trim();
  var tel=document.getElementById('acTel').value.trim();
  var email=document.getElementById('acEmail').value.trim();
  var motivo=document.getElementById('acMotivo').value.trim();
  var dObj=new Date(_date+'T12:00:00');
  var dateLabel=dObj.getDate()+' '+MO[dObj.getMonth()]+' '+dObj.getFullYear();
  var sede=_locs.find(function(l){return String(l.id)===String(_locSel);})||null;
  var doctor=(_medico.titulo||'Dr.')+' '+_medico.nombre+' '+_medico.apellido;
  var body=document.getElementById('acBody');
  body.innerHTML='<div class="ac-sum">'
    +'<div class="ac-sr"><span class="ac-sk">Médico</span><span class="ac-sv">'+esc(doctor)+'</span></div>'
    +(sede?'<div class="ac-sr"><span class="ac-sk">Sede</span><span class="ac-sv">'+esc(sede.nombre||'Consultorio')+'</span></div>':'')
    +'<div class="ac-sr"><span class="ac-sk">Fecha</span><span class="ac-sv">'+esc(dateLabel)+'</span></div>'
    +'<div class="ac-sr"><span class="ac-sk">Hora</span><span class="ac-sv">'+esc(_slot)+'</span></div>'
    +'<div class="ac-sr"><span class="ac-sk">Paciente</span><span class="ac-sv">'+esc(nom)+'</span></div>'
    +(motivo?'<div class="ac-sr"><span class="ac-sk">Motivo</span><span class="ac-sv">'+esc(motivo)+'</span></div>':'')
    +'</div>';
  document.getElementById('acNext')._acData={nom:nom,tel:tel,email:email,motivo:motivo,dateLabel:dateLabel,sede:sede};
}

// ─── CONFIRM ─────────────────────────────────────────────────────────────────
function confirmar(data){
  var btn=document.getElementById('acNext');
  btn.textContent='Confirmando...';btn.disabled=true;
  var sb=window._sb;
  var nom=data.nom,tel=data.tel,email=data.email,motivo=data.motivo;
  buscarOCrearPaciente(sb,nom,email,tel).then(function(pacienteId){
    sb.from('citas_disponibilidad').select('medico_id')
      .eq('medico_id',_medico.id).eq('fecha',_date).eq('hora',_slot)
      .in('estado',['confirmada','pendiente'])
      .then(function(check){
        if(check.data&&check.data.length>0){
          alert('Este horario acaba de ser tomado. Por favor elige otro.');
          _step=1;_slot=null;renderStep();return;
        }
        sb.from('citas').insert({
          medico_id:_medico.id,
          paciente_id:pacienteId||null,
          paciente_nombre:nom,
          paciente_email:email||null,
          paciente_tel:tel,
          motivo:motivo||null,
          fecha:_date,hora:_slot,
          estado:'confirmada',
          location_id:_locSel||null
        }).then(function(res){
          if(res.error){
            if(res.error.message&&res.error.message.indexOf('unique_slot_cita')>-1){
              alert('Ese horario acaba de ser tomado. Elige otro.');
              _step=1;_slot=null;renderStep();
            } else {
              alert('Error al confirmar la cita. Intenta de nuevo.');
              btn.textContent='Confirmar cita';btn.disabled=false;
            }
            return;
          }
          var parts=_date.split('-');
          var fechaLarga=parseInt(parts[2])+' de '+MO_LARGO[parseInt(parts[1])-1]+' '+parts[0];
          var doctor=(_medico.titulo||'Dr.')+' '+_medico.nombre+' '+_medico.apellido;
          var locNombre=data.sede?data.sede.nombre:'Consultorio médico';
          if(email) sendEmail({type:'appointment',to_email:email,doctor_name:doctor,patient_name:nom,appointment_date:fechaLarga,appointment_time:_slot,location_name:locNombre,appointment_mode:'🏥 Presencial',public_profile_url:'https://citadoc.lat/'+(_medico.slug||''),lang:'es'});
          if(_medico.email) sendEmail({type:'appointment',to_email:_medico.email,doctor_name:doctor,patient_name:nom,appointment_date:fechaLarga,appointment_time:_slot,location_name:locNombre,appointment_mode:'📋 Dashboard',public_profile_url:'https://citadoc.lat/citadoc-dashboard.html',lang:'es'});
          renderSuccess(nom,data.dateLabel,email,data.sede);
        });
      });
  });
}

function renderSuccess(nom,dateLabel,email,sede){
  document.getElementById('acFoot').style.display='none';
  var body=document.getElementById('acBody');body.innerHTML='';
  var doctor=(_medico.titulo||'Dr.')+' '+_medico.nombre+' '+_medico.apellido;
  var sedeNote=sede?' — 📍 '+(sede.nombre||''):'';
  var succ=document.createElement('div');succ.id='acSuccess';
  succ.innerHTML='<div class="ac-ok-i">✅</div>'
    +'<div class="ac-ok-t">¡Cita confirmada!</div>'
    +'<div class="ac-ok-m">'+esc(nom)+', tu cita con '+esc(doctor)+' está confirmada para el '+esc(dateLabel)+' a las '+esc(_slot)+'.'+esc(sedeNote)+(email?' Enviamos confirmación a '+esc(email)+'.':'')+'</div>';
  if(_medico.whatsapp){
    var waNum=_medico.whatsapp.replace(/[^0-9]/g,'');
    var waMsg='Hola '+(_medico.titulo||'Dr.')+' '+_medico.nombre+', acabo de confirmar una cita para el '+dateLabel+' a las '+_slot+'. Soy '+nom+'. ¡Gracias!';
    var wa=document.createElement('a');wa.className='ac-wa';wa.href='https://wa.me/'+waNum+'?text='+encodeURIComponent(waMsg);wa.target='_blank';
    wa.innerHTML='💬 Confirmar por WhatsApp';succ.appendChild(wa);
  }
  body.appendChild(succ);
  setTimeout(function(){succ.scrollIntoView({behavior:'smooth',block:'nearest'});},80);
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function goNext(){
  if(_step===1){
    if(!_date||!_slot) return;
    _step=2;renderStep();
  } else if(_step===2){
    var nom=(document.getElementById('acNombre')||{}).value||'';
    var tel=(document.getElementById('acTel')||{}).value||'';
    if(!nom.trim()||!tel.trim()){alert('Nombre y teléfono son requeridos.');return;}
    _step=3;renderStep();
  } else if(_step===3){
    var data=document.getElementById('acNext')._acData;
    if(data) confirmar(data);
  }
}

function goBack(){
  if(_step>1){_step--;renderStep();}
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
function acOpen(medicoData,locsData){
  inject();
  _medico=medicoData;
  _locs=locsData||[];
  _locSel=_locs.length===1?_locs[0].id:null;
  _date=null;_slot=null;_disp={};_step=1;
  document.getElementById('acTitle').textContent='Agendar con '+(_medico.titulo||'Dr.')+' '+_medico.nombre;
  var suc=document.getElementById('acSuccess');if(suc)suc.remove();
  renderStep();
  document.getElementById('acOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  loadDisp();
}

function acClose(){
  var ov=document.getElementById('acOverlay');
  if(ov) ov.classList.remove('open');
  document.body.style.overflow='';
}

window.AgendarCinema={open:acOpen,close:acClose};
})();
