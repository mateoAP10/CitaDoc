/**
 * CitaDoc Bootstrap — init.js
 *
 * Orchestration only. No business logic.
 * Responsibilities:
 *   1. Define startup order
 *   2. Wire events between modules
 *   3. Log every step
 *
 * DO NOT add business logic here.
 * Business logic lives in its own module.
 */

(function () {
  'use strict';

  // ── Step 1: Observability first — if wiring breaks, we want logs immediately
  function initObservability() {
    if (typeof window.logEvent !== 'function') {
      // observability.js not loaded yet — noop stubs so nothing breaks
      window.logEvent = function () {};
      window.logError = function (e) { console.error('[CitaDoc]', e); };
      window.logWarn  = function (w) { console.warn('[CitaDoc]', w); };
    }
    window.logEvent('bootstrap_start', { ts: Date.now() });
  }

  // ── Step 2: i18n — apply stored language before content renders
  function initI18n() {
    var stored = localStorage.getItem('citadoc-lang');
    if (stored && typeof window.setLang === 'function') {
      window.setLang(stored);
      window.logEvent('i18n_init', { lang: stored });
    }
  }

  // ── Step 3: Feature flags — passive, no side effects
  function initFeatureFlags() {
    if (typeof window.isEnabled !== 'function') return;
    window.logEvent('flags_ready');
  }

  // ── Step 4: Region — auto-inits via region.js polling for ssPais
  // We only wire the event here; region.js handles detection internally.
  function initRegion() {
    window.addEventListener('region-applied', function (e) {
      var region = e.detail || {};
      window.logEvent('region_applied', { country: region.country, source: region.source });

      // Store detected country globally
      if (region.country) window._regionPais = region.country;

      // Update directory title immediately — don't wait for search
      var dirCiudad = document.getElementById('dirCiudad');
      if (dirCiudad && region.country) {
        var label = (window.PAISES_LABEL && window.PAISES_LABEL[region.country]) || region.country;
        if (region.city) label = region.city;
        dirCiudad.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      }

      // Language auto-set from region (only if user hasn't manually chosen)
      if (region.language && !localStorage.getItem('citadoc-lang-manual')) {
        if (typeof window.setLang === 'function') {
          window.setLang(region.language);
        }
      }

      // Update insurance section for detected country
      if (region.country && typeof window.renderSeguros === 'function') {
        window.renderSeguros(region.country);
      }

      // Fetch local currency exchange rate
      if (region.country && typeof window.fetchExchangeRate === 'function') {
        window.fetchExchangeRate(region.country);
      }

      // Load doctors silently (not rendered until user searches)
      if (typeof window.cargarMedicos === 'function') {
        window.logEvent('directory_reload', { trigger: 'region-applied' });
        window.cargarMedicos();
      }
    });

    window.logEvent('region_wired');
  }

  // ── Step 5: Auth — fires auth-ready when session resolves
  function initAuth() {
    window.addEventListener('auth-ready', function (e) {
      var user = e.detail || {};
      window.logEvent('auth_ready', { uid: user.id || 'anon' });
    });
    // Auth module handles its own initialization; we just observe.
    window.logEvent('auth_wired');
  }

  // ── Step 6: Language-changed event — re-render directory on language switch
  function initLangEvents() {
    window.addEventListener('language-changed', function (e) {
      var lang = e.detail && e.detail.lang;
      window.logEvent('language_changed', { lang: lang });
      if (typeof window.renderDir === 'function') window.renderDir();
    });
  }

  // ── Step 7: search-failed safety net — surface errors without crashing
  function initSearchEvents() {
    window.addEventListener('search-failed', function (e) {
      var err = e.detail || {};
      window.logError('search_failed: ' + (err.message || 'unknown'), { detail: err });
    });
  }

  // ── Main startup sequence
  function boot() {
    initObservability();
    initI18n();
    initFeatureFlags();
    initRegion();
    initAuth();
    initLangEvents();
    initSearchEvents();

    window.logEvent('bootstrap_complete', {
      modules: ['observability', 'i18n', 'feature-flags', 'region', 'auth'],
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
