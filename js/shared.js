// ── HELPERS ──
function el(id) { return document.getElementById(id); }
function setText(id, v) { var e = el(id); if (e) e.textContent = v; }
function pad2(n) { return String(n).padStart(2, '0'); }
function toSlug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
}

// ── DATOS ESTÁTICOS ──
var CODIGOS_PAIS_WA = {
  ecuador:'593', colombia:'57', peru:'51', argentina:'54',
  chile:'56', venezuela:'58', bolivia:'591', paraguay:'595',
  uruguay:'598', brasil:'55', guyana:'592', suriname:'597',
  mexico:'52'
};
var PAISES = [
  {v:'ecuador',l:'Ecuador'},{v:'colombia',l:'Colombia'},{v:'peru',l:'Peru'},
  {v:'argentina',l:'Argentina'},{v:'chile',l:'Chile'},{v:'venezuela',l:'Venezuela'},
  {v:'bolivia',l:'Bolivia'},{v:'paraguay',l:'Paraguay'},{v:'uruguay',l:'Uruguay'},
  {v:'brasil',l:'Brasil'},{v:'guyana',l:'Guyana'},{v:'suriname',l:'Surinam'}
];
var CIUDADES = {
  ecuador:   ['Quito','Guayaquil','Cuenca','Manta','Ambato','Portoviejo','Machala','Santo Domingo','Ibarra','Riobamba','Loja','Esmeraldas'],
  colombia:  ['Bogota','Medellin','Cali','Barranquilla','Cartagena','Bucaramanga','Cucuta','Pereira','Manizales'],
  peru:      ['Lima','Arequipa','Trujillo','Chiclayo','Cusco','Iquitos','Piura','Huancayo'],
  argentina: ['Buenos Aires','Cordoba','Rosario','Mendoza','Tucuman','La Plata','Mar del Plata','Salta'],
  chile:     ['Santiago','Valparaiso','Concepcion','Antofagasta','Temuco','Rancagua'],
  venezuela: ['Caracas','Maracaibo','Valencia','Barquisimeto','Maracay'],
  bolivia:   ['Santa Cruz','La Paz','Cochabamba','Sucre','Oruro'],
  paraguay:  ['Asuncion','Ciudad del Este','San Lorenzo'],
  uruguay:   ['Montevideo','Salto','Paysandu'],
  brasil:    ['Sao Paulo','Rio de Janeiro','Brasilia','Salvador','Fortaleza','Belo Horizonte','Manaus','Curitiba'],
  guyana:    ['Georgetown'],
  suriname:  ['Paramaribo']
};
var MESES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var DIAS_SEM = ['dom','lun','mar','mie','jue','vie','sab'];
var PAISES_LABEL = {
  ecuador:'Ecuador', colombia:'Colombia', peru:'Peru', argentina:'Argentina',
  chile:'Chile', venezuela:'Venezuela', bolivia:'Bolivia', paraguay:'Paraguay',
  uruguay:'Uruguay', brasil:'Brasil', guyana:'Guyana', suriname:'Surinam'
};
var BG = ['#d4f0ec','#e0fff4','#e8eaff','#ffe8e8','#f0ffe8','#e8f0ff'];

// ── WHATSAPP ──
function limpiarNumeroWA(numero, pais) {
  if (!numero) return null;
  var n = numero.replace(/[^0-9]/g, '');
  if (n.charAt(0) === '0') n = n.slice(1);
  var codigo = CODIGOS_PAIS_WA[(pais || 'ecuador').toLowerCase()] || '593';
  if (n.startsWith(codigo)) return n;
  return codigo + n;
}
function urlWA(numero, pais, nombre) {
  var num = limpiarNumeroWA(numero, pais);
  if (!num) return null;
  var msg = 'Hola ' + nombre + ', vi su perfil en CitaDoc y quisiera agendar una cita. Gracias.';
  return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
}

// ── DISPONIBILIDAD CON BLOQUEOS ──
function cargarDisponibilidadConBloqueos(medico, citas, sbClient) {
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var en60 = new Date(hoy); en60.setDate(hoy.getDate() + 60);
  var fechaHoy = hoy.toISOString().split('T')[0];
  var fecha60  = en60.toISOString().split('T')[0];

  return Promise.all([
    sbClient.from('bloqueos_medico')
      .select('fecha_inicio, fecha_fin')
      .eq('medico_id', medico.id)
      .gte('fecha_fin', fechaHoy)
      .lte('fecha_inicio', fecha60),
    sbClient.from('excepciones_medico')
      .select('fecha, tipo, desde, hasta')
      .eq('medico_id', medico.id)
      .gte('fecha', fechaHoy)
      .lte('fecha', fecha60)
  ]).then(function(results) {
    var bloqueos    = results[0].data || [];
    var excepciones = results[1].data || [];

    var fechasBloqueadas = {};
    bloqueos.forEach(function(b) {
      var cur = new Date(b.fecha_inicio + 'T12:00:00');
      var fin = new Date(b.fecha_fin + 'T12:00:00');
      while (cur <= fin) {
        fechasBloqueadas[cur.toISOString().split('T')[0]] = true;
        cur.setDate(cur.getDate() + 1);
      }
    });

    var excMap = {};
    excepciones.forEach(function(e) { excMap[e.fecha] = e; });

    var DIAS_KEY = ['dom','lun','mar','mie','jue','vie','sab'];
    var disp = {};

    for (var i = 0; i < 60; i++) {
      var fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      var fechaStr = fecha.toISOString().split('T')[0];

      if (fechasBloqueadas[fechaStr]) continue;

      if (excMap[fechaStr]) {
        var exc = excMap[fechaStr];
        if (exc.tipo === 'bloqueado') continue;
        if (exc.tipo === 'custom' && exc.desde && exc.hasta) {
          var slots = [];
          var min = parseInt(exc.desde.split(':')[0]) * 60 + parseInt(exc.desde.split(':')[1]);
          var max = parseInt(exc.hasta.split(':')[0]) * 60 + parseInt(exc.hasta.split(':')[1]);
          var limHoy2 = (i === 0) ? (new Date().getHours() * 60 + new Date().getMinutes() + 120) : 0;
          while (min < max) {
            var horaStr = String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
            var ocupado2 = citas.some(function(ct) { return ct.fecha === fechaStr && ct.hora === horaStr; });
            if (!ocupado2 && !(i === 0 && min < limHoy2)) slots.push(horaStr);
            min += 30;
          }
          if (slots.length) disp[fechaStr] = slots;
          continue;
        }
      }

      var diaKey = DIAS_KEY[new Date(fechaStr + 'T12:00:00').getDay()];
      var cfgDia = medico.horarios_config && medico.horarios_config[diaKey];
      var bloques = cfgDia && cfgDia.activo && cfgDia.bloques
        ? cfgDia.bloques
        : ((medico.dias_atencion || []).indexOf(diaKey) > -1)
          ? [{desde: medico.horario_desde || '09:00', hasta: medico.horario_hasta || '17:00'}]
          : [];
      if (!bloques.length) continue;

      var limHoy3 = (i === 0) ? (new Date().getHours() * 60 + new Date().getMinutes() + 120) : 0;
      var slotsNorm = [];
      bloques.forEach(function(b) {
        var min2 = parseInt(b.desde.split(':')[0]) * 60 + parseInt(b.desde.split(':')[1]);
        var hH2  = parseInt(b.hasta.split(':')[0]) * 60 + parseInt(b.hasta.split(':')[1]);
        while (min2 < hH2) {
          var hora = String(Math.floor(min2 / 60)).padStart(2, '0') + ':' + String(min2 % 60).padStart(2, '0');
          var ocup = citas.some(function(ct) { return ct.fecha === fechaStr && ct.hora === hora; });
          if (!ocup && !(i === 0 && min2 < limHoy3)) slotsNorm.push(hora);
          min2 += 30;
        }
      });
      if (slotsNorm.length) disp[fechaStr] = slotsNorm;
    }
    return disp;
  });
}

// ── DISPONIBILIDAD POR SEDE (lee doctor_schedule_blocks) ──
function cargarDisponibilidadPorSede(medico, citas, sbClient, locationId) {
  // Si hay locationId, filtrar horarios_config por esa sede y reutilizar cargarDisponibilidadConBloqueos
  if (locationId != null) {
    var hc = medico.horarios_config || {};
    var hcFiltrado = {};
    Object.keys(hc).forEach(function(diaKey) {
      var dia = hc[diaKey];
      if (!dia || !dia.activo || !dia.bloques) return;
      var bloquesSede = dia.bloques.filter(function(b) {
        return String(b.location_id || '') === String(locationId);
      });
      if (bloquesSede.length) {
        hcFiltrado[diaKey] = Object.assign({}, dia, {bloques: bloquesSede});
      }
    });
    var medicoFiltrado = Object.assign({}, medico, {horarios_config: hcFiltrado});
    return cargarDisponibilidadConBloqueos(medicoFiltrado, citas, sbClient);
  }

  // Sin sede seleccionada → disponibilidad global
  return cargarDisponibilidadConBloqueos(medico, citas, sbClient);
}


// ── DISPONIBILIDAD BÁSICA (fallback sin bloqueos) ──
function generarDisponibilidad(medico, citas) {
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var disp = {};
  for (var i = 0; i < 60; i++) {
    var fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    var fechaStr = fecha.toISOString().split('T')[0];
    var dia = DIAS_SEM[fecha.getDay()];
    if ((medico.dias_atencion || []).indexOf(dia) < 0) continue;
    disp[fechaStr] = [];
    var desde = medico.horario_desde || '09:00';
    var hasta  = medico.horario_hasta || '17:00';
    var hD = parseInt(desde.split(':')[0]) * 60 + parseInt(desde.split(':')[1]);
    var hH = parseInt(hasta.split(':')[0]) * 60 + parseInt(hasta.split(':')[1]);
    var min = hD;
    var limHoy = 0;
    if (i === 0) { var n = new Date(); limHoy = n.getHours() * 60 + n.getMinutes() + 120; }
    while (min < hH) {
      var horaStr = pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
      var ocupado = citas.some(function(ct) { return ct.fecha === fechaStr && ct.hora === horaStr; });
      if (!ocupado && !(i === 0 && min < limHoy)) disp[fechaStr].push(horaStr);
      min += 30;
    }
    if (!disp[fechaStr].length) delete disp[fechaStr];
  }
  return disp;
}
