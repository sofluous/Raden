/* Raden status and debug controller (M1 Batch 4 extraction)
 * Exposed via window.RadenCoreStatus with createStatusController.
 */
(function registerRadenCoreStatus(global) {
  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
      Object.entries(configValues).forEach(([key, val]) => lines.push(`${key}: ${val}`));
      Object.entries(extraValues).forEach(([key, val]) => lines.push(`${key}: ${val}`));
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
        debugPanelEl.style.display = debugVisible ? "block" : "none";
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
  });
})(window);
