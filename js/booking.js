// ── PACIENTES ──
// Funciones de lookup/creación de pacientes compartidas entre index y perfil.
// Siempre reciben sbClient como primer argumento para evitar dependencia global.

function buscarOCrearPaciente(sbClient, nombre, email, telefono) {
  return new Promise(function(resolve) {
    if (email) {
      sbClient.from('pacientes').select('id').eq('email', email).single()
        .then(function(r) {
          if (r.data) {
            sbClient.from('pacientes').update({nombre: nombre, telefono: telefono || null}).eq('id', r.data.id);
            resolve(r.data.id);
          } else {
            crearPaciente(sbClient, nombre, email, telefono).then(resolve);
          }
        });
    } else if (telefono) {
      sbClient.from('pacientes').select('id').eq('telefono', telefono).single()
        .then(function(r) {
          if (r.data) {
            resolve(r.data.id);
          } else {
            crearPaciente(sbClient, nombre, null, telefono).then(resolve);
          }
        });
    } else {
      crearPaciente(sbClient, nombre, null, null).then(resolve);
    }
  });
}

function crearPaciente(sbClient, nombre, email, telefono) {
  return sbClient.from('pacientes').insert({
    nombre:   nombre,
    email:    email || null,
    telefono: telefono || null
  }).select('id').single()
    .then(function(r) {
      return r.data ? r.data.id : null;
    });
}
