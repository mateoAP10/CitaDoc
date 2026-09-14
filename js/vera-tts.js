// P8.2.4 -- modulo de voz de Vera, COMPLETAMENTE AISLADO. No lo importa
// citadoc-dashboard.html ni ningun otro modulo todavia -- se prueba solo,
// con vera-tts-test.html, antes de decidir como (y si) se conecta al
// flujo real del Assistant.
//
// Reglas duras, adentro del modulo (no dependen de que quien lo use se
// acuerde de respetarlas):
// - Nunca usa una voz remota. localService debe ser exactamente true.
// - Nunca selecciona getVoices()[0] ni la voz "default" del navegador --
//   la seleccion siempre es explicita, via pickVoice().
// - speak() sin una voz ya elegida devuelve un error real, nunca habla
//   con lo que haya.
// - cancel() corta YA (speechSynthesis.cancel()), sin esperar a que la
//   frase termine sola.
// - warmUp() usa utterances con volumen casi cero -- audio inaudible,
//   pero real (dispara los mismos eventos que un speak() de verdad, que
//   es lo que hace falta para calentar el motor).
// Sin dependencias externas -- Web Speech API nativa, nada mas.

var VeraTTS = (function () {
  var selectedVoice = null;
  var state = 'idle'; // 'idle' | 'speaking'
  var stateListeners = [];

  function setState(next) {
    if (state === next) return;
    state = next;
    stateListeners.forEach(function (fn) {
      try { fn(state); } catch (e) { /* un listener roto no debe tumbar el modulo */ }
    });
  }

  function getAvailableVoices() {
    if (!window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }

  // matcher: string (coincidencia parcial, sin distinguir mayusculas, contra
  // voice.name) o funcion(voice) -> boolean. Nunca cae a getVoices()[0] ni a
  // la voz default si no encuentra match -- devuelve false y selectedVoice
  // queda como estaba (null si nunca se eligio ninguna).
  function pickVoice(matcher) {
    var voices = getAvailableVoices();
    var test;
    if (typeof matcher === 'function') {
      test = matcher;
    } else {
      var needle = String(matcher || '').toLowerCase();
      test = function (v) { return v.name.toLowerCase().indexOf(needle) !== -1; };
    }
    var found = null;
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].localService && test(voices[i])) { found = voices[i]; break; }
    }
    if (!found) return false;
    selectedVoice = found;
    return true;
  }

  function getSelectedVoice() {
    return selectedVoice;
  }

  function _requireVoice() {
    if (!selectedVoice) {
      return { ok: false, reason: 'no_voice_selected', message: 'VeraTTS.speak()/warmUp() llamado sin una voz elegida -- llama pickVoice() primero. Nunca se usa una voz por defecto.' };
    }
    if (!selectedVoice.localService) {
      // defensivo: si algo externo pudo haber mutado el objeto de voz (no
      // deberia poder pasar, pero nunca se confia en que no pase).
      return { ok: false, reason: 'voice_not_local', message: 'La voz seleccionada ya no es local -- VeraTTS nunca habla con una voz remota.' };
    }
    return { ok: true };
  }

  // n utterances de warm-up, secuenciales (una despues de que la anterior
  // termina), con volumen casi inaudible. Devuelve una Promise que resuelve
  // con { ok:true, runs:[...] } o { ok:false, reason, message } si no hay
  // voz elegida -- nunca lanza una excepcion sin control.
  function warmUp(n) {
    n = n || 3;
    var guard = _requireVoice();
    if (!guard.ok) return Promise.resolve(guard);

    var runs = [];
    var chain = Promise.resolve();
    for (var i = 0; i < n; i++) {
      chain = chain.then(function () {
        return new Promise(function (resolve) {
          var u = new SpeechSynthesisUtterance('.');
          u.voice = selectedVoice;
          u.volume = 0.01;
          var t0 = performance.now();
          var started = null;
          u.onstart = function () { started = performance.now(); };
          u.onend = function () {
            runs.push({ latency_ms: started ? Math.round(started - t0) : null, total_ms: Math.round(performance.now() - t0) });
            resolve();
          };
          u.onerror = function () {
            runs.push({ latency_ms: null, total_ms: Math.round(performance.now() - t0), error: true });
            resolve();
          };
          window.speechSynthesis.speak(u);
        });
      });
    }
    return chain.then(function () { return { ok: true, runs: runs }; });
  }

  // Habla texto real. Devuelve una Promise que resuelve { ok:true } al
  // terminar normal, o { ok:false, reason:'cancelled' } si se corto con
  // cancel() a mitad -- nunca rechaza la promise por una cancelacion
  // deliberada, eso no es un error del sistema.
  function speak(text) {
    var guard = _requireVoice();
    if (!guard.ok) return Promise.resolve(guard);

    return new Promise(function (resolve) {
      var u = new SpeechSynthesisUtterance(String(text || ''));
      u.voice = selectedVoice;
      var t0 = performance.now();
      var started = null;
      u.onstart = function () { started = performance.now(); setState('speaking'); };
      u.onend = function () {
        setState('idle');
        resolve({ ok: true, latency_ms: started ? Math.round(started - t0) : null, duration_ms: started ? Math.round(performance.now() - started) : null });
      };
      u.onerror = function (e) {
        setState('idle');
        if (e.error === 'interrupted' || e.error === 'canceled') {
          resolve({ ok: false, reason: 'cancelled' });
        } else {
          resolve({ ok: false, reason: 'error', message: e.error });
        }
      };
      window.speechSynthesis.speak(u);
    });
  }

  // Interrumpe YA. No espera a que la frase termine, no espera confirmacion
  // del navegador -- llama cancel() de inmediato. El propio onerror de la
  // utterance en curso se encarga de resolver su promise como 'cancelled'.
  function cancel() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setState('idle');
  }

  function isSpeaking() {
    return state === 'speaking';
  }

  function onStateChange(fn) {
    if (typeof fn === 'function') stateListeners.push(fn);
  }

  return {
    pickVoice: pickVoice,
    getSelectedVoice: getSelectedVoice,
    getAvailableVoices: getAvailableVoices,
    warmUp: warmUp,
    speak: speak,
    cancel: cancel,
    isSpeaking: isSpeaking,
    onStateChange: onStateChange
  };
})();
