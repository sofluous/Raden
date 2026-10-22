/* Raden status and debug controller (M1 Batch 4 extraction)
 * Exposed via window.RadenCoreStatus with createStatusController.
 */
(function registerRadenCoreStatus(global) {
  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function scopeDebugValues(config, context) {
    const values = config && typeof config === "object" ? config : {};
    const scope = context && typeof context === "object" ? context : {};
    const activeControlIds = new Set(scope.activeControlIds || []);
    const knownModeControlIds = new Set(scope.knownModeControlIds || []);
    const knownEffectControlIds = new Set(scope.knownEffectControlIds || []);
    const scoped = {};
    Object.entries(values).forEach(([key, value]) => {
      if (knownEffectControlIds.has(key)) return;
      if (knownModeControlIds.has(key) && !activeControlIds.has(key)) return;
      scoped[key] = value;
    });
    if (scope.modeId) scoped.texture = scope.modeId;
    (scope.effects || []).forEach((effect, index) => {
      if (!effect || effect.enabled === false) return;
      const prefix = `effect.${index + 1}.${effect.effectId || "unknown"}`;
      scoped[`${prefix}.enabled`] = true;
      Object.entries(effect.config || {}).forEach(([key, value]) => {
        scoped[`${prefix}.${key}`] = value;
      });
    });
    return scoped;
  }

  function formatDebugValue(value) {
    if (value && typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (_error) {
        return String(value);
      }
    }
    return String(value);
  }

  function createStatusController(opts) {
    const options = opts || {};
    const statusEl = options.statusEl || null;
    const progressEl = options.progressEl || null;
    const debugPanelEl = options.debugPanelEl || null;
    const debugToggleEl = options.debugToggleEl || null;
    let debugVisible = !!options.debugVisible;

    function setStatus(state, message) {
      if (!statusEl) return;
      statusEl.dataset.state = state;
      statusEl.textContent = message;
    }

    function setProgressPercent(percent) {
      if (!progressEl) return;
      const clamped = Math.max(0, Math.min(100, toNumber(percent, 0)));
      progressEl.style.width = `${clamped}%`;
      progressEl.setAttribute("aria-valuenow", String(Math.round(clamped)));
    }

    function showDebugInfo(config, extras) {
      if (!debugPanelEl) return;
      if (!debugVisible) {
        debugPanelEl.style.display = "none";
        return;
      }
      const configValues = config && typeof config === "object" ? config : {};
      const extraValues = extras && typeof extras === "object" ? extras : {};
      const lines = ["Debug Info"];
      Object.entries(configValues).forEach(([key, val]) => lines.push(`${key}: ${formatDebugValue(val)}`));
      Object.entries(extraValues).forEach(([key, val]) => lines.push(`${key}: ${formatDebugValue(val)}`));
      debugPanelEl.innerText = lines.join("\n");
      debugPanelEl.style.display = "block";
    }

    function toggleDebugPanel(forceState) {
      if (typeof forceState === "boolean") {
        debugVisible = forceState;
      } else {
        debugVisible = !debugVisible;
      }
      if (debugPanelEl) {
        debugPanelEl.style.display = "none";
      }
      if (debugToggleEl) {
        debugToggleEl.checked = debugVisible;
      }
      return debugVisible;
    }

    function isDebugVisible() {
      return debugVisible;
    }

    return {
      setStatus,
      setProgressPercent,
      showDebugInfo,
      toggleDebugPanel,
      isDebugVisible,
    };
  }

  global.RadenCoreStatus = Object.assign({}, global.RadenCoreStatus || {}, {
    createStatusController,
    scopeDebugValues,
  });
})(window);
