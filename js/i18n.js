// ── I18N ──
var I18N = {
  es: {
    'nav.medicos': 'Para médicos',
    'nav.login': 'Iniciar sesión',
    'nav.register': 'Registro médico',
    'nav.account': 'Mi cuenta',
    'nav.dashboard': '⚡ Mi dashboard',
    'nav.profile': '👁 Ver mi perfil',
    'nav.logout': '↩ Cerrar sesión',
    'hero.eyebrow': 'Médicos disponibles ahora',
    'hero.title1': 'Encuentra tu médico,',
    'hero.title2': 'agenda en minutos',
    'hero.sub': 'Sin llamadas. Sin intermediarios. Elige especialidad, ciudad y reserva tu cita directamente.',
    'triage.btn': 'Ayúdame con CitaDoc AI',
    'triage.label': 'Triage AI',
    'search.specialty': 'Especialidad',
    'search.country': 'País',
    'search.city': 'Ciudad',
    'search.placeholder': 'Ej: Ecuador',
    'search.placeholderCity': 'Ej: Quito',
    'search.all': 'Todas las especialidades',
    'search.button': '🔍 Buscar',
    'quick.general': '🩺 Medicina General',
    'quick.pediatrics': '👶 Pediatría',
    'quick.dermatology': '✨ Dermatología',
    'quick.cardiology': '❤️ Cardiología',
    'quick.gynecology': '🌸 Ginecología',
    'quick.psychiatry': '🧠 Psiquiatría',
    'insurance.title': '¿Qué médicos aceptan',
    'insurance.titleEm': 'tu seguro',
    'insurance.sub': 'Encuentra especialistas compatibles con tu aseguradora',
    'insurance.cta': 'Ver médicos compatibles →',
    'directory.title': 'Médicos en',
    'directory.loading': 'Cargando...',
    'sort.featured': 'Destacados',
    'sort.priceAsc': 'Menor precio',
    'sort.priceDesc': 'Mayor precio',
    'footer.terms': 'Términos',
    'footer.privacy': 'Privacidad',
    'footer.copy': '© 2025 CitaDoc · Hecho con ❤️ para el mundo',
    'login.title': 'Acceso médicos',
    'login.sub': 'Entra a tu panel de CitaDoc',
    'login.email': 'Correo electrónico',
    'login.pass': 'Contraseña',
    'login.button': 'Entrar al dashboard →',
    'login.register': '¿No tienes cuenta? Regístrate gratis',
    'triage.modal.title': '¿Qué especialista necesitas?',
    'triage.modal.sub': 'Cuéntame qué te pasa — la IA te orienta al médico correcto.',
    'triage.modal.placeholder': 'Ej: Tengo dolor de cabeza frecuente, mareos y presión alta…',
    'triage.modal.dictate': 'Toca para dictar',
    'triage.modal.listening': 'Escuchando...',
    'triage.modal.analyze': '✨ Analizar con CitaDoc AI',
    'triage.modal.analyzing': 'Analizando…',
    'triage.modal.new': '↺ Nueva consulta',
    'triage.modal.error': 'Error al conectar con la IA. Intenta de nuevo.',
    'triage.result.recommended': 'Especialidad recomendada',
    'triage.result.listen': '🔊 Escuchar resultado',
    'triage.result.urgency.low': 'Urgencia baja',
    'triage.result.urgency.lowDesc': 'Puedes agendar consulta con calma',
    'triage.result.urgency.medium': 'Urgencia media',
    'triage.result.urgency.mediumDesc': 'Consulta esta semana, no dejes pasar más',
    'triage.result.urgency.high': 'Urgencia alta',
    'triage.result.urgency.highDesc': 'Acude a urgencias hoy para valoración',
    'triage.result.also': 'También podrías consultar:',
    'triage.disclaimer': '⚠️ Este prototipo de análisis no reemplaza una cita médica real. Es un sistema que busca agilizar la atención y brinda recomendaciones basado en evidencia.',
    'lang.es': 'Español',
    'lang.en': 'English',
    'lang.pt': 'Português'
  },
  en: {
    'nav.medicos': 'For doctors',
    'nav.login': 'Sign in',
    'nav.register': 'Doctor registration',
    'nav.account': 'My account',
    'nav.dashboard': '⚡ My dashboard',
    'nav.profile': '👁 View profile',
    'nav.logout': '↩ Sign out',
    'hero.eyebrow': 'Doctors available now',
    'hero.title1': 'Find your doctor,',
    'hero.title2': 'book in minutes',
    'hero.sub': 'No calls. No intermediaries. Choose specialty, city and book your appointment directly.',
    'triage.btn': 'Help me with CitaDoc AI',
    'triage.label': 'AI Triage',
    'search.specialty': 'Specialty',
    'search.country': 'Country',
    'search.city': 'City',
    'search.placeholder': 'Ex: United States',
    'search.placeholderCity': 'Ex: New York',
    'search.all': 'All specialties',
    'search.button': '🔍 Search',
    'quick.general': '🩺 General Medicine',
    'quick.pediatrics': '👶 Pediatrics',
    'quick.dermatology': '✨ Dermatology',
    'quick.cardiology': '❤️ Cardiology',
    'quick.gynecology': '🌸 Gynecology',
    'quick.psychiatry': '🧠 Psychiatry',
    'insurance.title': 'Which doctors accept',
    'insurance.titleEm': 'your insurance',
    'insurance.sub': 'Find specialists compatible with your insurer',
    'insurance.cta': 'View compatible doctors →',
    'directory.title': 'Doctors in',
    'directory.loading': 'Loading...',
    'sort.featured': 'Featured',
    'sort.priceAsc': 'Lowest price',
    'sort.priceDesc': 'Highest price',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy',
    'footer.copy': '© 2025 CitaDoc · Made with ❤️ for the world',
    'login.title': 'Doctor access',
    'login.sub': 'Enter your CitaDoc panel',
    'login.email': 'Email',
    'login.pass': 'Password',
    'login.button': 'Enter dashboard →',
    'login.register': "Don't have an account? Register free",
    'triage.modal.title': 'Which specialist do you need?',
    'triage.modal.sub': 'Tell me what\'s wrong — AI will guide you to the right doctor.',
    'triage.modal.placeholder': 'Ex: I have frequent headaches, dizziness and high blood pressure…',
    'triage.modal.dictate': 'Tap to dictate',
    'triage.modal.listening': 'Listening...',
    'triage.modal.analyze': '✨ Analyze with CitaDoc AI',
    'triage.modal.analyzing': 'Analyzing…',
    'triage.modal.new': '↺ New consultation',
    'triage.modal.error': 'Error connecting to AI. Please try again.',
    'triage.result.recommended': 'Recommended specialty',
    'triage.result.listen': '🔊 Listen to result',
    'triage.result.urgency.low': 'Low urgency',
    'triage.result.urgency.lowDesc': 'You can book a consultation calmly',
    'triage.result.urgency.medium': 'Medium urgency',
    'triage.result.urgency.mediumDesc': 'Consult this week, do not delay further',
    'triage.result.urgency.high': 'High urgency',
    'triage.result.urgency.highDesc': 'Go to emergency care today for evaluation',
    'triage.result.also': 'You could also consult:',
    'triage.disclaimer': '⚠️ This analysis prototype does not replace a real medical appointment. It is a system designed to streamline care and provides evidence-based recommendations.',
    'lang.es': 'Español',
    'lang.en': 'English',
    'lang.pt': 'Português'
  },
  pt: {
    'nav.medicos': 'Para médicos',
    'nav.login': 'Entrar',
    'nav.register': 'Cadastro médico',
    'nav.account': 'Minha conta',
    'nav.dashboard': '⚡ Meu dashboard',
    'nav.profile': '👁 Ver perfil',
    'nav.logout': '↩ Sair',
    'hero.eyebrow': 'Médicos disponíveis agora',
    'hero.title1': 'Encontre seu médico,',
    'hero.title2': 'agende em minutos',
    'hero.sub': 'Sem ligações. Sem intermediários. Escolha especialidade, cidade e reserve sua consulta diretamente.',
    'triage.btn': 'Me ajude com CitaDoc AI',
    'triage.label': 'Triage AI',
    'search.specialty': 'Especialidade',
    'search.country': 'País',
    'search.city': 'Cidade',
    'search.placeholder': 'Ex: Brasil',
    'search.placeholderCity': 'Ex: São Paulo',
    'search.all': 'Todas as especialidades',
    'search.button': '🔍 Buscar',
    'quick.general': '🩺 Medicina Geral',
    'quick.pediatrics': '👶 Pediatria',
    'quick.dermatology': '✨ Dermatologia',
    'quick.cardiology': '❤️ Cardiologia',
    'quick.gynecology': '🌸 Ginecologia',
    'quick.psychiatry': '🧠 Psiquiatria',
    'insurance.title': 'Quais médicos aceitam',
    'insurance.titleEm': 'seu plano',
    'insurance.sub': 'Encontre especialistas compatíveis com sua seguradora',
    'insurance.cta': 'Ver médicos compatíveis →',
    'directory.title': 'Médicos em',
    'directory.loading': 'Carregando...',
    'sort.featured': 'Destaques',
    'sort.priceAsc': 'Menor preço',
    'sort.priceDesc': 'Maior preço',
    'footer.terms': 'Termos',
    'footer.privacy': 'Privacidade',
    'footer.copy': '© 2025 CitaDoc · Feito com ❤️ para o mundo',
    'login.title': 'Acesso médicos',
    'login.sub': 'Entre no seu painel CitaDoc',
    'login.email': 'E-mail',
    'login.pass': 'Senha',
    'login.button': 'Entrar no dashboard →',
    'login.register': 'Não tem conta? Cadastre-se grátis',
    'triage.modal.title': 'Qual especialista você precisa?',
    'triage.modal.sub': 'Conte o que está sentindo — a IA vai te orientar ao médico correto.',
    'triage.modal.placeholder': 'Ex: Tenho dor de cabeça frequente, tontura e pressão alta…',
    'triage.modal.dictate': 'Toque para ditar',
    'triage.modal.listening': 'Ouvindo...',
    'triage.modal.analyze': '✨ Analisar com CitaDoc AI',
    'triage.modal.analyzing': 'Analisando…',
    'triage.modal.new': '↺ Nova consulta',
    'triage.modal.error': 'Erro ao conectar com a IA. Tente novamente.',
    'triage.result.recommended': 'Especialidade recomendada',
    'triage.result.listen': '🔊 Ouvir resultado',
    'triage.result.urgency.low': 'Urgência baixa',
    'triage.result.urgency.lowDesc': 'Você pode agendar uma consulta com calma',
    'triage.result.urgency.medium': 'Urgência média',
    'triage.result.urgency.mediumDesc': 'Consulte esta semana, não deixe passar mais',
    'triage.result.urgency.high': 'Urgência alta',
    'triage.result.urgency.highDesc': 'Vá para emergências hoje para avaliação',
    'triage.result.also': 'Você também poderia consultar:',
    'triage.disclaimer': '⚠️ Este protótipo de análise não substitui uma consulta médica real. É um sistema que busca agilizar o atendimento e fornece recomendações baseadas em evidências.',
    'lang.es': 'Español',
    'lang.en': 'English',
    'lang.pt': 'Português'
  }
};

var _currentLang = localStorage.getItem('citadoc-lang') || 'es';

function t(key) {
  var dict = I18N[_currentLang] || I18N.es;
  return dict[key] || I18N.es[key] || key;
}

function setLang(lang) {
  _currentLang = lang;
  localStorage.setItem('citadoc-lang', lang);
  applyI18N();
  // Update lang selector active state
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function applyI18N() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  applyI18N();
});
