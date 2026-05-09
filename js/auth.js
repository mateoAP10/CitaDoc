// ── AUTH COMPARTIDO ──
// Consulta la sesión activa y llama onLoggedIn(medico) o onLoggedOut().
// Cada página provee sus propios callbacks ya que los IDs del navbar difieren.
function initAuth(sbClient, onLoggedIn, onLoggedOut) {
  sbClient.auth.getSession().then(function(res) {
    var session = res.data && res.data.session;
    if (!session) { if (onLoggedOut) onLoggedOut(); return; }
    sbClient.from('medicos')
      .select('nombre,apellido,titulo,slug,plan')
      .eq('user_id', session.user.id)
      .single()
      .then(function(r) {
        if (r.data) { if (onLoggedIn) onLoggedIn(r.data); }
        else { if (onLoggedOut) onLoggedOut(); }
      });
  });
}
