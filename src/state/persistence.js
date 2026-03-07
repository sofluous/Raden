/* Raden persistence adapters (M1 Batch 3 extraction)
 * Exposed via window.RadenPersistence to preserve existing call sites.
 */
(function registerRadenPersistence(global) {
  function safeGet(storageKey) {
    try {
      return localStorage.getItem(storageKey);
    } catch (err) {
      console.warn("Unable to read storage key", storageKey, err);
      return null;
    }
  }

  function safeSet(storageKey, value) {
    try {
      localStorage.setItem(storageKey, value);
      return true;
    } catch (err) {
      console.warn("Unable to write storage key", storageKey, err);
      return false;
    }
  }

  function getPerformanceProfileKey(opts) {
    const options = opts || {};
    const profiles = options.profiles || {};
    const selected = options.selected;
    const storageKey = options.storageKey;
    const saved = storageKey ? safeGet(storageKey) : null;
    const key = selected || saved || "balanced";
    return Object.prototype.hasOwnProperty.call(profiles, key)
      ? key
      : "balanced";
  }

  function savePerformanceProfile(opts) {
    const options = opts || {};
    const profiles = options.profiles || {};
    const requested = options.key;
    const storageKey = options.storageKey;
    if (!storageKey) return false;
    const normalized = Object.prototype.hasOwnProperty.call(profiles, requested)
      ? requested
      : "balanced";
    return safeSet(storageKey, normalized);
  }

  function saveLocks(opts) {
    const options = opts || {};
    if (!options.storageKey) return false;
    return safeSet(
      options.storageKey,
      JSON.stringify(Array.from(options.lockedControlIds || [])),
    );
  }

  function loadLocks(opts) {
    const options = opts || {};
    const raw = options.storageKey ? safeGet(options.storageKey) : null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Invalid lock payload", err);
      return [];
    }
  }

  function saveGallery(opts) {
    const options = opts || {};
    if (!options.storageKey) return false;
    return safeSet(options.storageKey, JSON.stringify(options.items || []));
  }

  function loadGallery(opts) {
    const options = opts || {};
    const raw = options.storageKey ? safeGet(options.storageKey) : null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Invalid gallery payload", err);
      return [];
    }
  }

  function getTheme(opts) {
    const options = opts || {};
    const raw = options.storageKey ? safeGet(options.storageKey) : null;
    return raw || options.fallback || "steel-night";
  }

  function setTheme(opts) {
    const options = opts || {};
    if (!options.storageKey) return false;
    return safeSet(options.storageKey, options.theme || "steel-night");
  }

  global.RadenPersistence = Object.assign({}, global.RadenPersistence || {}, {
    getPerformanceProfileKey,
    savePerformanceProfile,
    saveLocks,
    loadLocks,
    saveGallery,
    loadGallery,
    getTheme,
    setTheme,
  });
})(window);
